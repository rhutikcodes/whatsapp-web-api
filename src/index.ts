import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import authRoutes from './routes/auth';
import statusRoutes from './routes/status';
import messageRoutes from './routes/message';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Health check endpoint
app.get('/', (c) => {
  return c.json({
    service: 'WhatsApp Web API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: {
        'GET /api/qr': 'Get QR code as PNG image for authentication',
        'POST /api/logout': 'Logout and destroy session',
      },
      status: {
        'GET /api/status': 'Get connection status and client info',
      },
      messaging: {
        'POST /api/send-message': 'Send text message',
        'POST /api/send-file': 'Send file with base64 encoding',
      },
    },
  });
});

// Mount routes
app.route('/api', authRoutes);
app.route('/api/status', statusRoutes);
app.route('/api', messageRoutes);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: 'Route not found',
    },
    404
  );
});

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json(
    {
      success: false,
      error: 'Internal server error',
      details: err.message,
    },
    500
  );
});

// Start server
const port = parseInt(process.env.PORT || '3000');

console.log(`
╔════════════════════════════════════════════╗
║   WhatsApp Web API Server                 ║
║   Powered by whatsapp-web.js & Hono       ║
╚════════════════════════════════════════════╝
`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`🚀 Server is running on http://localhost:${port}`);
console.log(`📱 Scan QR code at: http://localhost:${port}/api/qr`);
console.log(`📊 Check status at: http://localhost:${port}/api/status`);
console.log(`\n⚠️  IMPORTANT: This is an unofficial WhatsApp API`);
console.log(`   Use at your own risk. Account bans are possible.\n`);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});
