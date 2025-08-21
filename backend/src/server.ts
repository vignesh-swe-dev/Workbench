import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { assertAuthConfig } from './auth/session.ts';
import { apiRouter } from './api/routes.ts';
import { initSocketServer } from './realtime/socket.ts';
import { db } from './db/storage.ts';

const PORT = Number(process.env.PORT) || 5000;
const CLIENT_URL = process.env.CLIENT_URL; // e.g. http://localhost:5173

async function startServer() {
  assertAuthConfig();
  await db.init();

  const app = express();
  const server = http.createServer(app);

  // Initialize Socket.IO real-time collaboration
  initSocketServer(server);

  // Express Middlewares
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: CLIENT_URL || true, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health endpoint
  app.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      service: 'forgeflow-backend',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // REST API routes under /api/v1
  app.use('/api/v1', apiRouter);

  // Server listener
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[ForgeFlow] Backend listening on http://0.0.0.0:${PORT}`);
  });
}

async function shutdown(signal: string) {
  console.log(`[Workbench] ${signal} received, saving data...`);
  try {
    await db.close();
  } finally {
    process.exit(0);
  }
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer().catch((err) => {
  console.error('[ForgeFlow] Failed to start server:', err);
  process.exit(1);
});
