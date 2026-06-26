#!/usr/bin/env bash
# smoke-prod-fresh.sh — Fresh-clone production smoke test
#
# Usage: scripts/smoke-prod-fresh.sh [port=3230]
#
# Default mode (git clone — for CI/CD and post-commit verification):
#   Clones the canonical repo to a temp dir (no .env.local by construction).
#
# Working-tree mode (SMOKE_USE_WORKING_TREE=1 — for pre-commit local verification):
#   Rsyncs the current working tree to a temp dir, excluding .env.local.
#   Identical zero-env guarantee; includes uncommitted changes so you can
#   verify a fix before the orchestrator commits.
#
# Steps (both modes):
#   1. Populate temp dir (git clone or rsync)
#   2. npm ci
#   3. Build with a fully scrubbed env (MUST succeed with zero env)
#   4. Start in production mode on <port> with same scrubbed env
#   5. Assert HTTP 200 on /, /teams, /agents, /harness-engineering, /signin
#   6. Assert /api/auth/session returns 200 + valid JSON
#   7. Assert server log contains NO "UntrustedHost", "Host must be trusted",
#      "AUTH_SECRET is not set", or "MissingSecret"
#   8. Kill server by PID, assert port free, remove temp dir, print result
#
# Exits nonzero on any failure.  Use SKIP_FRESH_SMOKE=1 in qa-shoot.sh to
# skip (but qa-shoot.sh will print a loud warning when it does).

set -euo pipefail

PORT="${1:-3230}"
CANONICAL_REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SMOKE_CLONE_DIR="$(mktemp -d /tmp/agentcv-smoke-XXXXXX)"
PID_FILE="/tmp/agentcv-smoke-${PORT}.pid"
SERVER_LOG="/tmp/agentcv-smoke-server-${PORT}.log"
USE_WORKING_TREE="${SMOKE_USE_WORKING_TREE:-0}"

echo ""
echo "================================================================"
echo "  smoke-prod-fresh.sh — AgentCV fresh-clone prod smoke"
echo "  PORT:          ${PORT}"
echo "  CANONICAL:     ${CANONICAL_REPO_DIR}"
echo "  SMOKE_CLONE:   ${SMOKE_CLONE_DIR}"
if [[ "${USE_WORKING_TREE}" == "1" ]]; then
  echo "  SOURCE MODE:   working-tree (rsync, includes uncommitted changes)"
else
  echo "  SOURCE MODE:   git clone (committed code only)"
fi
echo "================================================================"
echo ""

# ── Cleanup helper ────────────────────────────────────────────────────────────
_cleanup() {
  local exit_code=$?
  # Kill server if PID file exists
  if [[ -f "${PID_FILE}" ]]; then
    local pid
    pid="$(cat "${PID_FILE}" 2>/dev/null || true)"
    if [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null; then
      echo "[cleanup] killing server PID ${pid}"
      kill "${pid}" 2>/dev/null || true
      sleep 1
    fi
    rm -f "${PID_FILE}"
  fi
  # Remove the temp clone (it's in /tmp — allowed)
  if [[ -d "${SMOKE_CLONE_DIR}" ]]; then
    echo "[cleanup] removing temp clone ${SMOKE_CLONE_DIR}"
    rm -rf "${SMOKE_CLONE_DIR}"
  fi
  return ${exit_code}
}
trap '_cleanup' ERR INT TERM

# ── STEP 0: Assert port free ─────────────────────────────────────────────────
echo "[0] Asserting port ${PORT} is free..."
OCCUPIED="$(lsof -ti "tcp:${PORT}" 2>/dev/null || true)"
if [[ -n "${OCCUPIED}" ]]; then
  echo "ABORT: Port ${PORT} is already in use by PID(s): ${OCCUPIED}"
  echo "  Run: kill ${OCCUPIED}  then retry."
  exit 1
fi
echo "    Port ${PORT} is free. OK."

# ── STEP 1: Populate temp dir ────────────────────────────────────────────────
echo ""
if [[ "${USE_WORKING_TREE}" == "1" ]]; then
  echo "[1] Rsyncing working tree ${CANONICAL_REPO_DIR} → ${SMOKE_CLONE_DIR}..."
  echo "    (SMOKE_USE_WORKING_TREE=1: includes uncommitted changes, excludes .env.local)"
  rsync -a \
    --exclude='.env.local' \
    --exclude='node_modules/' \
    --exclude='.next/' \
    --exclude='.git/' \
    "${CANONICAL_REPO_DIR}/" "${SMOKE_CLONE_DIR}/"
  echo "    Rsync done. No .env.local present in temp dir."
  cd "${SMOKE_CLONE_DIR}"
else
  echo "[1] Cloning ${CANONICAL_REPO_DIR} → ${SMOKE_CLONE_DIR}..."
  git clone "${CANONICAL_REPO_DIR}" "${SMOKE_CLONE_DIR}"
  cd "${SMOKE_CLONE_DIR}"
  # Ensure we are on main (the deploy branch)
  git checkout main
  echo "    Clone done. Branch: $(git rev-parse --abbrev-ref HEAD)  Commit: $(git rev-parse --short HEAD)"
fi

# ── STEP 2: npm ci ───────────────────────────────────────────────────────────
echo ""
echo "[2] Running npm ci in fresh clone (no .env.local present)..."
npm ci
echo "    npm ci done."

# ── STEP 3: Build with scrubbed env ──────────────────────────────────────────
echo ""
echo "[3] Building with fully scrubbed env (zero-env build — catches failure #1)..."
env -u AUTH_SECRET \
    -u AUTH_URL \
    -u AUTH_TRUST_HOST \
    -u DEV_LOGIN \
    -u SANITIZER_KEY \
    npm run build
echo "    Build passed. Zero-env build OK."

# ── STEP 4: Start server with scrubbed env ────────────────────────────────────
echo ""
echo "[4] Starting production server on port ${PORT} with scrubbed env..."
rm -f "${PID_FILE}"
env -u AUTH_SECRET \
    -u AUTH_URL \
    -u AUTH_TRUST_HOST \
    -u DEV_LOGIN \
    -u SANITIZER_KEY \
    PORT="${PORT}" npm start > "${SERVER_LOG}" 2>&1 &
NPM_WRAPPER_PID=$!
echo "    npm wrapper PID: ${NPM_WRAPPER_PID}"

# Wait for the port to open (up to 30s)
echo "    Waiting for port ${PORT} to open (up to 30s)..."
WAIT=0
MAX_WAIT=30
SERVER_PID=""
until [[ -n "${SERVER_PID}" ]]; do
  sleep 1
  WAIT=$((WAIT + 1))
  SERVER_PID="$(lsof -ti "tcp:${PORT}" 2>/dev/null || true)"
  if [[ ${WAIT} -ge ${MAX_WAIT} ]]; then
    echo ""
    echo "ABORT: Server did not open port ${PORT} within ${MAX_WAIT}s."
    echo "  Server log (last 20 lines):"
    tail -20 "${SERVER_LOG}" || true
    kill "${NPM_WRAPPER_PID}" 2>/dev/null || true
    exit 1
  fi
done
# lsof may return multiple PIDs; take the first
SERVER_PID="$(echo "${SERVER_PID}" | head -1)"
echo "    Server listening. Listener PID: ${SERVER_PID}"
echo "${SERVER_PID}" > "${PID_FILE}"

# Give the server a moment to finish startup before we hit routes
sleep 2

# ── STEP 5: HTTP 200 assertions ───────────────────────────────────────────────
echo ""
echo "[5] Asserting HTTP 200 on key routes..."
BASE="http://localhost:${PORT}"
ROUTES=("/" "/teams" "/agents" "/harness-engineering" "/signin")
ALL_200=true
for route in "${ROUTES[@]}"; do
  STATUS="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "${BASE}${route}" || echo "000")"
  if [[ "${STATUS}" == "200" ]]; then
    echo "    ${route} → ${STATUS} OK"
  else
    echo "    FAIL: ${route} → ${STATUS} (expected 200)"
    ALL_200=false
  fi
done

# ── STEP 6: /api/auth/session returns 200 + valid JSON ───────────────────────
echo ""
echo "[6] Asserting /api/auth/session returns 200 + valid JSON..."
SESSION_BODY="$(curl -s --max-time 10 "${BASE}/api/auth/session" || echo "")"
SESSION_STATUS="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "${BASE}/api/auth/session" || echo "000")"
if [[ "${SESSION_STATUS}" != "200" ]]; then
  echo "    FAIL: /api/auth/session returned HTTP ${SESSION_STATUS} (expected 200)"
  ALL_200=false
else
  # Valid JSON = {}, [], or null (unauthenticated sessions return null in Auth.js v5)
  # Reject HTML error pages (start with '<') or empty bodies
  if echo "${SESSION_BODY}" | grep -qE '^[{[]|^null$'; then
    echo "    /api/auth/session → ${SESSION_STATUS} + valid JSON (${SESSION_BODY:0:60}) OK"
  else
    echo "    FAIL: /api/auth/session returned non-JSON body: ${SESSION_BODY:0:120}"
    ALL_200=false
  fi
fi

# ── STEP 7: Assert server log has NO auth error strings ──────────────────────
echo ""
echo "[7] Scanning server log for auth error strings (catches failure #2)..."
# Give the server a moment to flush any startup messages
sleep 1
LOG_CONTENTS="$(cat "${SERVER_LOG}" 2>/dev/null || true)"

FOUND_ERRORS=false
declare -a ERROR_PATTERNS=(
  "UntrustedHost"
  "Host must be trusted"
  "AUTH_SECRET is not set"
  "MissingSecret"
)
for pattern in "${ERROR_PATTERNS[@]}"; do
  if echo "${LOG_CONTENTS}" | grep -q "${pattern}"; then
    echo "    FAIL: server log contains '${pattern}'"
    FOUND_ERRORS=true
  fi
done

if [[ "${FOUND_ERRORS}" == "false" ]]; then
  echo "    Server log clean — no UntrustedHost / MissingSecret / AUTH_SECRET errors. OK."
fi

# ── STEP 8: Kill server, assert port free, remove clone ───────────────────────
echo ""
echo "[8] Stopping server (PID ${SERVER_PID})..."
kill "${SERVER_PID}" 2>/dev/null || true
rm -f "${PID_FILE}"

FREE_WAIT=0
MAX_FREE_WAIT=10
until [[ -z "$(lsof -ti "tcp:${PORT}" 2>/dev/null || true)" ]]; do
  sleep 1
  FREE_WAIT=$((FREE_WAIT + 1))
  if [[ ${FREE_WAIT} -ge ${MAX_FREE_WAIT} ]]; then
    REMAINING="$(lsof -ti "tcp:${PORT}" 2>/dev/null || true)"
    echo "FAIL: Port ${PORT} still occupied after ${MAX_FREE_WAIT}s. Remaining PIDs: ${REMAINING}"
    echo "  Manual cleanup: kill ${REMAINING}"
    exit 1
  fi
done
echo "    Port ${PORT} free. OK."

echo ""
echo "[8] Removing temp clone ${SMOKE_CLONE_DIR}..."
rm -rf "${SMOKE_CLONE_DIR}"
echo "    Temp clone removed. OK."

# Disarm the trap before the final summary (normal exit)
trap - ERR INT TERM

# ── PASS / FAIL summary ───────────────────────────────────────────────────────
echo ""
if [[ "${ALL_200}" == "true" && "${FOUND_ERRORS}" == "false" ]]; then
  echo "================================================================"
  echo "  PASS  |  smoke-prod-fresh.sh"
  echo "  Zero-env build: OK"
  echo "  HTTP 200s:      / /teams /agents /harness-engineering /signin"
  echo "  /api/auth/session: 200 + valid JSON"
  echo "  UntrustedHost / MissingSecret in log: NONE"
  echo "================================================================"
  exit 0
else
  echo "================================================================"
  echo "  FAIL  |  smoke-prod-fresh.sh"
  if [[ "${ALL_200}" == "false" ]]; then
    echo "  One or more routes did not return HTTP 200 (see above)."
  fi
  if [[ "${FOUND_ERRORS}" == "true" ]]; then
    echo "  Server log contained auth error strings (see above)."
    echo "  Server log: ${SERVER_LOG}"
  fi
  echo "================================================================"
  exit 1
fi
