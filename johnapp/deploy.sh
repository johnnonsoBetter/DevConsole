#!/bin/bash
# deploy.sh - Build and deploy johnapp transcriber to Vultr
# Usage: ./deploy.sh [command]
# Commands:
#   build    - Build Docker image locally
#   push     - Push to Docker Hub (requires docker login)
#   deploy   - Deploy to remote server via SSH
#   all      - Build, push, and deploy

set -e

# Configuration - Update these values
DOCKER_IMAGE="johnapp-transcriber"
DOCKER_TAG="latest"
DOCKER_REGISTRY=""  # e.g., "yourusername" for Docker Hub, or "sjc.vultrcr.com/registry-name"
REMOTE_HOST="root@108.61.252.153"      # e.g., "root@YOUR_VULTR_IP"
REMOTE_APP_DIR="/opt/johnapp"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_config() {
    local missing=0
    
    if [ -z "$DOCKER_REGISTRY" ]; then
        log_warn "DOCKER_REGISTRY not set. Edit this script to configure."
        missing=1
    fi
    
    if [ -z "$REMOTE_HOST" ]; then
        log_warn "REMOTE_HOST not set. Edit this script to configure."
        missing=1
    fi
    
    return $missing
}

build() {
    log_info "Building Docker image: ${DOCKER_IMAGE}:${DOCKER_TAG} (linux/amd64)"
    
    # Get script directory (johnapp folder)
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    cd "$SCRIPT_DIR"
    
    # Build for linux/amd64 to match Vultr server architecture
    docker build --platform linux/amd64 -t "${DOCKER_IMAGE}:${DOCKER_TAG}" .
    
    log_info "Build complete!"
}

push() {
    if [ -z "$DOCKER_REGISTRY" ]; then
        log_error "DOCKER_REGISTRY not configured. Please edit deploy.sh"
        exit 1
    fi
    
    local full_image="${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${DOCKER_TAG}"
    
    log_info "Tagging image as ${full_image}"
    docker tag "${DOCKER_IMAGE}:${DOCKER_TAG}" "${full_image}"
    
    log_info "Pushing to registry..."
    docker push "${full_image}"
    
    log_info "Push complete!"
}

deploy() {
    if [ -z "$REMOTE_HOST" ]; then
        log_error "REMOTE_HOST not configured. Please edit deploy.sh"
        exit 1
    fi
    
    if [ -z "$DOCKER_REGISTRY" ]; then
        log_error "DOCKER_REGISTRY not configured. Please edit deploy.sh"
        exit 1
    fi
    
    local full_image="${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${DOCKER_TAG}"
    
    log_info "Deploying to ${REMOTE_HOST}..."
    
    ssh "${REMOTE_HOST}" << EOF
        set -e
        echo "Pulling latest image..."
        docker pull ${full_image}
        
        echo "Stopping current container..."
        docker stop ${DOCKER_IMAGE} 2>/dev/null || true
        docker rm ${DOCKER_IMAGE} 2>/dev/null || true
        
        echo "Starting new container..."
        docker run -d \\
            --name ${DOCKER_IMAGE} \\
            --restart unless-stopped \\
            --env-file ${REMOTE_APP_DIR}/.env \\
            ${full_image}
        
        echo "Deployment complete!"
        docker ps | grep ${DOCKER_IMAGE} || true
EOF
    
    log_info "Deployment complete!"
}

transfer() {
    # Transfer image directly without registry (for testing or small deployments)
    if [ -z "$REMOTE_HOST" ]; then
        log_error "REMOTE_HOST not configured. Please edit deploy.sh"
        exit 1
    fi
    
    # Build for the correct platform first
    build
    
    log_info "Saving Docker image..."
    docker save "${DOCKER_IMAGE}:${DOCKER_TAG}" | gzip > /tmp/johnapp-image.tar.gz
    
    log_info "Transferring to ${REMOTE_HOST}..."
    scp /tmp/johnapp-image.tar.gz "${REMOTE_HOST}:${REMOTE_APP_DIR}/"
    
    log_info "Loading image on remote server..."
    ssh "${REMOTE_HOST}" << EOF
        cd ${REMOTE_APP_DIR}
        gunzip -c johnapp-image.tar.gz | docker load
        rm johnapp-image.tar.gz
        
        echo "Restarting container..."
        docker stop ${DOCKER_IMAGE} 2>/dev/null || true
        docker rm ${DOCKER_IMAGE} 2>/dev/null || true
        docker run -d \\
            --name ${DOCKER_IMAGE} \\
            --restart unless-stopped \\
            --env-file ${REMOTE_APP_DIR}/.env \\
            ${DOCKER_IMAGE}:${DOCKER_TAG}
        
        docker ps | grep ${DOCKER_IMAGE}
EOF
    
    rm /tmp/johnapp-image.tar.gz
    log_info "Transfer and deployment complete!"
}

logs() {
    if [ -z "$REMOTE_HOST" ]; then
        log_error "REMOTE_HOST not configured. Please edit deploy.sh"
        exit 1
    fi
    
    ssh "${REMOTE_HOST}" "docker logs -f ${DOCKER_IMAGE}"
}

status() {
    if [ -z "$REMOTE_HOST" ]; then
        log_error "REMOTE_HOST not configured. Please edit deploy.sh"
        exit 1
    fi
    
    ssh "${REMOTE_HOST}" "docker ps -a | grep ${DOCKER_IMAGE} || echo 'Container not found'"
    ssh "${REMOTE_HOST}" "docker stats --no-stream ${DOCKER_IMAGE} 2>/dev/null || true"
}

setup_remote() {
    if [ -z "$REMOTE_HOST" ]; then
        log_error "REMOTE_HOST not configured. Please edit deploy.sh"
        exit 1
    fi
    
    log_info "Setting up remote server..."
    
    ssh "${REMOTE_HOST}" << 'EOF'
        set -e
        
        # Install Docker if not present
        if ! command -v docker &> /dev/null; then
            echo "Installing Docker..."
            curl -fsSL https://get.docker.com | sh
            systemctl enable docker
            systemctl start docker
        fi
        
        # Create app directory
        mkdir -p /opt/johnapp
        
        echo "Setup complete!"
        echo "Don't forget to create /opt/johnapp/.env with your LiveKit credentials"
EOF
    
    log_info "Remote setup complete!"
}

show_help() {
    echo "Usage: ./deploy.sh [command]"
    echo ""
    echo "Commands:"
    echo "  build        Build Docker image locally"
    echo "  push         Push image to container registry"
    echo "  deploy       Deploy to remote server (pulls from registry)"
    echo "  transfer     Build and transfer image directly (no registry)"
    echo "  all          Build, push, and deploy"
    echo "  logs         View remote container logs"
    echo "  status       Check remote container status"
    echo "  setup        Set up remote server (install Docker)"
    echo "  help         Show this help message"
    echo ""
    echo "Configuration (edit this script):"
    echo "  DOCKER_REGISTRY: ${DOCKER_REGISTRY:-'(not set)'}"
    echo "  REMOTE_HOST:     ${REMOTE_HOST:-'(not set)'}"
    echo "  REMOTE_APP_DIR:  ${REMOTE_APP_DIR}"
}

# Main
case "${1:-help}" in
    build)
        build
        ;;
    push)
        push
        ;;
    deploy)
        deploy
        ;;
    transfer)
        build
        transfer
        ;;
    all)
        build
        push
        deploy
        ;;
    logs)
        logs
        ;;
    status)
        status
        ;;
    setup)
        setup_remote
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
