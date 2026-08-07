#!/bin/sh
set -e

# Substitute environment variables in the nginx template
envsubst '${BACKEND_URL}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Execute the CMD
exec "$@"