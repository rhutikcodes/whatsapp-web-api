import { Hono } from 'hono';
import { whatsappClient } from '../client';

const authRoutes = new Hono();

/**
 * GET /api/qr
 * Returns QR code as PNG image
 * Scan this QR code with WhatsApp to authenticate
 */
authRoutes.get('/qr', async (c) => {
  try {
    // Check if already authenticated
    if (whatsappClient.isClientReady()) {
      return c.json(
        {
          success: false,
          error: 'Already authenticated. Please logout first to get a new QR code.',
        },
        400
      );
    }

    // Wait a bit for QR code to be generated if client is still initializing
    if (whatsappClient.isClientInitializing() && !whatsappClient.hasQRCode()) {
      // Wait up to 10 seconds for QR code
      let attempts = 0;
      while (!whatsappClient.hasQRCode() && attempts < 20) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        attempts++;
      }
    }

    // Get QR code image
    const qrImage = await whatsappClient.getQRCodeImage();

    if (!qrImage) {
      return c.json(
        {
          success: false,
          error:
            'QR code not available. Client might be authenticated already or still initializing. Please try again in a moment.',
        },
        404
      );
    }

    // Return PNG image
    c.header('Content-Type', 'image/png');
    c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    return c.body(qrImage);
  } catch (error) {
    console.error('Error getting QR code:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to generate QR code',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

/**
 * POST /api/logout
 * Logout from WhatsApp and destroy session
 */
authRoutes.post('/logout', async (c) => {
  try {
    if (!whatsappClient.isClientReady()) {
      return c.json(
        {
          success: false,
          error: 'Client is not authenticated',
        },
        400
      );
    }

    await whatsappClient.logout();

    return c.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Error during logout:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to logout',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

export default authRoutes;
