import { Hono } from 'hono';
import { whatsappClient } from '../client';
import { SendMessageRequest, SendFileRequest, ApiResponse } from '../types';

const messageRoutes = new Hono();

/**
 * POST /api/send-message
 * Send a text message to individual or group
 * Body: { phone: string, isGroup: boolean, message: string }
 */
messageRoutes.post('/send-message', async (c) => {
  try {
    // Check if client is ready
    if (!whatsappClient.isClientReady()) {
      return c.json(
        {
          success: false,
          error: 'Client is not ready. Please authenticate first by scanning QR code.',
        },
        400
      );
    }

    // Parse request body
    const body = await c.req.json<SendMessageRequest>();

    // Validate required fields
    if (!body.phone || typeof body.isGroup !== 'boolean' || !body.message) {
      return c.json(
        {
          success: false,
          error: 'Missing required fields: phone, isGroup, and message are required',
        },
        400
      );
    }

    // Send message
    const result = await whatsappClient.sendMessage(
      body.phone,
      body.isGroup,
      body.message
    );

    const response: ApiResponse = {
      success: true,
      message: 'Message sent successfully',
      data: {
        messageId: result.messageId,
        to: body.phone,
        isGroup: body.isGroup,
      },
    };

    return c.json(response);
  } catch (error) {
    console.error('Error sending message:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to send message',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

/**
 * POST /api/send-file
 * Send a file (with optional caption) to individual or group
 * Body: { phone: string, isGroup: boolean, filename: string, caption?: string, base64: string }
 */
messageRoutes.post('/send-file', async (c) => {
  try {
    // Check if client is ready
    if (!whatsappClient.isClientReady()) {
      return c.json(
        {
          success: false,
          error: 'Client is not ready. Please authenticate first by scanning QR code.',
        },
        400
      );
    }

    // Parse request body
    const body = await c.req.json<SendFileRequest>();

    // Validate required fields
    if (
      !body.phone ||
      typeof body.isGroup !== 'boolean' ||
      !body.filename ||
      !body.base64
    ) {
      return c.json(
        {
          success: false,
          error:
            'Missing required fields: phone, isGroup, filename, and base64 are required',
        },
        400
      );
    }

    // Remove data URI prefix if present (e.g., "data:image/png;base64,")
    let base64Data = body.base64;
    if (base64Data.includes('base64,')) {
      base64Data = base64Data.split('base64,')[1];
    }

    // Send file
    const result = await whatsappClient.sendFile(
      body.phone,
      body.isGroup,
      body.filename,
      base64Data,
      body.caption
    );

    const response: ApiResponse = {
      success: true,
      message: 'File sent successfully',
      data: {
        messageId: result.messageId,
        to: body.phone,
        isGroup: body.isGroup,
        filename: body.filename,
      },
    };

    return c.json(response);
  } catch (error) {
    console.error('Error sending file:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to send file',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

export default messageRoutes;
