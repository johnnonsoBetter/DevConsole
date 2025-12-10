# Deploying LiveKit Transcriber Agent to Vultr Cloud

This guide covers deploying the `johnapp` LiveKit transcription agent to Vultr cloud infrastructure.

## Deployment Options

Vultr offers several deployment options:

| Option | Best For | Cost | Complexity |
|--------|----------|------|------------|
| **VPS + Docker** | Simple, full control | ~$6-24/mo | Medium |
| **Vultr Kubernetes (VKE)** | Scalable, production | ~$20+/mo | High |
| **Vultr Container Registry + VPS** | CI/CD workflows | ~$10+/mo | Medium |

This guide focuses on **VPS + Docker** as the simplest and most cost-effective approach.

---

## Prerequisites

1. **Vultr Account**: Sign up at [vultr.com](https://www.vultr.com/)
2. **LiveKit Cloud Credentials**: From [cloud.livekit.io](https://cloud.livekit.io/)
   - `LIVEKIT_URL`
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`
3. **SSH Key**: For secure server access
4. **Docker installed locally** (for building images)

---

## Option 1: VPS with Docker (Recommended)

### Step 1: Create a Vultr VPS

1. Log in to [Vultr Dashboard](https://my.vultr.com/)
2. Click **Deploy New Server**
3. Choose configuration:

   | Setting | Recommended Value |
   |---------|-------------------|
   | **Type** | Cloud Compute - Shared CPU |
   | **Location** | Choose closest to your users |
   | **OS** | Ubuntu 24.04 LTS or Docker (Marketplace) |
   | **Plan** | 2 vCPU / 4GB RAM (~$24/mo) for production |
   | **SSH Key** | Add your public SSH key |
   | **Hostname** | `johnapp-transcriber` |

   > **Tip**: For testing, 1 vCPU / 2GB (~$12/mo) works, but transcription is CPU-intensive.

4. Click **Deploy Now** and wait for the server to be ready

### Step 2: Connect to Your Server

```bash
# Get your server IP from Vultr dashboard
ssh root@YOUR_SERVER_IP
```

### Step 3: Install Docker (if using Ubuntu)

If you chose Ubuntu instead of the Docker marketplace image:

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Enable Docker to start on boot
systemctl enable docker
systemctl start docker

# Verify installation
docker --version
```

### Step 4: Set Up the Application

```bash
# Create app directory
mkdir -p /opt/johnapp
cd /opt/johnapp

# Create environment file
cat > .env << 'EOF'
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
NODE_ENV=production
EOF

# Secure the env file
chmod 600 .env
```

### Step 5: Build and Push Docker Image

**Option A: Build on the Server**

```bash
# Clone or copy your project to the server
# If using git:
apt install git -y
git clone https://github.com/yourusername/johnapp.git /opt/johnapp/src
cd /opt/johnapp/src

# Build the image
docker build -t johnapp-transcriber:latest .
```

**Option B: Build Locally and Transfer**

On your local machine:
```bash
# Build the image
cd /path/to/johnapp
docker build -t johnapp-transcriber:latest .

# Save image to file
docker save johnapp-transcriber:latest | gzip > johnapp-transcriber.tar.gz

# Transfer to server
scp johnapp-transcriber.tar.gz root@YOUR_SERVER_IP:/opt/johnapp/

# On the server, load the image
ssh root@YOUR_SERVER_IP
cd /opt/johnapp
gunzip -c johnapp-transcriber.tar.gz | docker load
```

**Option C: Use a Container Registry**

Push to Docker Hub, GitHub Container Registry, or Vultr Container Registry:

```bash
# Example with Docker Hub
docker login
docker tag johnapp-transcriber:latest yourusername/johnapp-transcriber:latest
docker push yourusername/johnapp-transcriber:latest

# On the server
docker pull yourusername/johnapp-transcriber:latest
```

### Step 6: Run the Container

```bash
cd /opt/johnapp

# Run the container
docker run -d \
  --name johnapp-transcriber \
  --restart unless-stopped \
  --env-file .env \
  johnapp-transcriber:latest
```

### Step 7: Verify Deployment

```bash
# Check container is running
docker ps

# View logs
docker logs -f johnapp-transcriber

# You should see:
# [info] Starting agent worker...
# [info] Connected to LiveKit server
```

### Step 8: Set Up Auto-Restart on Boot

Docker's `--restart unless-stopped` handles this, but for extra reliability:

```bash
# Create systemd service
cat > /etc/systemd/system/johnapp.service << 'EOF'
[Unit]
Description=JohnApp LiveKit Transcriber
After=docker.service
Requires=docker.service

[Service]
Type=simple
Restart=always
RestartSec=10
ExecStart=/usr/bin/docker start -a johnapp-transcriber
ExecStop=/usr/bin/docker stop johnapp-transcriber

[Install]
WantedBy=multi-user.target
EOF

# Enable the service
systemctl daemon-reload
systemctl enable johnapp
```

---

## Option 2: Using Docker Compose

For easier management, use Docker Compose:

### On the Server

```bash
# Install Docker Compose plugin (if not present)
apt install docker-compose-plugin -y

# Create docker-compose.yml
cd /opt/johnapp
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  transcriber:
    build: ./src
    # Or use pre-built image:
    # image: yourusername/johnapp-transcriber:latest
    container_name: johnapp-transcriber
    restart: unless-stopped
    env_file:
      - .env
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
EOF

# Start the service
docker compose up -d

# View logs
docker compose logs -f
```

---

## Option 3: Vultr Container Registry

Vultr offers a private container registry for $5/mo base + storage:

1. **Create Registry**: Vultr Dashboard → Products → Container Registry → Add Registry
2. **Authenticate**:
   ```bash
   docker login sjc.vultrcr.com/your-registry-name -u YOUR_USERNAME -p YOUR_PASSWORD
   ```
3. **Push Image**:
   ```bash
   docker tag johnapp-transcriber:latest sjc.vultrcr.com/your-registry-name/johnapp-transcriber:latest
   docker push sjc.vultrcr.com/your-registry-name/johnapp-transcriber:latest
   ```
4. **Pull on Server**:
   ```bash
   docker login sjc.vultrcr.com/your-registry-name -u YOUR_USERNAME -p YOUR_PASSWORD
   docker pull sjc.vultrcr.com/your-registry-name/johnapp-transcriber:latest
   ```

---

## Management Commands

```bash
# View running containers
docker ps

# View logs (live)
docker logs -f johnapp-transcriber

# View last 100 lines
docker logs --tail 100 johnapp-transcriber

# Restart container
docker restart johnapp-transcriber

# Stop container
docker stop johnapp-transcriber

# Remove and recreate
docker rm johnapp-transcriber
docker run -d --name johnapp-transcriber --restart unless-stopped --env-file .env johnapp-transcriber:latest

# Update image and restart
docker pull yourusername/johnapp-transcriber:latest
docker stop johnapp-transcriber
docker rm johnapp-transcriber
docker run -d --name johnapp-transcriber --restart unless-stopped --env-file .env yourusername/johnapp-transcriber:latest
```

---

## Updating the Agent

### Manual Update

```bash
cd /opt/johnapp

# If building on server
cd src && git pull && docker build -t johnapp-transcriber:latest .
cd .. && docker stop johnapp-transcriber && docker rm johnapp-transcriber
docker run -d --name johnapp-transcriber --restart unless-stopped --env-file .env johnapp-transcriber:latest

# If using registry
docker pull yourusername/johnapp-transcriber:latest
docker stop johnapp-transcriber && docker rm johnapp-transcriber
docker run -d --name johnapp-transcriber --restart unless-stopped --env-file .env yourusername/johnapp-transcriber:latest
```

### Automated CI/CD

Create a deploy script on the server:

```bash
cat > /opt/johnapp/deploy.sh << 'EOF'
#!/bin/bash
set -e

cd /opt/johnapp

echo "Pulling latest image..."
docker pull yourusername/johnapp-transcriber:latest

echo "Stopping current container..."
docker stop johnapp-transcriber || true
docker rm johnapp-transcriber || true

echo "Starting new container..."
docker run -d \
  --name johnapp-transcriber \
  --restart unless-stopped \
  --env-file .env \
  yourusername/johnapp-transcriber:latest

echo "Deployment complete!"
docker ps | grep johnapp
EOF

chmod +x /opt/johnapp/deploy.sh
```

---

## Monitoring & Health Checks

### Basic Monitoring

```bash
# Create a health check script
cat > /opt/johnapp/health-check.sh << 'EOF'
#!/bin/bash
if docker ps | grep -q johnapp-transcriber; then
    echo "Container is running"
    exit 0
else
    echo "Container is NOT running - restarting..."
    docker start johnapp-transcriber
    exit 1
fi
EOF

chmod +x /opt/johnapp/health-check.sh

# Add to crontab (check every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/johnapp/health-check.sh >> /var/log/johnapp-health.log 2>&1") | crontab -
```

### Resource Monitoring

```bash
# Install htop for system monitoring
apt install htop -y

# View Docker container stats
docker stats johnapp-transcriber
```

---

## Security Recommendations

### 1. Configure Firewall

```bash
# Install and enable UFW
apt install ufw -y
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw enable
```

### 2. Secure SSH

```bash
# Edit SSH config
nano /etc/ssh/sshd_config

# Disable password auth (use SSH keys only)
PasswordAuthentication no
PermitRootLogin prohibit-password

# Restart SSH
systemctl restart sshd
```

### 3. Keep System Updated

```bash
# Enable automatic security updates
apt install unattended-upgrades -y
dpkg-reconfigure -plow unattended-upgrades
```

### 4. Protect Secrets

- Never commit `.env` to git
- Use Vultr's environment variables feature if available
- Consider using Docker secrets for production

---

## Cost Estimation

| Component | Monthly Cost |
|-----------|--------------|
| VPS (2 vCPU / 4GB) | ~$24 |
| VPS (1 vCPU / 2GB) | ~$12 |
| Bandwidth (included) | $0 |
| Container Registry (optional) | ~$5+ |
| **Total (basic)** | **$12-24/mo** |

> **Note**: LiveKit Cloud usage is billed separately based on participant minutes.

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs johnapp-transcriber

# Common issues:
# - Missing environment variables
# - Invalid LiveKit credentials
# - Network connectivity issues
```

### High CPU Usage

The transcription agent is CPU-intensive. If you see high CPU:
1. Consider upgrading to a larger VPS
2. Review the number of concurrent transcriptions
3. Check for memory issues: `docker stats`

### Connection Issues

```bash
# Test LiveKit connectivity
curl -I https://your-project.livekit.cloud

# Verify environment variables
docker exec johnapp-transcriber printenv | grep LIVEKIT
```

### Memory Issues

```bash
# Check memory usage
free -h
docker stats johnapp-transcriber

# Restart if memory leak suspected
docker restart johnapp-transcriber
```

---

## Quick Start Script

Save this as `setup-vultr.sh` and run on a fresh Ubuntu VPS:

```bash
#!/bin/bash
set -e

echo "=== Setting up JohnApp Transcriber ==="

# Install Docker
echo "Installing Docker..."
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Create app directory
mkdir -p /opt/johnapp
cd /opt/johnapp

# Prompt for credentials
read -p "Enter LIVEKIT_URL: " LIVEKIT_URL
read -p "Enter LIVEKIT_API_KEY: " LIVEKIT_API_KEY
read -sp "Enter LIVEKIT_API_SECRET: " LIVEKIT_API_SECRET
echo

# Create env file
cat > .env << EOF
LIVEKIT_URL=$LIVEKIT_URL
LIVEKIT_API_KEY=$LIVEKIT_API_KEY
LIVEKIT_API_SECRET=$LIVEKIT_API_SECRET
NODE_ENV=production
EOF
chmod 600 .env

echo ""
echo "=== Setup Complete ==="
echo "Next steps:"
echo "1. Build or pull your Docker image"
echo "2. Run: docker run -d --name johnapp-transcriber --restart unless-stopped --env-file .env johnapp-transcriber:latest"
```

---

## Support

- **LiveKit Docs**: https://docs.livekit.io/agents/
- **LiveKit Discord**: https://livekit.io/discord
- **Vultr Support**: https://my.vultr.com/support/
