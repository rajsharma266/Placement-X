const test = require('node:test');
const assert = require('node:assert/strict');
const { createConnectionManager } = require('../src/config/database');

test('concurrent requests share one connection and warm requests reuse it', async () => {
  let calls = 0;
  let finish;
  const client = {
    connection: { readyState: 0 },
    connect: () => { calls += 1; return new Promise((resolve) => { finish = () => { client.connection.readyState = 1; resolve(client); }; }); },
    disconnect: async () => { client.connection.readyState = 0; },
  };
  const { connectDatabase, disconnectDatabase } = createConnectionManager(client, () => 'mongodb://test');
  const first = connectDatabase();
  const second = connectDatabase();
  assert.strictEqual(first, second);
  assert.equal(calls, 1);
  finish();
  assert.strictEqual(await first, client.connection);
  assert.strictEqual(await connectDatabase(), client.connection);
  assert.equal(calls, 1);
  await disconnectDatabase();
  assert.equal(client.connection.readyState, 0);
});

test('failed connection clears the cached promise and allows a retry', async () => {
  let calls = 0;
  const client = {
    connection: { readyState: 0 },
    connect: async () => { calls += 1; if (calls === 1) throw new Error('unavailable'); client.connection.readyState = 1; return client; },
  };
  const { connectDatabase } = createConnectionManager(client, () => 'mongodb://test');
  await assert.rejects(connectDatabase(), /unavailable/);
  assert.strictEqual(await connectDatabase(), client.connection);
  assert.equal(calls, 2);
});

test('missing MongoDB URI fails before opening a connection', async () => {
  let calls = 0;
  const client = { connection: { readyState: 0 }, connect: () => { calls += 1; } };
  const { connectDatabase } = createConnectionManager(client, () => '');
  await assert.rejects(connectDatabase(), /MongoDB connection URI is required/);
  assert.equal(calls, 0);
});
