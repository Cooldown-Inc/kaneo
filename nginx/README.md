# Nginx Reverse Proxy

This directory contains the Nginx configuration for proxying requests in development.

## What It Does

The Nginx proxy handles:
- **`/else-proxy/*`** → Forwards to the Else API backend
- **Everything else** → Forwards to the frontend (Vite dev server)

This includes:
- ✅ HTTP requests
- ✅ WebSocket connections
- ✅ Static assets
- ✅ CORS headers
- ✅ Streaming responses

## Setup

### Option 1: Using Docker (Recommended)

1. Copy the environment example:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` to match your setup:
   ```bash
   PROXY_PORT=5174
   ELSE_API_HOST=localhost
   ELSE_API_PORT=8001
   FRONTEND_HOST=localhost
   FRONTEND_PORT=5173
   ```

3. Start the proxy:
   ```bash
   docker-compose up -d
   ```

4. Access your app at: `http://localhost:5174`

5. Stop the proxy:
   ```bash
   docker-compose down
   ```

### Option 2: Using Local Nginx

1. Install Nginx:
   ```bash
   # macOS
   brew install nginx
   
   # Ubuntu/Debian
   sudo apt-get install nginx
   ```

2. Generate the config from template:
   ```bash
   # Set your environment variables
   export ELSE_API_HOST=localhost
   export ELSE_API_PORT=8001
   export FRONTEND_HOST=localhost
   export FRONTEND_PORT=5173
   export PROXY_PORT=8080
   
   # Generate config
   envsubst '${ELSE_API_HOST} ${ELSE_API_PORT} ${FRONTEND_HOST} ${FRONTEND_PORT} ${PROXY_PORT}' \
     < nginx.template.conf > nginx.conf
   ```

3. Run Nginx:
   ```bash
   nginx -c $(pwd)/nginx.conf -p $(pwd)
   ```

4. Stop Nginx:
   ```bash
   nginx -s stop -c $(pwd)/nginx.conf -p $(pwd)
   ```

## Architecture

```
Browser
   │
   ├─ /else-proxy/*  ──→  Nginx (port 5174)  ──→  Else API (port 8001)
   │
   └─ /*             ──→  Nginx (port 5174)  ──→  Frontend (port 5173)
```

## Logs

View logs:
```bash
# Docker
docker-compose logs -f

# Local nginx
tail -f logs/access.log logs/error.log
```

## Configuration

The `nginx.conf` file contains the proxy configuration with:

- **WebSocket support** for real-time connections
- **CORS headers** for cross-origin requests
- **Compression** (gzip) for better performance
- **Timeouts** configured for long-running requests
- **Buffering disabled** for streaming responses

## Troubleshooting

### Port already in use
Change `PROXY_PORT` in `.env` to a different port.

### Can't connect to localhost from Docker
Use `host.docker.internal` instead of `localhost` for `ELSE_API_HOST` and `FRONTEND_HOST`.

### Nginx won't start
Check logs with:
```bash
docker-compose logs nginx
```

Or test the config:
```bash
nginx -t -c $(pwd)/nginx.conf
```

