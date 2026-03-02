#!/bin/bash
# Setup & Run Todo App
# Usage: ./setup.sh [dev|build|start|cron]
#   dev   - Run in development mode (hot reload)
#   build - Build frontend for production
#   start - Build + start production server
#   cron  - Install the daily rollover cron job

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Ensure bun is installed
if ! command -v bun &> /dev/null; then
  echo "Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
fi

install_deps() {
  echo "==> Installing dependencies..."
  cd "$SCRIPT_DIR/app" && bun install
  cd "$SCRIPT_DIR/server" && bun install
}

build_frontend() {
  echo "==> Building frontend..."
  cd "$SCRIPT_DIR/app" && bun run build
  echo "Frontend built to server/public/"
}

case "${1:-start}" in
  dev)
    install_deps
    echo "==> Starting dev servers..."
    echo "    Server: http://localhost:3000"
    echo "    App:    http://localhost:5173 (with proxy to server)"
    # Run both in parallel
    cd "$SCRIPT_DIR/server" && bun run dev &
    SERVER_PID=$!
    cd "$SCRIPT_DIR/app" && bun run dev &
    APP_PID=$!
    trap "kill $SERVER_PID $APP_PID 2>/dev/null" EXIT
    wait
    ;;

  build)
    install_deps
    build_frontend
    echo "Done! Run './setup.sh start' to start the server."
    ;;

  start)
    install_deps
    build_frontend
    echo "==> Starting production server on port ${PORT:-3000}..."
    cd "$SCRIPT_DIR/server" && bun run start
    ;;

  cron)
    CRON_CMD="0 0 * * * TZ=America/Los_Angeles $SCRIPT_DIR/scripts/daily-rollover.sh >> $SCRIPT_DIR/scripts/rollover.log 2>&1"
    # Check if cron job already exists
    if crontab -l 2>/dev/null | grep -q "daily-rollover.sh"; then
      echo "Cron job already installed."
    else
      (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
      echo "Cron job installed: runs daily at 12:00 AM PST"
    fi
    echo "Cron entry:"
    crontab -l | grep daily-rollover
    ;;

  *)
    echo "Usage: ./setup.sh [dev|build|start|cron]"
    exit 1
    ;;
esac
