# Multi-architecture WhatsApp Web API Dockerfile
# Supports AMD64 and ARM64

FROM node:18-bookworm-slim

# Set working directory
WORKDIR /app

# Install dependencies for Puppeteer and Chrome
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    libxshmfence-dev \
    libgbm-dev \
    unzip \
    fontconfig \
    locales \
    gconf-service \
    libappindicator1 \
    lsb-release \
    xdg-utils \
    libvips-dev \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Install Google Chrome based on architecture
RUN ARCH=$(dpkg --print-architecture) && \
    if [ "$ARCH" = "amd64" ]; then \
        wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && \
        apt-get update && \
        apt-get install -y ./google-chrome-stable_current_amd64.deb && \
        rm google-chrome-stable_current_amd64.deb; \
    elif [ "$ARCH" = "arm64" ]; then \
        wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_arm64.deb && \
        apt-get update && \
        apt-get install -y ./google-chrome-stable_current_arm64.deb && \
        rm google-chrome-stable_current_arm64.deb; \
    else \
        echo "Unsupported architecture: $ARCH" && exit 1; \
    fi && \
    rm -rf /var/lib/apt/lists/*

# Verify Chrome installation
RUN google-chrome --version

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy TypeScript config and source code
COPY tsconfig.json ./
COPY src ./src

# Install dev dependencies for build
RUN npm install --save-dev typescript tsx @types/node @types/qrcode

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Create non-root user
RUN useradd -m -u 1000 whatsapp && \
    chown -R whatsapp:whatsapp /app

# Create directory for session data
RUN mkdir -p /app/.wwebjs_auth && \
    chown -R whatsapp:whatsapp /app/.wwebjs_auth

# Switch to non-root user
USER whatsapp

# Environment variables
ENV NODE_ENV=production \
    CHROME_PATH=/usr/bin/google-chrome \
    PORT=21465

# Expose port
EXPOSE 21465

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 21465) + '/', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Start the application
CMD ["node", "dist/index.js"]
