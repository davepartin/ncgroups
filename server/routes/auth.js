/**
 * Authentication Routes
 * POST /api/auth/login - Login with staff password
 * GET /api/auth/me - Verify token and get user info
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { generateToken, authenticateToken } from '../middleware/auth.js';
import { loginLockout, LOGIN_LOCKOUT_MESSAGE } from '../services/login-lockout.js';

const router = Router();

// For simplicity, we're using a single staff account
// Password is stored as env variable, hashed on first comparison
const STAFF_USERNAME = 'ncstaff';

function rejectLocked(res) {
  return res.status(429).json({ error: LOGIN_LOCKOUT_MESSAGE });
}

/**
 * POST /api/auth/login
 * Body: { username, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const lockoutKey = loginLockout.keyFor(req);
    if (loginLockout.isLocked(lockoutKey)) {
      return rejectLocked(res);
    }

    const staffPassword = process.env.STAFF_PASSWORD;
    if (!staffPassword) {
      console.error('STAFF_PASSWORD environment variable not set!');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Check username and password together so a wrong name and a wrong
    // password look the same, including when this attempt trips the lockout.
    const credentialsValid = username === STAFF_USERNAME && password === staffPassword;
    if (!credentialsValid) {
      const result = loginLockout.recordFailure(lockoutKey);
      if (result.locked) {
        return rejectLocked(res);
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    loginLockout.recordSuccess(lockoutKey);

    // Generate JWT
    const token = generateToken({ 
      username: STAFF_USERNAME,
      role: 'staff'
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        username: STAFF_USERNAME,
        role: 'staff'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * GET /api/auth/me
 * Verify token and return user info
 */
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    user: req.user
  });
});

export default router;
