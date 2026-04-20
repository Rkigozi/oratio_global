# Oratio Quick Start Guide

## 🚀 Starting Development Server

### Option 1: Auto-Cleanup Script (Recommended)
```bash
./start-dev.sh
```
- Auto-cleans orphaned servers on ports 5173-5176
- Kills orphaned esbuild processes  
- Shows clean startup with access URLs
- Default port: 5173 (or specify: `./start-dev.sh 5174`)

### Option 2: Direct Vite Command
```bash
node node_modules/vite/bin/vite.js
```

### Option 3: NPM Wrapper
```bash
node /opt/homebrew/lib/node_modules/npm/bin/npm-cli.js run dev
```

## 🛑 Stopping the Server
- **In terminal**: Press `Ctrl+C`
- **If frozen**: Close terminal or use `pkill -f "vite"`

## 🔧 Server Management Commands

### Cleanup Orphaned Servers
```bash
# Kill vite servers on common ports
for port in 5173 5174 5175 5176; do
  lsof -ti:$port 2>/dev/null | xargs kill -9 2>/dev/null
done

# Clean orphaned esbuild processes
pkill -f "esbuild.*Oratio_Prototype_MVP" 2>/dev/null
```

### Check Server Status
```bash
# See what's running on dev ports
lsof -i :5173-5176 2>/dev/null | grep -E "(LISTEN|vite|node)"

# Check if specific port is in use
lsof -ti:5173 2>/dev/null && echo "Port 5173 in use" || echo "Port 5173 free"
```

## 📱 Accessing the App
Once server starts, open in browser:
- **Local**: http://localhost:5173/ (or whichever port is shown)
- **Network**: http://[your-computer-name]:[port]/

## 🐛 Common Issues

### "npm run dev" fails with "ENOENT: no such file or directory, uv_cwd"
**Cause**: npm bug with external drives (like Samsung T5)
**Fix**: Use the workarounds above

### Port already in use
**Fix**: The `./start-dev.sh` script auto-cleans ports. Or manually:
```bash
lsof -ti:5173 | xargs kill -9 2>/dev/null
```

### Server starts but app doesn't load
**Check**: 
1. Wait for "✓ ready in X ms" message
2. Refresh browser
3. Check browser console for errors (F12 → Console)

## ✅ Testing Prayer Submission
1. Navigate to **Submit** page
2. Enter prayer text (minimum 10 characters)
3. Select location & category
4. Click **Submit Prayer Request**
5. Should see success screen with "View in Feed" button

---

**Tip**: Bookmark http://localhost:5173/ for quick access during development.