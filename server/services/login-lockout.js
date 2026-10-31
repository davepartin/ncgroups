/**
 * In-memory login lockout for the shared staff sign-in.
 *
 * Keyed by client IP (not username) so:
 * - one guessed username does not lock every staff member
 * - failed tries count the same whether the username exists or not
 *
 * Express is already configured with `trust proxy` for Railway, so `req.ip`
 * is the original client address rather than the proxy hop.
 *
 * A process restart clears the store. That is acceptable here: the lockout
 * window is short, and this app has no login-attempt table.
 */

export const LOGIN_LOCKOUT_MESSAGE =
  'Too many tries. Please wait 5 minutes and try again.';

export const DEFAULT_MAX_FAILED_ATTEMPTS = 5;
export const DEFAULT_LOCKOUT_WINDOW_MS = 5 * 60 * 1000;

export function normalizeClientIp(req) {
  const raw = req?.ip || '';
  const ip = String(raw).replace(/^::ffff:/, '').trim();
  return ip || 'unknown';
}

export function createLoginLockout({
  maxAttempts = DEFAULT_MAX_FAILED_ATTEMPTS,
  windowMs = DEFAULT_LOCKOUT_WINDOW_MS,
  now = () => Date.now()
} = {}) {
  const store = new Map();

  function getEntry(key) {
    const entry = store.get(key);
    if (!entry) return null;
    if (entry.lockedUntil != null && now() >= entry.lockedUntil) {
      store.delete(key);
      return null;
    }
    return entry;
  }

  function inspect(key) {
    const entry = getEntry(key);
    if (!entry) {
      return { locked: false, failedAttempts: 0 };
    }
    return {
      locked: entry.lockedUntil != null && now() < entry.lockedUntil,
      failedAttempts: entry.count
    };
  }

  function recordFailure(key) {
    const entry = getEntry(key) || { count: 0, lockedUntil: null };
    entry.count += 1;
    if (entry.count >= maxAttempts) {
      entry.lockedUntil = now() + windowMs;
    }
    store.set(key, entry);
    return inspect(key);
  }

  function recordSuccess(key) {
    store.delete(key);
  }

  return {
    keyFor(req) {
      return normalizeClientIp(req);
    },
    inspect,
    isLocked(key) {
      return inspect(key).locked;
    },
    recordFailure,
    recordSuccess
  };
}

export const loginLockout = createLoginLockout();
