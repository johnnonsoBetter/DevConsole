#!/bin/bash
# deploy-token-server.sh - Deploy token server to Vultr
#
# Usage: ./deploy-token-server.sh <vultr-ip>

set -e

VULTR_IP=${1:-"YOUR_VULTR_IP"}
REMOTE_HOST="root@$VULTR_IP"
REMOTE_DIR="/opt/token-server"

echo "================================================"
echo "🚀 Deploying Token Server to Vultr"
echo "   Server: $VULTR_IP"
echo "================================================"

# Check if IP is set
if [ "$VULTR_IP" == "YOUR_VULTR_IP" ]; then
    echo "❌ Error: Please provide your Vultr IP address"
    echo "   Usage: ./deploy-token-server.sh <vultr-ip>"
    exit 1
fi

# Step 1: Build locally
echo ""
echo "📦 Building token server..."
cd "$(dirname "$0")/token-server"
npm install
npm run build

# Step 2: Create remote directory
echo ""
echo "📁 Setting up remote directory..."
ssh $REMOTE_HOST "mkdir -p $REMOTE_DIR"

# Step 3: Copy files
echo ""
echo "📤 Copying files to server..."
scp -r package*.json dist $REMOTE_HOST:$REMOTE_DIR/

# Step 4: Install dependencies on server
echo ""
echo "📥 Installing dependencies on server..."
ssh $REMOTE_HOST "cd $REMOTE_DIR && npm install --only=production"

# Step 5: Check for .env file
echo ""
echo "🔐 Checking environment configuration..."
ssh $REMOTE_HOST "test -f $REMOTE_DIR/.env" && ENV_EXISTS=1 || ENV_EXISTS=0

if [ $ENV_EXISTS -eq 0 ]; then
    echo ""
    echo "⚠️  No .env file found on server!"
    echo "   Please create $REMOTE_DIR/.env with:"
    echo ""
    echo "   LIVEKIT_API_KEY=your-api-key"
    echo "   LIVEKIT_API_SECRET=your-api-secret"
    echo "   LIVEKIT_SERVER_URL=wss://your-project.livekit.cloud"
    echo "   PORT=3001"
    echo "   ALLOWED_ORIGINS=*"
    echo ""
    echo "   Then run: ssh $REMOTE_HOST 'cd $REMOTE_DIR && pm2 restart token-server || pm2 start dist/server.js --name token-server'"
    exit 0
fi

# Step 6: Restart with pm2
echo ""
echo "🔄 Restarting server..."
ssh $REMOTE_HOST "cd $REMOTE_DIR && pm2 restart token-server 2>/dev/null || pm2 start dist/server.js --name token-server"
ssh $REMOTE_HOST "pm2 save"

# Step 7: Verify
echo ""
echo "✅ Deployment complete!"
echo ""
echo "🧪 Testing health endpoint..."
sleep 2
curl -s http://$VULTR_IP:3001/health | head -c 200
echo ""
echo ""
echo "================================================"
echo "📋 Next Steps:"
echo "================================================"
echo ""
echo "1. Update your extension's .env file:"
echo "   VITE_LIVEKIT_TOKEN_SERVER_URL=http://$VULTR_IP:3001/api/livekit-token"
echo ""
echo "2. Rebuild your extension:"
echo "   npm run build"
echo ""
echo "3. Reload extension in Chrome"
echo ""
