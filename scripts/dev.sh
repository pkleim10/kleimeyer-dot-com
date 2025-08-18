#!/bin/bash

# Kill any existing Next.js dev servers
echo "Stopping any existing Next.js dev servers..."
pkill -f "next dev" || true

# Wait a moment for processes to fully stop
sleep 1

# Check if any are still running
if pgrep -f "next dev" > /dev/null; then
    echo "Warning: Some Next.js processes may still be running"
    ps aux | grep "next dev" | grep -v grep
else
    echo "All Next.js dev servers stopped successfully"
fi

# Start the dev server
echo "Starting Next.js dev server..."
npm run dev
