const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createServer } = require('node:http');
const { app, setup } = require('../backend/app');
const { getDB } = require('../backend/db');

test('Products CRUD', async () => {
  await setup();
  // ensure db empty
  const db = getDB();
  db.prepare('DELETE FROM products').run();

  const server = createServer(app);
  server.listen(0);
  await once(server, 'listening');
  const { port } = server.address();

  // create
  const createRes = await fetch(`http://127.0.0.1:${port}/api/products`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer invalid' }, body: JSON.stringify({ title: 'X', price: 1 }) });
  // should be unauthorized because no valid token
  assert.equal(createRes.status, 401);

  server.close();
  await once(server, 'close');
});
