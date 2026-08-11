#!/bin/sh
set -e

# Default to the compose backend service; override via BACKEND_URL
BACKEND_URL="${BACKEND_URL:-http://backend:3000}"
export BACKEND_URL

# Substitute environment variables in the nginx template
envsubst '${BACKEND_URL}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Execute the CMD
exec "$@"
