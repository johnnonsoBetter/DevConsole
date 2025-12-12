# LiveKit Token Server

Production-ready token generation server for DevConsole video calls.

## Quick Deploy to Vultr

### 1. Build locally

```bash
cd token-server
npm install
npm run build
```

### 2. Create .env file on server

SSH into your Vultr server and create the env file:

```bash
ssh root@YOUR_VULTR_IP
mkdir -p /opt/token-server
cd /opt/token-server

cat > .env << 'EOF'
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
LIVEKIT_SERVER_URL=wss://your-project.livekit.cloud
PORT=3001
ALLOWED_ORIGINS=*
EOF

chmod 600 .env
```

### 3. Deploy with Docker

**Option A: Build on server**

```bash
# Copy files to server
scp -r token-server root@YOUR_VULTR_IP:/opt/

# SSH and build
ssh root@YOUR_VULTR_IP
cd /opt/token-server
npm install
npm run build

# Run with Docker
docker build -t token-server .
docker run -d \
  --name token-server \
  --restart unless-stopped \
  -p 3001:3001 \
  --env-file .env \
  token-server
```

**Option B: Run directly with Node**

```bash
ssh root@YOUR_VULTR_IP
cd /opt/token-server
npm install
npm run build
npm start
```

For background running:

```bash
# Install pm2
npm install -g pm2

# Start with pm2
pm2 start dist/server.js --name token-server
pm2 save
pm2 startup
```

### 4. Test the server

```bash
# Health check
curl http://YOUR_VULTR_IP:3001/health

# Create a room
curl -X POST http://YOUR_VULTR_IP:3001/api/livekit-token \
  -H "Content-Type: application/json" \
  -d '{"operation":"create","roomName":"test-room","participantName":"user1"}'
```

### 5. Update your extension

Update `src/lib/livekit/index.ts` to use your Vultr token server URL:

```typescript
const TOKEN_SERVER_URL = "http://YOUR_VULTR_IP:3001/api/livekit-token";
```

## Running Both Services (johnapp + token-server)

If johnapp is already running on port 3000, token-server runs on 3001 by default.

### With Docker Compose

Create `/opt/docker-compose.yml`:

```yaml
version: '3.8'
services:
  johnapp:
    build: ./johnapp
    restart: unless-stopped
    env_file: ./johnapp/.env
    network_mode: host
    
  token-server:
    build: ./token-server
    restart: unless-stopped
    ports:
      - "3001:3001"
    env_file: ./token-server/.env
```

Then:
```bash
docker-compose up -d
```

## API Endpoints

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-12T...",
  "configured": true
}
```

### POST /api/livekit-token
Generate a token for video calls.

**Create Room:**
```json
{
  "operation": "create",
  "roomName": "my-room",
  "participantName": "John",
  "raindropApiKey": "optional-for-memory"
}
```

**Join Room:**
```json
{
  "operation": "join",
  "roomName": "my-room",
  "participantName": "Jane"
}
```

**Response:**
```json
{
  "token": "eyJ...",
  "serverUrl": "wss://your-project.livekit.cloud"
}
```
