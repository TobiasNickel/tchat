#!/bin/bash

# Development server script
# This script starts both the frontend build (in watch mode) and a PHP server

echo "🚀 Starting development environment..."

# Check if we should use FrankenPHP or PHP built-in server
USE_FRANKENPHP=${USE_FRANKENPHP:-false}

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

# Start the appropriate server
if [ "$USE_FRANKENPHP" = "true" ]; then
  if [ -f "./frankenphp" ]; then
    echo "🐘 Starting FrankenPHP server on http://localhost:8000"
    ./frankenphp run --config ./Caddyfile &
    SERVER_PID=$!
  else
    echo "❌ FrankenPHP not found. Run './install-frankenphp.sh' first or set USE_FRANKENPHP=false"
    kill $FRONTEND_PID
    exit 1
  fi
else
  echo "🐘 Starting PHP built-in server on http://localhost:8000"
  cd build
  php -S localhost:8000 ../router.php &
  SERVER_PID=$!
  cd ..
fi

echo ""
echo "✅ Development server is running!"
echo "   Frontend: Building in watch mode"
echo "   Backend:  http://localhost:8000"
echo "   API:      http://localhost:8000/api/"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for all background processes
wait
