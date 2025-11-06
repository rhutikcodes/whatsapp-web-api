import { Hono } from 'hono';
import { whatsappClient } from '../client';
import { StatusResponse } from '../types';

const statusRoutes = new Hono();

/**
 * GET /api/status
 * Get current connection status and client info
 */
statusRoutes.get('/', async (c) => {
  try {
    const state = await whatsappClient.getState();
    const info = await whatsappClient.getInfo();

    const response: StatusResponse = {
      state,
      connected: whatsappClient.isClientReady(),
      ...(info && { info }),
    };

    return c.json(response);
  } catch (error) {
    console.error('Error getting status:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get status',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

export default statusRoutes;
