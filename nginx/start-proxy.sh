#!/bin/bash

# Script to start the Nginx proxy for local development

set -e

# Default values
PROXY_PORT=${PROXY_PORT:-5174}
ELSE_API_HOST=${ELSE_API_HOST:-localhost}
ELSE_API_PORT=${ELSE_API_PORT:-8001}
FRONTEND_HOST=${FRONTEND_HOST:-localhost}
FRONTEND_PORT=${FRONTEND_PORT:-5173}

# Change to script directory
cd "$(dirname "$0")"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Load .env if it exists
if [ -f .env ]; then
    echo "📋 Loading configuration from .env"
    export $(cat .env | grep -v '^#' | xargs)
fi

# Generate nginx.conf from template
echo "🔧 Generating nginx.conf from template..."
envsubst '${ELSE_API_HOST} ${ELSE_API_PORT} ${FRONTEND_HOST} ${FRONTEND_PORT} ${PROXY_PORT}' \
  < nginx.template.conf > nginx.conf

echo "✅ Configuration generated"
echo ""
echo "Configuration:"
echo "  - Proxy listening on: http://localhost:${PROXY_PORT}"
echo "  - Else API backend: ${ELSE_API_HOST}:${ELSE_API_PORT}"
echo "  - Frontend: ${FRONTEND_HOST}:${FRONTEND_PORT}"
echo ""

# Start docker-compose
echo "🚀 Starting Nginx proxy..."
docker-compose up -d

echo ""
echo "✅ Nginx proxy is running!"
echo ""
echo "Access your app at: http://localhost:${PROXY_PORT}"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down"

