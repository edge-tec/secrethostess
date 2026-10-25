#!/bin/bash
set -e

echo "1. Downloading latest server.js with cache busting..."
mkdir -p /www/wwwroot/bot.mailszo.com
curl -sL "https://raw.githubusercontent.com/edge-tec/secrethostess/main/server/server.js?v=$(date +%s)" -o /www/wwwroot/bot.mailszo.com/server.js
curl -sL "https://raw.githubusercontent.com/edge-tec/secrethostess/main/server/package.json?v=$(date +%s)" -o /www/wwwroot/bot.mailszo.com/package.json

# If aaPanel created project in /www/wwwroot/mailszo.com, copy there too
if [ -d "/www/wwwroot/mailszo.com" ]; then
  cp -f /www/wwwroot/bot.mailszo.com/server.js /www/wwwroot/mailszo.com/server.js 2>/dev/null || true
  cp -f /www/wwwroot/bot.mailszo.com/package.json /www/wwwroot/mailszo.com/package.json 2>/dev/null || true
fi

echo "2. Restarting server processes..."
cd /www/wwwroot/bot.mailszo.com
pm2 delete license-server 2>/dev/null || true
pm2 start server.js --name "license-server" || true
pm2 restart all 2>/dev/null || true
pm2 save 2>/dev/null || true

sleep 2

echo "3. Testing local server on port 3000..."
curl -s http://127.0.0.1:3000/admin | grep -i "loginScreen" && echo "✅ Login Screen Verified OK!" || echo "Check status."

echo "=========================================================="
echo "🎉 Server files updated successfully!"
echo "Login URL: https://bot.mailszo.com/admin"
echo "Email: admin@gmail.com | Password: edge2129"
echo "=========================================================="
