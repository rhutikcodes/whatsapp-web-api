/**
 * Request body for sending a text message
 */
export interface SendMessageRequest {
  phone: string;
  isGroup: boolean;
  message: string;
}

/**
 * Request body for sending a file
 */
export interface SendFileRequest {
  phone: string;
  isGroup: boolean;
  filename: string;
  caption?: string;
  base64: string;
}

/**
 * WhatsApp connection state
 */
export type WAState =
  | 'CONNECTED'
  | 'OPENING'
  | 'PAIRING'
  | 'UNPAIRED'
  | 'TIMEOUT'
  | 'CONFLICT'
  | 'UNLAUNCHED'
  | 'DEPRECATED_VERSION'
  | 'TOS_BLOCK'
  | 'PROXYBLOCK';

/**
 * Connection status response
 */
export interface StatusResponse {
  state: WAState;
  connected: boolean;
  info?: {
    wid: {
      user: string;
      server: string;
      _serialized: string;
    };
    pushname: string;
    platform: string;
  };
}

/**
 * Generic API response
 */
export interface ApiResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

/**
 * QR code state management
 */
export interface QRCodeState {
  qr: string | null;
  timestamp: number;
}
