#!/bin/bash
# Local IPO Lens Sync Cron Script
SECRET="uOZllGm7dSHDBlpC84GXnw-3ETGSzWqmHjX9AY1Pa8s"
PORT=3000

echo "[$(date)] Starting Sync Jobs..."

echo "1. Syncing IPO List..."
curl -s -X POST -H "Authorization: $SECRET" "http://localhost:$PORT/api/sync-ipos"
echo ""

echo "2. Syncing GMP Data..."
curl -s -X POST -H "Authorization: $SECRET" "http://localhost:$PORT/api/sync-gmp"
echo ""

echo "3. Syncing Subscription Data..."
curl -s -X POST -H "Authorization: $SECRET" "http://localhost:$PORT/api/sync-subscription"
echo ""

echo "[$(date)] Sync Jobs Completed."
echo "----------------------------------------"
