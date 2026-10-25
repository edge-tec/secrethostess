#!/bin/bash
set -e

echo "Applying clean Nginx config for mailszo.com..."

cat << 'CONF' > /www/server/panel/vhost/nginx/mailszo.com.conf
server
{
    listen 80;
    listen 443 ssl http2;

    server_name mailszo.com www.mailszo.com;

    if ($server_port !~ 443){
        rewrite ^(/.*)$ https://$host$1 permanent;
    }

    ssl_certificate        /www/server/panel/vhost/cert/mailszo.com/fullchain.pem;
    ssl_certificate_key    /www/server/panel/vhost/cert/mailszo.com/privkey.pem;
    ssl_protocols TLSv1.1 TLSv1.2 TLSv1.3;
    ssl_ciphers EECDH+CHACHA20:EECDH+CHACHA20-draft:EECDH+AES128:RSA+AES128:EECDH+AES256:RSA+AES256:EECDH+3DES:RSA+3DES:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_tickets on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    add_header Strict-Transport-Security "max-age=31536000";
    error_page 497  https://$host$request_uri;

    include /www/server/panel/vhost/nginx/well-known/mailszo.com.conf;
    location ~ \.well-known {
        allow all;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header REMOTE-HOST $remote_addr;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    access_log /www/wwwlogs/mailszo.com.log;
    error_log  /www/wwwlogs/mailszo.com.error.log;
}
CONF

nginx -t
nginx -s reload

echo "=========================================================="
echo "🎉 SUCCESS! Nginx reloaded! WordPress completely removed."
echo "👉 Test now at: https://mailszo.com/admin"
echo "=========================================================="
