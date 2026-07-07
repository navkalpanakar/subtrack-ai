#!/bin/bash
cd /home/z/my-project
while true; do
  node node_modules/.bin/next dev -p 3000 2>&1
  echo "[watchdog] next dev exited, restarting in 2s..." >&2
  sleep 2
done
