const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { createLocalDatabase, createRemoteDatabase } = require('../backend/database-client');
const { getConfiguredFile, getTursoConfig } = require('../backend/db');
const { backupDatabase, verifyBackup, restoreBackup } = require('../backend/utils/databaseBackup');

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    if (!['--file', '--output'].includes(args[index]) || !args[index + 1]) { const error = new Error('INVALID_ARGUMENTS'); error.code = 'INVALID_ARGUMENTS'; throw error; }
    options[args[index]] = args[index + 1];
  }
  let result;
  if (command === 'backup') {
    if (options['--file']) { const error = new Error('BACKUP_SOURCE_IS_CONFIGURED_BY_ENV'); error.code = 'BACKUP_SOURCE_IS_CONFIGURED_BY_ENV'; throw error; }
    const turso = getTursoConfig();
    const source = turso ? createRemoteDatabase({ ...turso, intMode: 'bigint' }) : createLocalDatabase(getConfiguredFile(), { readonly: true, fileMustExist: true });
    try {
      const output = options['--output'] || path.resolve(__dirname, `../backups/nashary-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`);
      result = await backupDatabase(source, output);
    } finally { await source.close(); }
  } else if (command === 'verify' && options['--file']) result = await verifyBackup(options['--file'], { requireManifest: true });
  else if (command === 'restore' && options['--file'] && options['--output']) result = await restoreBackup(options['--file'], options['--output']);
  else { const error = new Error('USE_BACKUP_OR_VERIFY_FILE_OR_RESTORE_FILE_OUTPUT'); error.code = 'USE_BACKUP_OR_VERIFY_FILE_OR_RESTORE_FILE_OUTPUT'; throw error; }
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => { console.error('Database backup operation failed:', error.code || error.name); process.exitCode = 1; });
