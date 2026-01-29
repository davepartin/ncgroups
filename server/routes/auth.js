/**
 * Authentication Routes
 * POST /api/auth/login - Login with staff password
 * GET /api/auth/me - Verify token and get user info
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { generateToken, authenticateToken } from '../middleware/auth.js';

const router = Router();

// For simplicity, we're using a single staff account
// Password is stored as env variable, hashed on first comparison
const STAFF_USERNAME = 'ncstaff';

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

    // Check username
    if (username !== STAFF_USERNAME) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password against env variable
    const staffPassword = process.env.STAFF_PASSWORD;
    if (!staffPassword) {
      console.error('STAFF_PASSWORD environment variable not set!');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Simple comparison (in production, you'd want to hash the stored password)
    if (password !== staffPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

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
