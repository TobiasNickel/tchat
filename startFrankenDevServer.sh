#!/bin/bash

# FrankenPHP Development Server Script
# This script starts both the frontend build (in watch mode) and FrankenPHP server

echo "🚀 Starting FrankenPHP development environment..."

# Check if FrankenPHP is installed
if [ ! -f "./frankenphp" ]; then
  echo "❌ FrankenPHP not found. Run './install-frankenphp.sh' first"
  exit 1
fi

# Kill background processes on script exit
trap 'kill $(jobs -p) 2>/dev/null' EXIT

# Start frontend build in watch mode
echo "📦 Starting frontend build in watch mode..."
cd frontend
bun build ./src/index.html \
  --outdir=../build \
  --sourcemap=external \
  --target=browser \
  --watch \
  --define:process.env.NODE_ENV='\"development\"' &
FRONTEND_PID=$!
cd ..

# Wait a bit for initial build
sleep 2

# Copy backend files
echo "📋 Copying backend files..."
mkdir -p ./build/api
cp -r backend/api/* ./build/api/
cp .htaccess ./build/
cp index.html ./build/

# Start FrankenPHP server
echo "🐘 Starting FrankenPHP server on http://localhost:8000"
./frankenphp php-server --root ./build --listen :8000 &
SERVER_PID=$!

echo ""
echo "✅ FrankenPHP development server is running!"
echo "   Frontend: Building in watch mode"
echo "   Backend:  http://localhost:8000"
echo "   API:      http://localhost:8000/api/"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for all background processes
wait
