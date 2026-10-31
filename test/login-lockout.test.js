import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import express from 'express';
import {
  createLoginLockout,
  LOGIN_LOCKOUT_MESSAGE,
  normalizeClientIp
} from '../server/services/login-lockout.js';
import authRoutes from '../server/routes/auth.js';

const TEST_PASSWORD = 'test-staff-password-not-real';
process.env.STAFF_PASSWORD = TEST_PASSWORD;

const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use('/api/auth', authRoutes);

const server = await new Promise((resolve) => {
  const started = app.listen(0, () => resolve(started));
});
after(() => new Promise((resolve, reject) => {
  server.close((error) => (error ? reject(error) : resolve()));
}));

async function postLogin(ip, username, password) {
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': ip
    },
    body: JSON.stringify({ username, password })
  });
  return { status: response.status, body: await response.json() };
}

test('locks after N failures', () => {
  const lockout = createLoginLockout({ maxAttempts: 5, windowMs: 300_000 });
  const key = '203.0.113.10';

  for (let i = 0; i < 4; i += 1) {
    assert.equal(lockout.recordFailure(key).locked, false);
  }

  assert.equal(lockout.recordFailure(key).locked, true);
  assert.equal(lockout.isLocked(key), true);
});

test('unlocks after the window', () => {
  let now = 1_000_000;
  const windowMs = 5 * 60 * 1000;
  const lockout = createLoginLockout({
    maxAttempts: 5,
    windowMs,
    now: () => now
  });
  const key = '203.0.113.10';

  for (let i = 0; i < 5; i += 1) {
    lockout.recordFailure(key);
  }

  assert.equal(lockout.isLocked(key), true);

  now += windowMs - 1;
  assert.equal(lockout.isLocked(key), true);

  now += 1;
  assert.equal(lockout.isLocked(key), false);
  assert.equal(lockout.recordFailure(key).locked, false);
});

test('success resets the counter', () => {
  const lockout = createLoginLockout({ maxAttempts: 5, windowMs: 300_000 });
  const key = '203.0.113.10';

  for (let i = 0; i < 4; i += 1) {
    assert.equal(lockout.recordFailure(key).locked, false);
  }

  lockout.recordSuccess(key);

  for (let i = 0; i < 4; i += 1) {
    assert.equal(lockout.recordFailure(key).locked, false);
  }

  assert.equal(lockout.recordFailure(key).locked, true);
});

test('lockout key is the client IP so username guesses share one counter', () => {
  const lockout = createLoginLockout({ maxAttempts: 5, windowMs: 300_000 });
  const key = lockout.keyFor({ ip: '::ffff:203.0.113.10' });

  assert.equal(key, '203.0.113.10');
  assert.equal(normalizeClientIp({ ip: '2001:db8::1' }), '2001:db8::1');
  assert.equal(normalizeClientIp({}), 'unknown');
  assert.equal(LOGIN_LOCKOUT_MESSAGE, 'Too many tries. Please wait 5 minutes and try again.');
});

test('login route locks after five failures with the same friendly message', async () => {
  const ip = '198.51.100.10';

  for (let i = 0; i < 4; i += 1) {
    const failed = await postLogin(ip, i % 2 === 0 ? 'ncstaff' : 'not-a-user', 'wrong');
    assert.equal(failed.status, 401);
    assert.equal(failed.body.error, 'Invalid credentials');
  }

  const locked = await postLogin(ip, 'someone-else', 'wrong');
  assert.equal(locked.status, 429);
  assert.equal(locked.body.error, LOGIN_LOCKOUT_MESSAGE);

  const stillLocked = await postLogin(ip, 'ncstaff', TEST_PASSWORD);
  assert.equal(stillLocked.status, 429);
  assert.equal(stillLocked.body.error, LOGIN_LOCKOUT_MESSAGE);
});

test('login route success resets the failed-attempt counter', async () => {
  const ip = '198.51.100.20';

  for (let i = 0; i < 4; i += 1) {
    const failed = await postLogin(ip, 'ncstaff', 'wrong');
    assert.equal(failed.status, 401);
  }

  const success = await postLogin(ip, 'ncstaff', TEST_PASSWORD);
  assert.equal(success.status, 200);
  assert.ok(success.body.token);

  for (let i = 0; i < 4; i += 1) {
    const failed = await postLogin(ip, 'ncstaff', 'wrong');
    assert.equal(failed.status, 401);
  }
});
