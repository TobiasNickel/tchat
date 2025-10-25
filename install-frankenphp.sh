#!/bin/bash

# Install FrankenPHP standalone binary for development
# This downloads a single executable file that includes PHP + web server

echo "🐘 Installing FrankenPHP..."

# Detect OS and architecture
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

# Map architecture names
case "$ARCH" in
    x86_64)
        ARCH="x86_64"
        ;;
    aarch64|arm64)
        ARCH="aarch64"
        ;;
    *)
        echo "❌ Unsupported architecture: $ARCH"
        exit 1
        ;;
esac

# Determine download URL
if [ "$OS" = "linux" ]; then
    if [ "$ARCH" = "x86_64" ]; then
        URL="https://github.com/dunglas/frankenphp/releases/latest/download/frankenphp-linux-x86_64"
    elif [ "$ARCH" = "aarch64" ]; then
        URL="https://github.com/dunglas/frankenphp/releases/latest/download/frankenphp-linux-aarch64"
    fi
elif [ "$OS" = "darwin" ]; then
    if [ "$ARCH" = "x86_64" ]; then
        URL="https://github.com/dunglas/frankenphp/releases/latest/download/frankenphp-mac-x86_64"
    elif [ "$ARCH" = "aarch64" ]; then
        URL="https://github.com/dunglas/frankenphp/releases/latest/download/frankenphp-mac-aarch64"
    fi
else
    echo "❌ Unsupported OS: $OS"
    echo "For Windows, download from: https://github.com/dunglas/frankenphp/releases"
    exit 1
fi

# Download FrankenPHP
echo "📥 Downloading from $URL..."
curl -L -o frankenphp "$URL"

# Make executable
chmod +x frankenphp

echo ""
echo "✅ FrankenPHP installed successfully!"
echo "   Location: ./frankenphp"
echo "   Size: $(du -h frankenphp | cut -f1)"
echo ""
echo "To use FrankenPHP, run: USE_FRANKENPHP=true ./dev.sh"
echo ""
echo "Note: Add 'frankenphp' to your .gitignore if you don't want to commit it"
