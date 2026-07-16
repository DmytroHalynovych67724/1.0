const { AsyncLocalStorage } = require('node:async_hooks');
const Database = require('better-sqlite3');
const { createClient } = require('@libsql/client');

const transactionContext = new AsyncLocalStorage();

function normalizeRemoteArgs(args) {
  if (args.length === 0) return [];
  if (args.length === 1) {
    if (Array.isArray(args[0])) return args[0];
    if (args[0] && typeof args[0] === 'object') return args[0];
  }
  return args;
}

function normalizeRemoteRun(result) {
  const lastInsertRowid = result.lastInsertRowid;
  return {
    changes: Number(result.rowsAffected || 0),
    lastInsertRowid:
      typeof lastInsertRowid === 'bigint' ? Number(lastInsertRowid) : lastInsertRowid,
  };
}

function createLocalDatabase(filename) {
  const driver = new Database(filename);

  const database = {
    kind: 'sqlite',
    filename,
    prepare(sql) {
      return {
        get(...args) {
          return driver.prepare(sql).get(...args);
        },
        all(...args) {
          return driver.prepare(sql).all(...args);
        },
        run(...args) {
          return driver.prepare(sql).run(...args);
        },
      };
    },
    exec(sql) {
      return driver.exec(sql);
    },
    pragma(value) {
      return driver.pragma(value);
    },
    transaction(callback) {
      const execute =
        (mode) =>
        async (...args) => {
          driver.exec(mode === 'immediate' ? 'BEGIN IMMEDIATE' : 'BEGIN');
          try {
            const result = await callback(...args);
            driver.exec('COMMIT');
            return result;
          } catch (error) {
            if (driver.inTransaction) driver.exec('ROLLBACK');
            throw error;
          }
        };
      const run = execute('deferred');
      run.immediate = execute('immediate');
      return run;
    },
    close() {
      return driver.close();
    },
  };

  return database;
}

function createRemoteDatabase({ url, authToken }) {
  const client = createClient({ url, authToken });

  function executor() {
    return transactionContext.getStore() || client;
  }

  const database = {
    kind: 'turso',
    prepare(sql) {
      async function execute(args) {
        return executor().execute({ sql, args: normalizeRemoteArgs(args) });
      }
      return {
        async get(...args) {
          const result = await execute(args);
          return result.rows[0] || undefined;
        },
        async all(...args) {
          const result = await execute(args);
          return Array.from(result.rows);
        },
        async run(...args) {
          return normalizeRemoteRun(await execute(args));
        },
      };
    },
    async exec(sql) {
      const active = transactionContext.getStore();
      if (active) {
        for (const statement of sql
          .split(';')
          .map((item) => item.trim())
          .filter(Boolean)) {
          await active.execute(statement);
        }
        return;
      }
      await client.executeMultiple(sql);
    },
    async pragma(value) {
      const normalized = String(value).trim().toLowerCase();
      if (normalized.startsWith('journal_mode') || normalized.startsWith('busy_timeout')) return;
      await executor().execute(`PRAGMA ${value}`);
    },
    transaction(callback) {
      const run = async (...args) => {
        const transaction = await client.transaction('write');
        try {
          const result = await transactionContext.run(transaction, () => callback(...args));
          await transaction.commit();
          return result;
        } catch (error) {
          await transaction.rollback();
          throw error;
        } finally {
          transaction.close();
        }
      };
      run.immediate = run;
      return run;
    },
    async close() {
      client.close();
    },
  };

  return database;
}

module.exports = { createLocalDatabase, createRemoteDatabase };
