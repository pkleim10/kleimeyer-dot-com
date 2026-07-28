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

# Detect LAN IP so the dev server is reachable from other devices (e.g. an
# iPad) on the same Wi-Fi. Mirrors the pattern used in the sibling
# swing-scanner project's run.sh.
PORT="${PORT:-3000}"
LAN_IP=""
for iface in en0 en1 en2; do
  if LAN_IP="$(ipconfig getifaddr "$iface" 2>/dev/null)" && [[ -n "$LAN_IP" ]]; then
    break
  fi
done
VPN_HINT=""
if VPN_IP="$(ipconfig getifaddr utun4 2>/dev/null)" && [[ -n "$VPN_IP" ]]; then
  VPN_HINT="$VPN_IP"
fi

echo ""
echo "Local:  http://localhost:${PORT}"
if [[ -n "$LAN_IP" ]]; then
  echo "iPad (same Wi-Fi): http://${LAN_IP}:${PORT}/deadpool"
fi
if [[ -n "$VPN_HINT" ]]; then
  echo "Note: macOS may also report a VPN/Network address (${VPN_HINT}) — ignore that for iPad on Wi-Fi."
fi
echo ""

# Start the dev server (Next.js already listens on 0.0.0.0 by default in dev mode)
echo "Starting Next.js dev server..."
npm run dev
