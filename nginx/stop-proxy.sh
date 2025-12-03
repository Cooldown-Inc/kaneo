#!/bin/bash

# Script to stop the Nginx proxy

set -e

# Change to script directory
cd "$(dirname "$0")"

echo "🛑 Stopping Nginx proxy..."
docker-compose down

echo "✅ Nginx proxy stopped!"

