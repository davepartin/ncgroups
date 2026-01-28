/**
 * Authentication Middleware
 * Verifies JWT tokens for protected routes
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'nc-groups-dev-secret-change-in-production';

export function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
  }

  try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
  } catch (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}
