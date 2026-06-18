#!/bin/bash

# Default port to 7860 if not specified (Hugging Face Spaces default)
TARGET_PORT=${PORT:-7860}
echo "Starting services on port $TARGET_PORT..."

# Replace LISTEN_PORT placeholder in Nginx config with the actual target port
sed -i "s/LISTEN_PORT/$TARGET_PORT/g" /etc/nginx/nginx.conf

# Start Nginx in background
nginx -g "daemon off;" &
NGINX_PID=$!

# Start FastAPI backend (force to run on local port 8000 to avoid conflicts)
echo "Starting FastAPI backend on port 8000..."
PORT=8000 python -m backend.main &
BACKEND_PID=$!

# Start Next.js frontend (force to run on local port 3000)
echo "Starting Next.js frontend on port 3000..."
npm run start --prefix frontend -- --port 3000 &
FRONTEND_PID=$!

# Handle shutdown gracefully
cleanup() {
    echo "Shutting down services..."
    kill $NGINX_PID
    kill $BACKEND_PID
    kill $FRONTEND_PID
    exit 0
}

trap cleanup SIGINT SIGTERM

# Keep script running and monitor processes
wait -n

# If any process dies, exit script (which restarts the container)
exit 1
