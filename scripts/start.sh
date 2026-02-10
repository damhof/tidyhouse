#!/bin/sh
set -e

# Run migrations before starting
echo "Running database migrations..."
node /app/migrate.cjs

# Start the Next.js server
echo "Starting server..."
exec node server.js
