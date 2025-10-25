#!/bin/bash

# Enhanced development server script with backend auto-sync
# Requires: watchexec (optional, for backend auto-reload)
# Install with: sudo apt install watchexec (Ubuntu) or brew install watchexec (macOS)

echo "🚀 Starting development environment with auto-reload..."

# Configuration
USE_FRANKENPHP=${USE_FRANKENPHP:-false}
WATCH_BACKEND=${WATCH_BACKEND:-true}

# Kill background processes on script exit
trap 'kill $(jobs -p) 2>/dev/null' EXIT

# Function to copy backend files
copy_backend() {
  mkdir -p ./build/api
  cp -r backend/api/* ./build/api/
  cp .htaccess ./build/ 2>/dev/null || true
  cp index.html ./build/ 2>/dev/null || true
}

# Start frontend build in watch mode
echo "📦 Starting frontend build in watch mode..."
cd frontend
bun build ./src/index.html \
  --outdir=../build \
  --sourcemap=internal \
  --target=browser \
  --watch \
  --define:process.env.NODE_ENV='\"development\"' &
FRONTEND_PID=$!
cd ..

# Wait for initial build
sleep 2

# Copy backend files initially
echo "📋 Copying backend files..."
copy_backend

# Start backend file watcher if watchexec is available and enabled
if [ "$WATCH_BACKEND" = "true" ] && command -v watchexec &> /dev/null; then
  echo "👀 Watching backend files for changes..."
  watchexec -w backend/api -w .htaccess -w index.html -e php,htaccess,html \
    --ignore "*.sqlite" \
    'mkdir -p ./build/api && cp -r backend/api/* ./build/api/ && cp .htaccess ./build/ 2>/dev/null; cp index.html ./build/ 2>/dev/null; echo "🔄 Backend files updated"' &
  WATCHER_PID=$!
elif [ "$WATCH_BACKEND" = "true" ]; then
  echo "⚠️  watchexec not found. Backend files won't auto-reload."
  echo "   Install with: sudo apt install watchexec (Linux) or brew install watchexec (macOS)"
  echo "   Or set WATCH_BACKEND=false to disable this warning"
fi

# Start the appropriate server
if [ "$USE_FRANKENPHP" = "true" ]; then
  if [ -f "./frankenphp" ]; then
    echo "🐘 Starting FrankenPHP server on http://localhost:8000"
    ./frankenphp php-server --root ./build --listen :8000 &
    SERVER_PID=$!
  else
    echo "❌ FrankenPHP not found. Run './install-frankenphp.sh' first or set USE_FRANKENPHP=false"
    kill $(jobs -p) 2>/dev/null
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
echo "   Backend:  $([ "$WATCH_BACKEND" = "true" ] && command -v watchexec &> /dev/null && echo "Auto-reloading enabled" || echo "Manual reload needed")"
echo "   Server:   http://localhost:8000"
echo "   API:      http://localhost:8000/api/"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for all background processes
wait
