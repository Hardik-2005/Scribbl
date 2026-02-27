#!/bin/bash
# Stop any existing Redis
redis-cli shutdown 2>/dev/null

# Start Redis on all interfaces
redis-server --daemonize yes \
  --port 6379 \
  --bind 0.0.0.0 \
  --protected-mode no \
  --save "" \
  --appendonly no

sleep 1

# Test it
echo "Redis status:"
redis-cli ping

# Show what it's bound to
echo ""
echo "Listening on:"
ss -tlnp 2>/dev/null | grep 6379 | head -1
