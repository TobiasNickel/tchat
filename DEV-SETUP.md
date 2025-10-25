# Development Setup Guide

This project uses **Bun** for frontend builds and **PHP** for the backend API. Here are your options for local development:

## 🚀 Quick Start (Recommended)

### Option 1: PHP Built-in Server (Simplest)
No installation needed if you already have PHP:

```bash
./dev.sh
```

This will:
- Start Bun in watch mode to rebuild frontend on changes
- Start PHP's built-in server on `http://localhost:8000`
- Auto-copy backend files to the build directory

### Option 2: FrankenPHP (Modern, Single Binary)
FrankenPHP is a modern PHP application server in a single executable:

```bash
# Install FrankenPHP (one-time setup, ~50MB download)
./install-frankenphp.sh

# Start dev server with FrankenPHP
USE_FRANKENPHP=true ./dev.sh
```

**Benefits of FrankenPHP:**
- Single binary, no dependencies
- Better performance than PHP built-in server
- Modern PHP features
- Easier to distribute

---

## 📋 How It Works

### Development Mode (`./dev.sh`)
1. Bun watches your frontend source files (`frontend/src/`)
2. On changes, it rebuilds to `./build/`
3. PHP server serves files from `./build/`
4. Backend PHP files are copied from `backend/api/` to `build/api/`

### Production Build (`./build.sh`)
Creates an optimized production build with minification:
```bash
./build.sh
```

Upload the contents of `./build/` to your webhost.

---

## 🛠️ Development Workflow

1. **Start the dev server:**
   ```bash
   ./dev.sh
   ```

2. **Edit your files:**
   - Frontend: `frontend/src/*` - Auto-rebuilds on save
   - Backend: `backend/api/*` - Restart `dev.sh` to see changes
   - Styles: `frontend/src/index.css` - Auto-rebuilds on save

3. **Access your app:**
   - Frontend: http://localhost:8000
   - API: http://localhost:8000/api/
   - Database config: http://localhost:8000/api/config.php

4. **Stop the server:**
   Press `Ctrl+C` to stop all services

---

## 🔄 Backend File Changes

Currently, backend PHP files are copied once when `dev.sh` starts. If you edit backend files, you need to restart the dev server or manually copy them:

```bash
# Manual copy without restarting
cp -r backend/api/* ./build/api/
```

**Optional Enhancement:** If you want auto-reload for backend files, you can install `entr` or `watchexec` and modify `dev.sh`.

---

## 🌐 Deployment

The production build works on:
- ✅ Apache with mod_rewrite (uses `.htaccess`)
- ✅ Nginx with PHP-FPM (configure rewrites in nginx.conf)
- ✅ Most shared hosting providers

The `.htaccess` file handles:
- Serving static files directly
- Routing API requests to PHP
- SPA fallback to `index.html`

---

## 📦 What Gets Built

**Development (`./build/`):**
- Frontend files with source maps
- Unminified code
- Development environment variables

**Production (`./build.sh`):**
- Minified JavaScript and CSS
- Hashed filenames for cache busting
- Optimized for production

---

## 🐘 FrankenPHP vs PHP Built-in Server

| Feature | PHP Built-in | FrankenPHP |
|---------|-------------|------------|
| Installation | Already installed | One-time download |
| Size | Varies | ~50MB single file |
| Performance | Adequate for dev | Better |
| Production-ready | ❌ No | ⚠️ Yes (but not needed for your hosting) |
| Ease of use | ✅ Simple | ✅ Very simple |
| Dependencies | System PHP | None (standalone) |

**Recommendation:** Start with PHP built-in server. Only install FrankenPHP if you want the convenience of a single binary or slightly better dev server performance.

---

## 🔧 Customization

### Change the dev server port

Edit `dev.sh` and change `:8000` to your preferred port:
```bash
# For FrankenPHP
./frankenphp php-server --root ./build --listen :3000

# For PHP built-in server
php -S localhost:3000 ../router.php
```

### Enable backend auto-reload with watchexec

Install watchexec:
```bash
# Ubuntu/Debian
sudo apt install watchexec

# macOS
brew install watchexec
```

Then modify `dev.sh` to add backend watching (I can help with this if needed).

---

## 📝 Notes

- **Frontend hot reloading:** Not currently supported. Browser refresh needed after changes.
- **Backend changes:** Require manual copy or dev server restart.
- **Database:** SQLite file is created in `build/api/tchat.sqlite` on first config.
- **BASE_PATH:** Configured in `config.php` for subdirectory deployments.

---

## 🆘 Troubleshooting

**Port already in use:**
```bash
# Find what's using port 8000
lsof -i :8000

# Kill the process
kill -9 <PID>
```

**Bun command not found:**
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash
```

**PHP command not found:**
```bash
# Ubuntu/Debian
sudo apt install php php-sqlite3

# macOS
brew install php
```

**FrankenPHP download fails:**
Manually download from: https://github.com/dunglas/frankenphp/releases
