#!/usr/bin/env bash

# Calls the BFF x402 discovery refresh endpoint with the authorized bearer token.
#
# Runs from cron on the Lightsail host, OUTSIDE docker compose. The deploy
# (lightsail-sync-stack.sh) installs this script and writes a sibling env file
# holding the freshly generated token + branch URL, then registers a crontab
# entry that runs this twice a day.
#
# Configuration is read from an env file (first arg, or $BFF_X402_REFRESH_ENV_FILE):
#   BFF_X402_REFRESH_URL    - full URL of the POST /aeo/x402/refresh endpoint
#   BFF_X402_REFRESH_TOKEN  - bearer token matching the BFF's BFF_X402_REFRESH_TOKEN
#   BFF_X402_REFRESH_MAX_TIME (optional) - curl timeout in seconds (default 600)

set -euo pipefail

env_file="${1:-${BFF_X402_REFRESH_ENV_FILE:-}}"
if [ -n "$env_file" ]; then
  if [ ! -f "$env_file" ]; then
    echo "x402-refresh: env file not found: ${env_file}" >&2
    exit 1
  fi
  # shellcheck disable=SC1090
  set -a
  . "$env_file"
  set +a
fi

: "${BFF_X402_REFRESH_URL:?BFF_X402_REFRESH_URL is required}"
: "${BFF_X402_REFRESH_TOKEN:?BFF_X402_REFRESH_TOKEN is required}"

timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

body_file="$(mktemp)"
trap 'rm -f "$body_file"' EXIT

# A full live refresh paginates thousands of resources; allow a generous timeout.
if ! http_code="$(curl -sS -o "$body_file" -w '%{http_code}' \
  --max-time "${BFF_X402_REFRESH_MAX_TIME:-600}" \
  -X POST \
  -H "Authorization: Bearer ${BFF_X402_REFRESH_TOKEN}" \
  "${BFF_X402_REFRESH_URL}")"; then
  echo "${timestamp} x402-refresh: request to ${BFF_X402_REFRESH_URL} failed" >&2
  exit 1
fi

body="$(cat "$body_file" 2>/dev/null || true)"

if [ "$http_code" != "200" ]; then
  echo "${timestamp} x402-refresh: ${BFF_X402_REFRESH_URL} -> HTTP ${http_code} ${body}" >&2
  exit 1
fi

echo "${timestamp} x402-refresh: ${BFF_X402_REFRESH_URL} -> ${body}"
