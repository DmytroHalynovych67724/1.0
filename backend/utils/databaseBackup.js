const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const Database = require('better-sqlite3');

const projectRoot = path.resolve(__dirname, '../..');
const quote = (name) => `"${String(name).replace(/"/g, '""')}"`;
function failure(code) { const error = new Error(code); error.code = code; return error; }
function sqliteValue(value) {
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  if (ArrayBuffer.isView(value) && !Buffer.isBuffer(value)) return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  return value;
}

function privateDestination(filename) {
  const absolute = path.resolve(filename);
  const relative = path.relative(projectRoot, absolute).replace(/\\/g, '/').toLowerCase();
  if (!absolute.toLowerCase().endsWith('.sqlite') || /^(frontend|public|dist|build|\.git|\.github)(\/|$)/.test(relative)) throw failure('UNSAFE_BACKUP_DESTINATION');
  return absolute;
}

async function checksum(filename) {
  const hash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(filename)) hash.update(chunk);
  return hash.digest('hex');
}

function inspectDatabase(filename) {
  const database = new Database(filename, { readonly: true, fileMustExist: true });
  try {
    const checks = database.pragma('integrity_check');
    const foreignKeys = database.pragma('foreign_key_check');
    if (checks.length !== 1 || checks[0].integrity_check !== 'ok' || foreignKeys.length) throw failure('BACKUP_INTEGRITY_FAILED');
    const rowCounts = Object.create(null);
    for (const { name } of database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all()) rowCounts[name] = database.prepare(`SELECT COUNT(*) AS total FROM ${quote(name)}`).get().total;
    return { integrity: 'ok', foreignKeyViolations: 0, rowCounts };
  } finally { database.close(); }
}

async function portableSnapshot(source, destination) {
  const target = new Database(destination);
  try {
    await source.readTransaction(async () => {
      const schema = await source.prepare("SELECT type,name,sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
      target.pragma('foreign_keys = OFF');
      target.exec('BEGIN');
      for (const item of schema.filter((entry) => entry.type === 'table')) target.exec(item.sql);
      for (const { name } of schema.filter((entry) => entry.type === 'table')) {
        const info = await source.prepare(`PRAGMA table_info(${quote(name)})`).all();
        const columns = info.map((column) => column.name);
        const primary = info.filter((column) => Number(column.pk) > 0).sort((a, b) => Number(a.pk) - Number(b.pk));
        const order = primary.length ? primary.map((column) => quote(column.name)).join(',') : 'rowid';
        if (!columns.length) continue;
        const insert = target.prepare(`INSERT INTO ${quote(name)} (${columns.map(quote).join(',')}) VALUES (${columns.map(() => '?').join(',')})`);
        for (let offset = 0; ; offset += 10) {
          const rows = await source.prepare(`SELECT ${columns.map(quote).join(',')} FROM ${quote(name)} ORDER BY ${order} LIMIT 10 OFFSET ?`).all(offset);
          for (const row of rows) insert.run(...columns.map((column) => sqliteValue(row[column])));
          if (rows.length < 10) break;
        }
      }
      if (target.prepare("SELECT 1 FROM sqlite_master WHERE name = 'sqlite_sequence'").get()) {
        const sequences = await source.prepare('SELECT name,seq FROM sqlite_sequence').all();
        target.exec('DELETE FROM sqlite_sequence');
        const insert = target.prepare('INSERT INTO sqlite_sequence (name,seq) VALUES (?,?)');
        for (const row of sequences) insert.run(row.name, row.seq);
      }
      for (const item of schema.filter((entry) => ['index', 'view', 'trigger'].includes(entry.type))) target.exec(item.sql);
      for (const pragma of ['user_version', 'application_id']) {
        const row = await source.prepare(`PRAGMA ${pragma}`).get();
        if (Number.isInteger(Number(row?.[pragma]))) target.pragma(`${pragma} = ${Number(row[pragma])}`);
      }
      target.exec('COMMIT');
    });
  } catch (error) {
    if (target.inTransaction) target.exec('ROLLBACK');
    throw error;
  } finally { target.close(); }
}

async function backupDatabase(source, filename) {
  const destination = privateDestination(filename);
  const temporary = `${destination}-partial-${crypto.randomUUID()}`;
  await fsp.mkdir(path.dirname(destination), { recursive: true });
  if (fs.existsSync(destination) || fs.existsSync(`${destination}.manifest.json`)) throw failure('BACKUP_ALREADY_EXISTS');
  try {
    if (source.kind === 'sqlite' && source.backup) await source.backup(temporary);
    else await portableSnapshot(source, temporary);
    const verified = inspectDatabase(temporary);
    const manifest = { version: 1, createdAt: new Date().toISOString(), provider: source.kind, sha256: await checksum(temporary), ...verified };
    await fsp.copyFile(temporary, destination, fs.constants.COPYFILE_EXCL);
    await fsp.writeFile(`${destination}.manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
    return { filename: destination, ...manifest };
  } finally { await fsp.rm(temporary, { force: true }); }
}

async function verifyBackup(filename, { requireManifest = false } = {}) {
  const absolute = path.resolve(filename);
  let manifest;
  try { manifest = JSON.parse(await fsp.readFile(`${absolute}.manifest.json`, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT' || requireManifest) throw failure('BACKUP_MANIFEST_MISSING_OR_INVALID'); }
  const hash = await checksum(absolute);
  if (manifest && (manifest.version !== 1 || manifest.sha256 !== hash)) throw failure('BACKUP_CHECKSUM_MISMATCH');
  const verified = inspectDatabase(absolute);
  if (manifest && JSON.stringify(manifest.rowCounts) !== JSON.stringify(verified.rowCounts)) throw failure('BACKUP_ROW_COUNTS_MISMATCH');
  return { filename: absolute, sha256: hash, manifestVerified: Boolean(manifest), ...verified };
}

async function restoreBackup(filename, output) {
  const verified = await verifyBackup(filename, { requireManifest: true });
  const destination = privateDestination(output);
  if (fs.existsSync(destination) || fs.existsSync(`${destination}.manifest.json`)) throw failure('RESTORE_DESTINATION_EXISTS');
  await fsp.mkdir(path.dirname(destination), { recursive: true });
  await fsp.copyFile(verified.filename, destination, fs.constants.COPYFILE_EXCL);
  await fsp.copyFile(`${verified.filename}.manifest.json`, `${destination}.manifest.json`, fs.constants.COPYFILE_EXCL);
  return verifyBackup(destination, { requireManifest: true });
}

module.exports = { backupDatabase, verifyBackup, restoreBackup };
