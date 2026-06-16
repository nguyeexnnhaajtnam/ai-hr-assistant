#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

GEMINI_API_KEY_ARG=""
NO_OPEN_BROWSER=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --gemini-api-key)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --gemini-api-key" >&2
        exit 1
      fi
      GEMINI_API_KEY_ARG="$2"
      shift 2
      ;;
    --no-open-browser)
      NO_OPEN_BROWSER=true
      shift
      ;;
    -h|--help)
      cat <<'EOF'
Usage: ./start.sh [--gemini-api-key <key>] [--no-open-browser]
EOF
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

write_step() {
  printf '\n==> %s\n' "$1"
}

wait_http() {
  local url="$1"
  local timeout_seconds="${2:-180}"
  local start_time
  start_time="$(date +%s)"

  while (( "$(date +%s)" - start_time < timeout_seconds )); do
    if curl -fsS --max-time 5 "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  return 1
}

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Please install Docker Desktop first." >&2
  exit 1
fi

resolved_gemini_key="$GEMINI_API_KEY_ARG"
if [[ -z "$resolved_gemini_key" && -f ".env" ]]; then
  env_line="$(grep -m1 '^GEMINI_API_KEY=' .env || true)"
  if [[ -n "$env_line" ]]; then
    resolved_gemini_key="${env_line#GEMINI_API_KEY=}"
    resolved_gemini_key="${resolved_gemini_key#"${resolved_gemini_key%%[![:space:]]*}"}"
    resolved_gemini_key="${resolved_gemini_key%"${resolved_gemini_key##*[![:space:]]}"}"
  fi
fi

if [[ -n "$resolved_gemini_key" ]]; then
  export GEMINI_API_KEY="$resolved_gemini_key"
else
  unset GEMINI_API_KEY 2>/dev/null || true
fi

ui_url="http://127.0.0.1:8000/"
health_url="http://127.0.0.1:8000/health"

write_step "Building and starting Docker stack"
docker compose -f docker-compose.demo.yml up -d --build

write_step "Waiting for app to become ready"
if ! wait_http "$health_url" 180; then
  echo "App did not become ready. Check logs with: docker compose -f docker-compose.demo.yml logs" >&2
  exit 1
fi

if [[ "$NO_OPEN_BROWSER" == false ]] && command -v open >/dev/null 2>&1; then
  open "$ui_url"
fi

printf '\nApp is ready.\n'
printf 'UI:      %s\n' "$ui_url"
printf 'Swagger: http://127.0.0.1:8000/docs\n'
printf 'Health:  %s\n\n' "$health_url"
printf 'To stop it later, run: ./stop.sh\n'
