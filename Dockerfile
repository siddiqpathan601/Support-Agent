# --- Stage 1: Build Frontend ---
FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend/ ./frontend/
# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1
# Force dynamic same-origin resolution for API/WS at runtime
ENV NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_WS_URL=""
RUN cd frontend && npm run build

# --- Stage 2: Final Runner ---
FROM python:3.11-slim
WORKDIR /app

# Install Node.js, Nginx, and system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    nginx \
    procps \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install backend Python dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend application source
COPY backend/ ./backend/
# Copy frontend source and build artifacts
COPY --from=frontend-builder /app/frontend/ ./frontend/

# Copy deployment configurations
COPY nginx.conf /etc/nginx/nginx.conf
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

# Expose port (Hugging Face default is 7860, but Koyeb/others use dynamic PORT env var)
EXPOSE 7860

# Run startup script
CMD ["./start.sh"]
