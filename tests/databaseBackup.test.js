const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');
const { createLocalDatabase } = require('../backend/database-client');
const { backupDatabase, verifyBackup, restoreBackup } = require('../backend/utils/databaseBackup');

function fixture(filename) {
  const db = new Database(filename);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA user_version=7;
    CREATE TABLE parents (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,data BLOB,counter INTEGER);
    CREATE TABLE children (id TEXT PRIMARY KEY,parentId INTEGER REFERENCES parents(id));
    CREATE TABLE audit (id INTEGER PRIMARY KEY AUTOINCREMENT,entry TEXT);
    CREATE INDEX child_parent ON children(parentId);
    CREATE VIEW parent_names AS SELECT name FROM parents;
    CREATE TRIGGER audit_parent AFTER INSERT ON parents BEGIN INSERT INTO audit(entry) VALUES (new.name); END;`);
  db.prepare('INSERT INTO parents (name,data,counter) VALUES (?,?,?)').run('Дмитро\'s "device"', Buffer.from([0, 255, 128, 1]), 9223372036854775806n);
  db.prepare('INSERT INTO parents (name) VALUES (?)').run('deleted row');
  db.exec("DELETE FROM parents WHERE id=2; INSERT INTO children (id,parentId) VALUES ('child',1)");
  db.close();
}

for (const mode of ['sqlite', 'portable']) test(`database backup and separate-file restore preserve schema and values (${mode})`, async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nashary-backup-'));
  let source;
  let raw;
  try {
    const original = path.join(directory, 'source.sqlite');
    fixture(original);
    if (mode === 'sqlite') source = createLocalDatabase(original, { readonly: true, fileMustExist: true });
    else {
      // Emulate libSQL's bigint integers and ArrayBuffer blobs without contacting production.
      raw = new Database(original, { readonly: true }); raw.defaultSafeIntegers(true);
      const remoteRow = (row) => row && Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Buffer.isBuffer(value) ? new Uint8Array(value).buffer : value]));
      source = {
        kind: 'turso',
        prepare(sql) { const statement = raw.prepare(sql); return { async all(...args) { return statement.all(...args).map(remoteRow); }, async get(...args) { return remoteRow(statement.get(...args)); } }; },
        async readTransaction(callback) { raw.exec('BEGIN'); try { const result = await callback(); raw.exec('COMMIT'); return result; } catch (error) { raw.exec('ROLLBACK'); throw error; } },
      };
    }
    const backup = path.join(directory, 'backup.sqlite');
    const result = await backupDatabase(source, backup);
    assert.equal(result.integrity, 'ok');
    assert.equal(result.rowCounts.parents, 1);
    assert.equal(result.rowCounts.audit, 2);
    assert.equal((await verifyBackup(backup, { requireManifest: true })).manifestVerified, true);
    await assert.rejects(backupDatabase(source, backup), { code: 'BACKUP_ALREADY_EXISTS' });
    const restored = path.join(directory, 'restored.sqlite');
    await restoreBackup(backup, restored);
    await assert.rejects(restoreBackup(backup, restored), { code: 'RESTORE_DESTINATION_EXISTS' });
    const copy = new Database(restored);
    try {
      assert.equal(copy.prepare('SELECT name FROM parent_names').get().name, 'Дмитро\'s "device"');
      assert.deepEqual(copy.prepare('SELECT data FROM parents').get().data, Buffer.from([0, 255, 128, 1]));
      assert.equal(copy.prepare('SELECT CAST(counter AS TEXT) AS value FROM parents').get().value, '9223372036854775806');
      assert.equal(copy.pragma('user_version', { simple: true }), 7);
      assert.equal(copy.prepare("SELECT COUNT(*) AS total FROM sqlite_master WHERE name='child_parent'").get().total, 1);
      assert.equal(copy.prepare('INSERT INTO parents (name) VALUES (?)').run('next row').lastInsertRowid, 3);
      assert.equal(copy.prepare('SELECT COUNT(*) AS total FROM audit').get().total, 3);
    } finally { copy.close(); }
    fs.appendFileSync(backup, Buffer.from([255]));
    await assert.rejects(verifyBackup(backup, { requireManifest: true }), { code: 'BACKUP_CHECKSUM_MISMATCH' });
    const missingManifest = path.join(directory, 'unverified.sqlite');
    fs.copyFileSync(original, missingManifest);
    await assert.rejects(restoreBackup(missingManifest, path.join(directory, 'unsafe.sqlite')), { code: 'BACKUP_MANIFEST_MISSING_OR_INVALID' });
    await assert.rejects(backupDatabase(source, path.resolve(__dirname, '../frontend/public/private.sqlite')), { code: 'UNSAFE_BACKUP_DESTINATION' });
  } finally {
    if (source?.close) await source.close();
    if (raw) raw.close();
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('nashary-backup-'));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
