#!/usr/bin/env bash
# Sends $MESSAGE to the DevOps chat. Does nothing when the bot isn't set up,
# so forks and local runs don't fail.
set -euo pipefail

if [ -z "${TELEGRAM_OPS_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_OPS_CHAT_ID:-}" ]; then
  echo "TELEGRAM_OPS_BOT_TOKEN or TELEGRAM_OPS_CHAT_ID is not set; skipping."
  exit 0
fi

curl --fail --silent --show-error --max-time 20 \
  "https://api.telegram.org/bot${TELEGRAM_OPS_BOT_TOKEN}/sendMessage" \
  --data-urlencode "chat_id=${TELEGRAM_OPS_CHAT_ID}" \
  --data-urlencode "text=${MESSAGE}" \
  --data-urlencode "disable_web_page_preview=true" \
  > /dev/null
