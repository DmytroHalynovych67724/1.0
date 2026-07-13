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

test('DELETE /api/products/:id returns 404 for missing product', async () => {
  await setup();
  const db = getDB();
  db.prepare('DELETE FROM users').run();
  db.prepare('DELETE FROM products').run();

  const server = createServer(app);
  server.listen(0);
  await once(server, 'listening');
  const { port } = server.address();

  const username = `tester-${Date.now()}`;
  const registerRes = await fetch(`http://127.0.0.1:${port}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password: 'secret123' })
  });
  assert.equal(registerRes.status, 201);

  const loginRes = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password: 'secret123' })
  });
  assert.equal(loginRes.status, 200);
  const { token } = await loginRes.json();

  const deleteRes = await fetch(`http://127.0.0.1:${port}/api/products/non-existent-id`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` }
  });

  assert.equal(deleteRes.status, 404);

  server.close();
  await once(server, 'close');
});
