#!/usr/bin/env bash
# Consistent archive of SQLite + all media. Briefly pauses Replotre while copying.
set -euo pipefail
cd "$(dirname "$0")/.."
if ! command -v docker >/dev/null; then echo 'Docker is required'; exit 1; fi
mkdir -p backups
name="replotre-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
echo 'Temporarily stopping the app to capture a consistent database and assets…'
docker compose stop app
trap 'docker compose start app >/dev/null' EXIT
docker run --rm \
  -v replotre_replotre_data:/from:ro \
  -v "$(pwd)/backups:/backups" \
  alpine:3.21 sh -c "tar -czf '/backups/$name' -C /from ."
echo "Backup written to $(pwd)/backups/$name"
echo 'Store an encrypted copy OFF the server and verify restoration regularly.'
