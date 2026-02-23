#!/bin/bash
PID=$(pgrep -f 'node.*server.js' | head -1)
if [ -n "$PID" ]; then
    kill $PID 2>/dev/null
    sleep 1
fi
cd /home/apocyz_runner/executive-office
WORKSPACE=/home/apocyz_runner/clawd PORT=8765 nohup node server.js >> /tmp/executive-office.log 2>&1 &
echo 'Restarted, PID:' $!
