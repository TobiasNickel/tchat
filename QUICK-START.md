# TChat Development Setup - Quick Reference

## 🚀 Available Commands

### From project root:
```bash
./dev.sh              # Start dev server with PHP built-in server
./dev-watch.sh        # Same as above + auto-reload backend files (requires watchexec)
./build.sh            # Production build

# With FrankenPHP:
USE_FRANKENPHP=true ./dev.sh
./install-frankenphp.sh  # One-time setup for FrankenPHP
```

### From frontend directory:
```bash
cd frontend
bun run dev           # Start dev server (calls ../dev.sh)
bun run dev:watch     # Start with backend auto-reload
bun run dev:franken   # Start with FrankenPHP
bun run build:prod    # Production build
```

---

## 📁 File Structure

```
tchat/
├── frontend/              # React + Bun frontend
│   ├── src/              # Source files (auto-watched)
│   └── package.json      # Bun scripts
├── backend/              
│   └── api/              # PHP API files (copied to build/api/)
├── build/                # Build output (served by dev server)
├── dev.sh               # Development server script
├── dev-watch.sh         # Dev server + backend auto-reload
├── build.sh             # Production build script
├── router.php           # Dev server router for PHP built-in server
├── install-frankenphp.sh # FrankenPHP installer
└── .htaccess            # Apache rewrite rules (production)
```

---

## 🎯 Recommended Workflow

### First Time Setup:
```bash
# Install dependencies
cd frontend
bun install

# Choose your dev server:
# Option A: Use PHP built-in (already installed)
cd ..
./dev.sh

# Option B: Install FrankenPHP (single binary, ~50MB)
./install-frankenphp.sh
USE_FRANKENPHP=true ./dev.sh
```

### Daily Development:
```bash
# Start dev server
./dev.sh

# Edit files:
# - frontend/src/* → Auto-rebuilds
# - backend/api/* → Restart dev.sh or use dev-watch.sh

# When done, build for production
./build.sh
```

---

## 🔍 What Each Solution Provides

### 1. PHP Built-in Server (dev.sh)
✅ No installation needed  
✅ Simple and reliable  
✅ Frontend auto-rebuild  
⚠️ Backend needs manual restart  
⚠️ Slower than FrankenPHP  

**Best for:** Quick start, minimal setup

### 2. PHP Built-in + watchexec (dev-watch.sh)
✅ Everything from option 1  
✅ **Backend auto-reload**  
⚠️ Requires watchexec installation  

**Best for:** Active backend development

### 3. FrankenPHP (USE_FRANKENPHP=true)
✅ Single binary, portable  
✅ Better performance  
✅ Modern PHP features  
✅ Frontend auto-rebuild  
⚠️ ~50MB download  
⚠️ Backend needs manual restart (or use with watchexec)  

**Best for:** Team consistency, better performance

---

## 📦 Production Deployment

```bash
# Build
./build.sh

# Upload build/ directory to your webhost
# The .htaccess handles routing for Apache/LiteSpeed
# For Nginx, configure rewrites in your server config
```

---

## 🤔 Which Setup Should You Choose?

**Just getting started?**  
→ Use `./dev.sh` (PHP built-in server)

**Actively developing backend?**  
→ Use `./dev-watch.sh` (requires watchexec)

**Want best performance or portable setup?**  
→ Install FrankenPHP with `./install-frankenphp.sh`

**Working in a team?**  
→ FrankenPHP gives everyone the same environment

---

## 🔧 Configuration

All scripts use these defaults:
- **Port:** 8000
- **Build dir:** ./build/
- **Source maps:** Enabled in dev, external
- **Watch mode:** Enabled for frontend

Change port in dev.sh:
```bash
# Line ~50-60, change :8000 to your port
```

---

## 💡 Tips

1. **Backend changes:** With `dev.sh`, restart the script. With `dev-watch.sh`, changes auto-copy.
2. **Frontend changes:** Always auto-rebuild (2-3 seconds)
3. **Database:** Created at `build/api/tchat.sqlite` on first use
4. **Hot reload:** Not supported, refresh browser after changes
5. **Production ready:** Run `./build.sh` before deploying

---

## 📚 More Info

See `DEV-SETUP.md` for detailed documentation.
