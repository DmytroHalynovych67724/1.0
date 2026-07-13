const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createServer } = require('node:http');
const { app } = require('../backend/app');

test('GET /api/health returns ok', async () => {
  const server = createServer(app);
  server.listen(0);
  await once(server, 'listening');

  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, { status: 'ok', service: 'ecommerce-api' });

  server.close();
  await once(server, 'close');
});
