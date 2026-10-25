#!/bin/bash
set -e

echo "1. Downloading latest server.js into /www/wwwroot/bot.mailszo.com..."
mkdir -p /www/wwwroot/bot.mailszo.com
curl -sL https://raw.githubusercontent.com/edge-tec/secrethostess/main/server/server.js -o /www/wwwroot/bot.mailszo.com/server.js
curl -sL https://raw.githubusercontent.com/edge-tec/secrethostess/main/server/package.json -o /www/wwwroot/bot.mailszo.com/package.json

echo "2. Restarting PM2 license server..."
cd /www/wwwroot/bot.mailszo.com
pm2 delete license-server || true
pm2 start server.js --name "license-server"
pm2 save

sleep 2

echo "3. Testing local server on port 3000..."
curl -s http://127.0.0.1:3000/admin | grep -i "SecretHostess" && echo "Local Node server OK!"

echo "=========================================================="
echo "🎉 Server files updated for bot.mailszo.com!"
echo "Next step: Add bot.mailszo.com in aaPanel Node project or Website!"
echo "=========================================================="
