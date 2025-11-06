import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import QRCode from 'qrcode';
import { existsSync } from 'fs';
import { QRCodeState, WAState } from './types';

/**
 * Singleton WhatsApp Client Manager
 * Handles client initialization, QR code generation, and session management
 */
class WhatsAppClientManager {
  private client: Client | null = null;
  private qrCodeState: QRCodeState = { qr: null, timestamp: 0 };
  private isInitializing = false;
  private isReady = false;

  constructor() {
    this.initializeClient();
  }

  /**
   * Get Chrome executable path based on environment or OS
   */
  private getChromePath(): string {
    // Priority 1: Environment variable
    if (process.env.CHROME_PATH) {
      console.log(`Using Chrome from env: ${process.env.CHROME_PATH}`);
      return process.env.CHROME_PATH;
    }

    // Priority 2: Check common Linux paths (Docker/VPS)
    const linuxPaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
    ];

    for (const path of linuxPaths) {
      if (existsSync(path)) {
        console.log(`Using Chrome from: ${path}`);
        return path;
      }
    }

    // Priority 3: macOS path (for local development)
    const macPath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    if (existsSync(macPath)) {
      console.log(`Using Chrome from macOS: ${macPath}`);
      return macPath;
    }

    // Default fallback
    console.log('Using default Chrome path');
    return '/usr/bin/google-chrome';
  }

  /**
   * Initialize WhatsApp client with LocalAuth
   */
  private initializeClient(): void {
    if (this.client) {
      console.log('Client already exists');
      return;
    }

    console.log('Initializing WhatsApp client...');
    this.isInitializing = true;

    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'whatsapp-web-api',
        dataPath: './.wwebjs_auth/',
      }),
      puppeteer: {
        headless: true,
        executablePath: this.getChromePath(),
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      },
    });

    this.setupEventHandlers();
    this.client.initialize();
  }

  /**
   * Set up event handlers for WhatsApp client
   */
  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('qr', (qr: string) => {
      console.log('QR code received');
      this.qrCodeState = {
        qr,
        timestamp: Date.now(),
      };
    });

    this.client.on('authenticated', () => {
      console.log('✅ Authentication successful');
      this.qrCodeState = { qr: null, timestamp: 0 };
    });

    this.client.on('auth_failure', (msg) => {
      console.error('❌ Authentication failed:', msg);
      this.isReady = false;
    });

    this.client.on('ready', () => {
      console.log('🚀 WhatsApp client is ready!');
      this.isInitializing = false;
      this.isReady = true;
      this.qrCodeState = { qr: null, timestamp: 0 };
    });

    this.client.on('disconnected', (reason) => {
      console.log('⚠️ Client disconnected:', reason);
      this.isReady = false;
      this.qrCodeState = { qr: null, timestamp: 0 };
    });

    this.client.on('loading_screen', (percent) => {
      console.log(`Loading... ${percent}%`);
    });
  }

  /**
   * Get QR code as PNG buffer
   * @returns PNG buffer or null if no QR code available
   */
  async getQRCodeImage(): Promise<Buffer | null> {
    if (!this.qrCodeState.qr) {
      return null;
    }

    try {
      // Generate QR code as PNG buffer
      const buffer = await QRCode.toBuffer(this.qrCodeState.qr, {
        type: 'png',
        width: 500,
        margin: 2,
      });
      return buffer;
    } catch (error) {
      console.error('Error generating QR code:', error);
      return null;
    }
  }

  /**
   * Check if client is ready
   */
  isClientReady(): boolean {
    return this.isReady;
  }

  /**
   * Check if client is initializing
   */
  isClientInitializing(): boolean {
    return this.isInitializing;
  }

  /**
   * Check if QR code is available
   */
  hasQRCode(): boolean {
    return this.qrCodeState.qr !== null;
  }

  /**
   * Get connection state
   */
  async getState(): Promise<WAState> {
    if (!this.client) {
      return 'UNPAIRED';
    }
    return (await this.client.getState()) as WAState;
  }

  /**
   * Get client info
   */
  async getInfo() {
    if (!this.client || !this.isReady) {
      return null;
    }
    try {
      return await this.client.info;
    } catch (error) {
      console.error('Error getting client info:', error);
      return null;
    }
  }

  /**
   * Format chat ID based on whether it's a group or individual
   */
  formatChatId(phone: string, isGroup: boolean): string {
    if (isGroup) {
      // If it's a group, assume the phone is already the full group JID
      // or format it as group ID
      return phone.includes('@g.us') ? phone : `${phone}@g.us`;
    } else {
      // For individual chats, format as phone@c.us
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      return `${cleanPhone}@c.us`;
    }
  }

  /**
   * Send text message
   */
  async sendMessage(phone: string, isGroup: boolean, message: string) {
    if (!this.client || !this.isReady) {
      throw new Error('Client is not ready');
    }

    const chatId = this.formatChatId(phone, isGroup);
    console.log(`Sending message to ${chatId}`);

    try {
      const result = await this.client.sendMessage(chatId, message);
      return {
        success: true,
        messageId: result.id._serialized,
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Send file from base64
   */
  async sendFile(
    phone: string,
    isGroup: boolean,
    filename: string,
    base64: string,
    caption?: string
  ) {
    if (!this.client || !this.isReady) {
      throw new Error('Client is not ready');
    }

    const chatId = this.formatChatId(phone, isGroup);
    console.log(`Sending file to ${chatId}: ${filename}`);

    try {
      // Detect MIME type from filename extension
      const mimeType = this.getMimeType(filename);

      // Create MessageMedia from base64
      const media = new MessageMedia(mimeType, base64, filename);

      // Send message with optional caption
      const result = await this.client.sendMessage(chatId, media, {
        caption: caption || undefined,
      });

      return {
        success: true,
        messageId: result.id._serialized,
      };
    } catch (error) {
      console.error('Error sending file:', error);
      throw error;
    }
  }

  /**
   * Get MIME type from filename
   */
  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      // Images
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
      svg: 'image/svg+xml',
      // Documents
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
      csv: 'text/csv',
      // Audio
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      m4a: 'audio/mp4',
      // Video
      mp4: 'video/mp4',
      avi: 'video/x-msvideo',
      mov: 'video/quicktime',
      wmv: 'video/x-ms-wmv',
      // Archives
      zip: 'application/zip',
      rar: 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
    };

    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  /**
   * Logout and destroy client
   */
  async logout(): Promise<void> {
    if (!this.client) {
      throw new Error('No client to logout');
    }

    console.log('Logging out...');

    try {
      await this.client.logout();
      console.log('Logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    } finally {
      this.isReady = false;
      this.qrCodeState = { qr: null, timestamp: 0 };
    }
  }

  /**
   * Destroy client completely
   */
  async destroy(): Promise<void> {
    if (!this.client) {
      return;
    }

    console.log('Destroying client...');
    try {
      await this.client.destroy();
      this.client = null;
      this.isReady = false;
      this.isInitializing = false;
      this.qrCodeState = { qr: null, timestamp: 0 };
      console.log('Client destroyed');
    } catch (error) {
      console.error('Error destroying client:', error);
    }
  }
}

// Export singleton instance
export const whatsappClient = new WhatsAppClientManager();
