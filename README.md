# WhatsApp Web API

A RESTful API server for WhatsApp Web built with [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) and [Hono](https://hono.dev/). Send messages, files, and manage WhatsApp connections programmatically.

## ⚠️ Important Disclaimer

This is an **unofficial** WhatsApp API implementation using whatsapp-web.js. It is **not affiliated with or endorsed by WhatsApp**. Use at your own risk:

- WhatsApp does not officially support bots
- Account bans are possible if you violate WhatsApp's Terms of Service
- For commercial applications, consider using the [official WhatsApp Business API](https://business.whatsapp.com/products/business-api)

## 🚀 Features

- ✅ QR Code authentication (returned as PNG image)
- ✅ Session persistence with LocalAuth
- ✅ Send messages to individuals and groups
- ✅ Send files with base64 encoding
- ✅ Connection status monitoring
- ✅ TypeScript for type safety
- ✅ RESTful API design with Hono
- ✅ No API authentication (simple setup)

## 📋 Requirements

- Node.js v18 or higher
- npm or yarn

## 🛠️ Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd whatsapp-web-api
```

2. Install dependencies:
```bash
npm install
```

3. Run in development mode:
```bash
npm run dev
```

4. Or build and run in production:
```bash
npm run build
npm start
```

The server will start on `http://localhost:3000` by default. You can change the port by setting the `PORT` environment variable:
```bash
PORT=8080 npm run dev
```

## 📡 API Endpoints

### 1. Get QR Code (Authentication)

**GET** `/api/qr`

Returns a QR code as a PNG image. Scan this with your WhatsApp mobile app to authenticate.

**Response:** PNG image (Content-Type: image/png)

**Example:**
```bash
# Save QR code to file
curl http://localhost:3000/api/qr --output qr.png

# Or open directly in browser
open http://localhost:3000/api/qr
```

**Notes:**
- QR code refreshes every ~30 seconds until scanned
- Returns error if already authenticated
- After scanning, the session persists in `.wwebjs_auth/` directory

---

### 2. Get Connection Status

**GET** `/api/status`

Returns the current connection state and client information.

**Response:**
```json
{
  "state": "CONNECTED",
  "connected": true,
  "info": {
    "wid": {
      "user": "1234567890",
      "server": "c.us",
      "_serialized": "1234567890@c.us"
    },
    "pushname": "Your Name",
    "platform": "android"
  }
}
```

**Possible States:**
- `CONNECTED` - Active connection
- `OPENING` - Connection initializing
- `PAIRING` - Device pairing in progress
- `UNPAIRED` - Device not paired
- `TIMEOUT` - Connection timeout
- Other states: `CONFLICT`, `UNLAUNCHED`, `DEPRECATED_VERSION`, `TOS_BLOCK`, `PROXYBLOCK`

**Example:**
```bash
curl http://localhost:3000/api/status
```

---

### 3. Send Message

**POST** `/api/send-message`

Send a text message to an individual contact or group.

**Request Body:**
```json
{
  "phone": "5521999999999",
  "isGroup": false,
  "message": "Hi there! This is a test message."
}
```

**Parameters:**
- `phone` (string, required):
  - For individuals: Phone number without `+` sign (e.g., `5521999999999`)
  - For groups: Complete group JID (e.g., `120363138187262687@g.us`)
- `isGroup` (boolean, required): `true` for groups, `false` for individuals
- `message` (string, required): The text message to send

**Response:**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "messageId": "true_5521999999999@c.us_3EB0...",
    "to": "5521999999999",
    "isGroup": false
  }
}
```

**Examples:**

Send to individual:
```bash
curl -X POST http://localhost:3000/api/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "5521999999999",
    "isGroup": false,
    "message": "Hello from WhatsApp API!"
  }'
```

Send to group:
```bash
curl -X POST http://localhost:3000/api/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "120363138187262687@g.us",
    "isGroup": true,
    "message": "Hello group!"
  }'
```

---

### 4. Send File

**POST** `/api/send-file`

Send a file (image, document, video, audio, etc.) with optional caption.

**Request Body:**
```json
{
  "phone": "5521999999999",
  "isGroup": false,
  "filename": "document.pdf",
  "caption": "Here's the document you requested",
  "base64": "JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9Db..."
}
```

**Parameters:**
- `phone` (string, required): Phone number or group JID
- `isGroup` (boolean, required): `true` for groups, `false` for individuals
- `filename` (string, required): File name with extension (used for MIME type detection)
- `caption` (string, optional): Caption for the file
- `base64` (string, required): Base64-encoded file content

**Supported File Types:**
- **Images:** jpg, jpeg, png, gif, webp, bmp, svg
- **Documents:** pdf, doc, docx, xls, xlsx, ppt, pptx, txt, csv
- **Audio:** mp3, wav, ogg, m4a
- **Video:** mp4, avi, mov, wmv
- **Archives:** zip, rar, 7z

**Response:**
```json
{
  "success": true,
  "message": "File sent successfully",
  "data": {
    "messageId": "true_5521999999999@c.us_3EB0...",
    "to": "5521999999999",
    "isGroup": false,
    "filename": "document.pdf"
  }
}
```

**Examples:**

Send image with caption:
```bash
curl -X POST http://localhost:3000/api/send-file \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "5521999999999",
    "isGroup": false,
    "filename": "photo.jpg",
    "caption": "Check out this photo!",
    "base64": "/9j/4AAQSkZJRgABAQEAYABgAAD..."
  }'
```

Send PDF document:
```bash
# First, convert file to base64
base64 document.pdf > document.b64

# Then send it
curl -X POST http://localhost:3000/api/send-file \
  -H "Content-Type: application/json" \
  -d "{
    \"phone\": \"5521999999999\",
    \"isGroup\": false,
    \"filename\": \"document.pdf\",
    \"caption\": \"Important document\",
    \"base64\": \"$(cat document.b64)\"
  }"
```

**Notes:**
- Base64 data can include or exclude the data URI prefix (e.g., `data:image/png;base64,`)
- MIME type is automatically detected from file extension
- WhatsApp has file size limits (~100MB for media, ~16MB for documents)
- Videos require Chrome (not Chromium) for proper codec support

---

### 5. Logout

**POST** `/api/logout`

Logout from WhatsApp and destroy the session.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/logout
```

**Notes:**
- This destroys the session stored in `.wwebjs_auth/`
- You'll need to scan QR code again to authenticate
- Returns error if not currently authenticated

---

## 🔧 Configuration

### Environment Variables

- `PORT` - Server port (default: 3000)

### Session Storage

Sessions are stored in the `.wwebjs_auth/` directory using LocalAuth strategy. This means:
- ✅ Session persists between server restarts
- ✅ No need to scan QR code every time
- ⚠️ Not suitable for ephemeral filesystems (Heroku, AWS Lambda)
- 💡 For cloud deployments, consider switching to RemoteAuth with MongoDB/S3

## 📁 Project Structure

```
whatsapp-web-api/
├── src/
│   ├── index.ts              # Main server entry point
│   ├── client.ts             # WhatsApp client manager (singleton)
│   ├── routes/
│   │   ├── auth.ts           # QR and logout routes
│   │   ├── status.ts         # Connection status route
│   │   └── message.ts        # Send message & file routes
│   └── types/
│       └── index.ts          # TypeScript interfaces
├── .wwebjs_auth/             # Session storage (auto-created)
├── package.json
├── tsconfig.json
└── README.md
```

## 🧪 Testing the API

### 1. Start the Server
```bash
npm run dev
```

### 2. Authenticate
Open `http://localhost:3000/api/qr` in your browser and scan the QR code with WhatsApp on your phone.

### 3. Check Status
```bash
curl http://localhost:3000/api/status
```

### 4. Send a Test Message
```bash
curl -X POST http://localhost:3000/api/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "YOUR_PHONE_NUMBER",
    "isGroup": false,
    "message": "Test message from API"
  }'
```

## 🐛 Common Issues

### QR Code Not Loading
- Wait a few seconds for the client to initialize
- Check server logs for errors
- Try refreshing the QR code endpoint

### "Client is not ready" Error
- Ensure you've scanned the QR code successfully
- Check connection status at `/api/status`
- Server logs will show when client is ready

### Message Not Sending
- Verify phone number format (no + sign, no spaces)
- For groups, use complete group JID
- Check if the contact/group exists in your WhatsApp

### Session Issues
- Delete `.wwebjs_auth/` folder and re-authenticate
- Ensure write permissions for session directory

## 📚 Additional Resources

- [whatsapp-web.js Documentation](https://wwebjs.dev/)
- [whatsapp-web.js GitHub](https://github.com/pedroslopez/whatsapp-web.js)
- [Hono Documentation](https://hono.dev/)

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Remember:** This is an unofficial API. Use responsibly and at your own risk. Always comply with WhatsApp's Terms of Service.
