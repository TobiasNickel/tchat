# Development Server Comparison

## Executive Summary

**For your use case (Bun frontend + PHP backend, deploying to shared hosting):**

🏆 **Recommended: PHP Built-in Server** (`./dev.sh`)
- Already installed, zero setup
- Perfect for development
- Matches your production environment

🥈 **Alternative: FrankenPHP** (if you want a single binary)
- One executable to rule them all
- Slightly better performance
- Portable across machines

---

## Detailed Comparison

| Feature | PHP Built-in | FrankenPHP | Node/Bun Server + Proxy |
|---------|-------------|------------|-------------------------|
| **Installation** | ✅ None (if PHP installed) | ⚠️ 50MB download | ⚠️ Extra npm packages |
| **Complexity** | ✅ Very simple | ✅ Very simple | ❌ More complex |
| **Portability** | ⚠️ Needs system PHP | ✅ Single file | ⚠️ Needs Node/Bun + packages |
| **Performance** | ⚠️ Adequate | ✅ Good | ✅ Good |
| **Dev vs Prod Parity** | ✅ Exact match | ⚠️ Different | ❌ Very different |
| **Setup Time** | ✅ 0 seconds | ⚠️ ~30 seconds | ❌ 5+ minutes |
| **Team Setup** | ⚠️ "Install PHP" | ✅ "Run install script" | ❌ "Install Node + packages" |
| **Binary Size** | N/A (system) | 50MB | N/A (packages) |
| **Works Offline** | ✅ Yes | ✅ Yes (after install) | ⚠️ After npm install |

---

## What You Get With Each Setup

### ✅ What's Included in All Solutions:
- Frontend builds in watch mode (auto-rebuild on changes)
- PHP API execution
- SPA routing (all routes → index.html)
- Static file serving
- Source maps for debugging

### 🔧 Optional Add-on (works with all):
- **Backend auto-reload** with `watchexec` (`dev-watch.sh`)

---

## Real-World Scenarios

### Scenario 1: Solo Developer, Quick Prototype
**Use:** `./dev.sh` (PHP built-in)
- Fastest to start
- No installation needed
- Matches production

### Scenario 2: Team Project, Want Consistency
**Use:** FrankenPHP
- Everyone downloads same binary
- No "it works on my machine" issues
- Single file to share

### Scenario 3: Multiple Projects, Want Portability
**Use:** FrankenPHP
- Copy `frankenphp` binary to each project
- Or add to system PATH
- Works even on machines without PHP installed

### Scenario 4: You Hate Installing Things
**Use:** `./dev.sh` (PHP built-in)
- Literally zero setup if PHP exists
- One command to start

---

## "Can I Use X as a Single File?"

### ✅ FrankenPHP - YES
- Download: https://github.com/dunglas/frankenphp/releases
- Size: ~50MB
- Includes: PHP 8.3+ runtime + web server
- Just works™

### ❌ PHP Standalone - NO (but close)
- PHP can be compiled as a single binary
- Not officially distributed this way
- Would need to build it yourself
- Not worth the effort

### ❌ Node/Bun Server - NO
- Would need node_modules/
- Multiple files
- More complex setup

---

## My Recommendation

### Start with PHP Built-in Server:
```bash
./dev.sh
```

**Why:**
1. Zero setup - works immediately if you have PHP
2. Simple - just one script
3. Matches your production environment (Apache/Nginx + PHP)
4. Adequate performance for development

### Upgrade to FrankenPHP if:
- You want a portable single binary
- You're setting up multiple machines
- You want better dev server performance
- Your team needs consistency

```bash
./install-frankenphp.sh
USE_FRANKENPHP=true ./dev.sh
```

### Add backend auto-reload if:
- You're actively developing backend APIs
- You don't want to restart the server constantly

```bash
# Install watchexec first
sudo apt install watchexec  # or brew install watchexec

# Use enhanced dev script
./dev-watch.sh
```

---

## The Single Binary Question

You asked about **"single file PHP executable"**:

**TL;DR:** FrankenPHP is your best option for a single-file solution.

**Why not standalone PHP?**
- PHP binaries exist but not officially distributed as single files
- Would still need a web server
- FrankenPHP solves both problems (PHP runtime + server)

**Why not use Bun as the server?**
- Bun can't execute PHP
- Would need to proxy to PHP-FPM or similar
- Adds complexity without benefits
- Your production uses Apache/Nginx, not Bun

---

## Quick Decision Matrix

```
Do you have PHP installed?
├─ Yes → Use dev.sh ✅
│  └─ Need better performance? → Try FrankenPHP
└─ No → Install FrankenPHP ⚠️
   └─ Or install PHP (system-wide)

Do you change backend files often?
├─ Yes → Use dev-watch.sh (with watchexec)
└─ No → Regular dev.sh is fine

Working with a team?
├─ Yes → Consider FrankenPHP (consistency)
└─ No → PHP built-in is simpler
```

---

## What I've Built For You

1. **`dev.sh`** - Basic dev server (PHP built-in)
2. **`dev-watch.sh`** - Dev server + backend auto-reload
3. **`install-frankenphp.sh`** - One-click FrankenPHP installer
4. **`router.php`** - Router for PHP built-in server
5. **Updated `frontend/package.json`** - Convenient npm scripts
6. **Documentation** - This file + DEV-SETUP.md + QUICK-START.md

---

## Try It Now

```bash
# Start with the simplest option
./dev.sh

# Open http://localhost:8000
# Edit frontend/src/App.tsx
# Watch it rebuild automatically
# Press Ctrl+C to stop
```

That's it! 🎉
