#!/bin/bash
# Keepalive: restart dev server if port 3000 is not responding
if ! curl -s -o /dev/null --max-time 5 http://localhost:3000/ 2>/dev/null; then
  cd /home/z/my-project
  pkill -f "next" 2>/dev/null
  sleep 1
  nohup setsid sh -c 'exec node_modules/.bin/next dev -p 3000' </dev/null >dev.log 2>&1 &
  echo "[$(date)] server restarted" >> /home/z/my-project/keepalive.log
else
  echo "[$(date)] server ok" >> /home/z/my-project/keepalive.log
fi
