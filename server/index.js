/**
 * NC Groups - Church Group Manager API
 * Neighborhood Church, Overland Park, Kansas
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.js';
import peopleRoutes from './routes/people.js';
import groupsRoutes from './routes/groups.js';
import textBlastRoutes from './routes/text-blast.js';
import twilioWebhookRoutes from './routes/twilio-webhook.js';
import vaultSyncRoutes from './routes/vault-sync.js';
import { authenticateToken } from './middleware/auth.js';

// Load environment variables
dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/twilio', twilioWebhookRoutes); // Twilio webhook (no auth - Twilio calls this)
app.use('/api/vault-sync', vaultSyncRoutes); // Sync routes use a dedicated token or staff login

// Protected routes (require authentication)
app.use('/api/people', authenticateToken, peopleRoutes);
app.use('/api/groups', authenticateToken, groupsRoutes);
app.use('/api/text-blast', authenticateToken, textBlastRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║        NC Groups - Church Group Manager                       ║
║        Neighborhood Church, Overland Park                     ║
╚═══════════════════════════════════════════════════════════════╝

🚀 Server running on port ${PORT}
📊 Database: ${process.env.DATABASE_URL ? 'Configured' : 'Not configured'}
⏰ Started: ${new Date().toLocaleString()}
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n👋 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

export { app, prisma };
