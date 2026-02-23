#!/bin/bash
# Re-apply Caddy config patch for app.spawnkit.ai
sleep 5  # Wait for Caddy to be ready
INDEX=$(curl -s http://localhost:2019/config/apps/http/servers/srv0/routes | python3 -c '
import json,sys
routes=json.load(sys.stdin)
for i,r in enumerate(routes):
    hosts=r.get(match,[{}])[0].get(host,[])
    if app.spawnkit.ai in hosts: print(i); break
')
if [ -n "$INDEX" ]; then
    curl -s -X PATCH "http://localhost:2019/config/apps/http/servers/srv0/routes/$INDEX"         -H 'Content-Type: application/json'         -d '{"handle":[{"handler":"subroute","routes":[{"handle":[{"handler":"reverse_proxy","upstreams":[{"dial":"localhost:8765"}]}]}]}],"match":[{"host":["app.spawnkit.ai"]}],"terminal":true}'
    echo 'Patched app.spawnkit.ai -> reverse_proxy :8765'
else
    echo 'ERROR: Could not find app.spawnkit.ai route'
fi
