#!/bin/bash
# Start Oratio development server (workaround for npm external drive issue)
# Usage: ./start-dev.sh [port]
# Example: ./start-dev.sh 5173

echo "========================================"
echo "  Oratio Dev Server (Auto-Cleanup Mode)"
echo "========================================"

# Default port
PORT="${1:-5173}"

# Cleanup function
cleanup_servers() {
    echo "🔧 Performing cleanup..."
    
    # Kill vite servers on common dev ports
    for port in 5173 5174 5175 5176; do
        pid=$(lsof -ti:$port 2>/dev/null | grep -v chrome)
        if [ -n "$pid" ]; then
            echo "  Killing server on port $port (PID: $pid)..."
            kill $pid 2>/dev/null || kill -9 $pid 2>/dev/null
        fi
    done
    
    # Clean up orphaned esbuild processes from this project
    esbuild_count=$(pkill -f "esbuild.*Oratio_Prototype_MVP" 2>/dev/null; echo $?)
    if [ $esbuild_count -eq 0 ]; then
        echo "  Cleaned up orphaned esbuild processes"
    fi
    
    # Wait a moment for processes to terminate
    sleep 1
    
    echo "✓ Cleanup complete"
    echo ""
}

# Check if vite exists
if [ ! -f "node_modules/vite/bin/vite.js" ]; then
    echo "❌ Error: vite not found. Run 'npm install' first."
    exit 1
fi

# Run cleanup before starting
cleanup_servers

echo "🚀 Starting development server on port $PORT..."
echo "   If port $PORT is busy, Vite will auto-select another port"
echo ""
echo "📡 Access URLs:"
echo "   Local:   http://localhost:$PORT/"
echo "   Network: http://$(hostname -s 2>/dev/null || echo 'localhost'):$PORT/"
echo ""
echo "🛑 Press Ctrl+C to stop the server"
echo "========================================"

# Start dev server
exec node node_modules/vite/bin/vite.js --port "$PORT"