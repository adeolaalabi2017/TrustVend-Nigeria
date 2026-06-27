#!/bin/bash
cd /home/z/my-project
# Only start if port 3000 is not already serving
if ! curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
  pkill -f "next-server" 2>/dev/null
  sleep 1
  nohup setsid sh -c 'exec node_modules/.bin/next dev -p 3000' </dev/null >dev.log 2>&1 &
fi
