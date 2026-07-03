#!/bin/sh

# Start the worker process in the background
echo "Starting Background Worker..."
cd /app/worker && npm start &

# Start the Express API server in the foreground
echo "Starting API Server..."
cd /app/server && npm start
