FROM node:20-slim

WORKDIR /app

# Copy the root package files for workspaces
COPY package*.json ./

# Copy the server and worker package files
COPY server/package*.json ./server/
COPY worker/package*.json ./worker/

# Install all dependencies (omitting dev dependencies for production)
RUN npm install --omit=dev

# Copy the actual source code
COPY server/ ./server/
COPY worker/ ./worker/

# Copy and set permissions for the startup script
COPY start.sh ./
RUN chmod +x start.sh

# Expose the API port
EXPOSE 3000

# Run both the API and the Worker via the shell script
CMD ["./start.sh"]
