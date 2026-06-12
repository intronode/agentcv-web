#!/usr/bin/env bash
# qa-shoot.sh — AgentCV QA screenshot pipeline
#
# Usage: scripts/qa-shoot.sh <out-dir> [port=3190]
#
# Steps (each asserts success before proceeding):
#   a. Assert target port is free
#   b. npm run db:reset && npm run build
#   c. Start npm start on PORT, resolve real next-server PID via lsof
#   d. Health gate: HTTP 200 on /, stylesheet 200, buildId match
#   e. npm run shoot
#   f. Kill server, assert port free
#   g. Print PASS summary
#
# Does NOT automatically kill processes found on the port — if the port
# is occupied it prints the offending PID and aborts with instructions.

set -euo pipefail

# ── Args ─────────────────────────────────────────────────────────────────────
OUT_DIR="${1:?Usage: scripts/qa-shoot.sh <out-dir> [port]}"
PORT="${2:-3190}"
PID_FILE="/tmp/agentcv-${PORT}.pid"

# Resolve project root (the directory containing this script's parent)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# All npm commands run from project root
cd "${PROJECT_ROOT}"

# Absolute out-dir (resolve relative to cwd=project-root)
case "${OUT_DIR}" in
  /*) : ;;            # already absolute
  *)  OUT_DIR="${PROJECT_ROOT}/${OUT_DIR}" ;;
esac

echo ""
echo "================================================================"
echo "  qa-shoot.sh — AgentCV QA pipeline"
echo "  PORT:    ${PORT}"
echo "  OUT_DIR: ${OUT_DIR}"
echo "  PID_FILE: ${PID_FILE}"
echo "================================================================"
echo ""

# ── Helper: cleanup on exit ───────────────────────────────────────────────────
_cleanup() {
  if [[ -f "${PID_FILE}" ]]; then
    local pid
    pid="$(cat "${PID_FILE}" 2>/dev/null || echo "")"
    if [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null; then
      echo "[cleanup] killing server PID ${pid}"
      kill "${pid}" 2>/dev/null || true
      sleep 1
    fi
    rm -f "${PID_FILE}"
  fi
}
# Register cleanup on abnormal exits (not on normal PASS exit — we do it manually there)
trap '_cleanup' ERR INT TERM

# ── STEP A: Assert port free ──────────────────────────────────────────────────
echo "[a] Checking port ${PORT} is free..."
OCCUPIED_PIDS="$(lsof -ti "tcp:${PORT}" 2>/dev/null || true)"
if [[ -n "${OCCUPIED_PIDS}" ]]; then
  echo ""
  echo "ABORT: Port ${PORT} is already in use."
  echo "  Offending PID(s): ${OCCUPIED_PIDS}"
  echo ""
  echo "  To free the port, run one of:"
  echo "    kill ${OCCUPIED_PIDS}"
  echo "    kill \$(lsof -ti tcp:${PORT})"
  echo ""
  echo "  Then re-run: scripts/qa-shoot.sh ${OUT_DIR} ${PORT}"
  exit 1
fi
echo "    Port ${PORT} is free. OK."

# ── STEP B: db:reset + build ──────────────────────────────────────────────────
echo ""
echo "[b] Running db:reset..."
npm run db:reset

echo ""
echo "[b] Running build..."
npm run build

BUILD_ID_FILE="${PROJECT_ROOT}/.next/BUILD_ID"
if [[ ! -f "${BUILD_ID_FILE}" ]]; then
  echo "ABORT: .next/BUILD_ID not found after build."
  exit 1
fi
BUILD_ID="$(cat "${BUILD_ID_FILE}")"
echo "    Build complete. BUILD_ID=${BUILD_ID}"

# ── STEP C: Start server, resolve real PID ───────────────────────────────────
echo ""
echo "[c] Starting next server on port ${PORT}..."

# Remove any stale PID file
rm -f "${PID_FILE}"

# Start next start in background; redirect output to a tmp log
SERVER_LOG="/tmp/agentcv-server-${PORT}.log"
PORT="${PORT}" npm start > "${SERVER_LOG}" 2>&1 &
NPM_WRAPPER_PID=$!
echo "    npm wrapper PID: ${NPM_WRAPPER_PID}"

# Wait for the server to begin listening — poll lsof until the port shows up
echo "    Waiting for port ${PORT} to open (up to 30s)..."
WAIT_SECS=0
MAX_WAIT=30
SERVER_PID=""
until [[ -n "${SERVER_PID}" ]]; do
  sleep 1
  WAIT_SECS=$((WAIT_SECS + 1))
  # Resolve the real listener PID (the next-server process, not npm wrapper)
  SERVER_PID="$(lsof -ti "tcp:${PORT}" 2>/dev/null || true)"
  if [[ ${WAIT_SECS} -ge ${MAX_WAIT} ]]; then
    echo ""
    echo "ABORT: Server did not open port ${PORT} within ${MAX_WAIT}s."
    echo "  Server log: ${SERVER_LOG}"
    kill "${NPM_WRAPPER_PID}" 2>/dev/null || true
    exit 1
  fi
done

# lsof may return multiple PIDs (e.g. IPv4 + IPv6); take the first
SERVER_PID="$(echo "${SERVER_PID}" | head -1)"
echo "    Server listening. Real listener PID: ${SERVER_PID}"
echo "${SERVER_PID}" > "${PID_FILE}"
echo "    PID written to ${PID_FILE}"

# ── STEP D: Health gate ───────────────────────────────────────────────────────
echo ""
echo "[d] Running health gate..."

BASE_URL="http://localhost:${PORT}"

# d1: HTTP 200 on /
echo "    d1: Checking GET / returns 200..."
ROOT_STATUS="$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${BASE_URL}/" || echo "000")"
if [[ "${ROOT_STATUS}" != "200" ]]; then
  echo "ABORT: GET / returned HTTP ${ROOT_STATUS} (expected 200)."
  _cleanup
  exit 1
fi
echo "       OK (${ROOT_STATUS})"

# d2: Extract stylesheet href from served HTML and check it returns 200 with CSS content-type
echo "    d2: Extracting stylesheet href from served HTML..."
ROOT_HTML="$(curl -s --max-time 10 "${BASE_URL}/")"

# Next.js 15 injects stylesheet links like /_next/static/css/....css
STYLESHEET_HREF="$(echo "${ROOT_HTML}" | grep -oE '/_next/static/css/[^"]+\.css' | head -1 || true)"
if [[ -z "${STYLESHEET_HREF}" ]]; then
  echo "ABORT: Could not extract stylesheet href from served HTML."
  echo "  This usually means the server is serving stale/uncached output."
  _cleanup
  exit 1
fi
echo "       Stylesheet href: ${STYLESHEET_HREF}"

STYLESHEET_URL="${BASE_URL}${STYLESHEET_HREF}"
STYLESHEET_RESPONSE="$(curl -s -I --max-time 10 "${STYLESHEET_URL}")"
STYLESHEET_STATUS="$(echo "${STYLESHEET_RESPONSE}" | grep -oE '^HTTP/[0-9.]+ [0-9]+' | grep -oE '[0-9]+$' | head -1 || echo "000")"
STYLESHEET_CT="$(echo "${STYLESHEET_RESPONSE}" | grep -i 'content-type:' | head -1 || true)"

if [[ "${STYLESHEET_STATUS}" != "200" ]]; then
  echo "ABORT: Stylesheet at ${STYLESHEET_URL} returned HTTP ${STYLESHEET_STATUS} (expected 200)."
  _cleanup
  exit 1
fi
if ! echo "${STYLESHEET_CT}" | grep -qi 'css'; then
  echo "ABORT: Stylesheet content-type does not contain 'css': ${STYLESHEET_CT}"
  _cleanup
  exit 1
fi
echo "       Stylesheet OK (HTTP ${STYLESHEET_STATUS}, content-type: $(echo "${STYLESHEET_CT}" | tr -d '\r\n' | sed 's/content-type://i' | xargs))"

# d3: Assert the served HTML contains .next/BUILD_ID
# Next.js embeds the buildId as a directory name under /_next/static/<buildId>/
# (e.g. _buildManifest.js and _ssgManifest.js paths). We verify the exact
# BUILD_ID string appears in the served HTML — any mismatch means a stale
# server is serving output from a different build.
echo "    d3: Verifying served HTML contains .next/BUILD_ID (${BUILD_ID})..."
if ! echo "${ROOT_HTML}" | grep -qF -- "${BUILD_ID}"; then
  # Also try fetching without streaming compression in case curl decoded it oddly
  ROOT_HTML_PLAIN="$(curl -s --max-time 10 -H 'Accept-Encoding: identity' "${BASE_URL}/")"
  if ! echo "${ROOT_HTML_PLAIN}" | grep -qF -- "${BUILD_ID}"; then
    echo "ABORT: buildId '${BUILD_ID}' not found in served HTML."
    echo "  This means a stale server is serving output from a different build."
    _cleanup
    exit 1
  fi
fi
echo "       buildId match: ${BUILD_ID} OK"

echo "    Health gate PASSED."

# ── STEP E: Run shoot ─────────────────────────────────────────────────────────
echo ""
echo "[e] Running npm run shoot..."
npm run shoot -- --port "${PORT}" --out "${OUT_DIR}"

# ── STEP F: Kill server, assert port free ─────────────────────────────────────
echo ""
echo "[f] Stopping server (PID ${SERVER_PID})..."
kill "${SERVER_PID}" 2>/dev/null || true
rm -f "${PID_FILE}"

# Wait for port to free (up to 10s)
FREE_WAIT=0
MAX_FREE_WAIT=10
until [[ -z "$(lsof -ti "tcp:${PORT}" 2>/dev/null || true)" ]]; do
  sleep 1
  FREE_WAIT=$((FREE_WAIT + 1))
  if [[ ${FREE_WAIT} -ge ${MAX_FREE_WAIT} ]]; then
    REMAINING_PIDS="$(lsof -ti "tcp:${PORT}" 2>/dev/null || true)"
    echo ""
    echo "FAIL: Port ${PORT} still occupied after ${MAX_FREE_WAIT}s."
    echo "  Remaining PID(s): ${REMAINING_PIDS}"
    echo "  Manual cleanup required: kill ${REMAINING_PIDS}"
    exit 1
  fi
done
echo "    Port ${PORT} is free. OK."

# Disarm the error trap (normal exit — no additional cleanup needed)
trap - ERR INT TERM

# ── STEP G: PASS summary ──────────────────────────────────────────────────────
echo ""

# Parse console-log.txt for shot count and unexpected error count
CONSOLE_LOG="${OUT_DIR}/console-log.txt"
OVERFLOW_REPORT="${OUT_DIR}/overflow-report.txt"
SHOT_COUNT="$(find "${OUT_DIR}" -name '*.png' 2>/dev/null | wc -l | tr -d ' ')"
UNEXPECTED_COUNT=0
if [[ -f "${CONSOLE_LOG}" ]]; then
  UNEXPECTED_COUNT="$(grep -oE '^# [0-9]+ unexpected' "${CONSOLE_LOG}" | grep -oE '[0-9]+' || echo "0")"
fi

# Verify required interaction captures are present
INTERACTION_PASS=true
REQUIRED_CAPTURES=(
  "register-team-success.png"
  "register-team-mid-stepper.png"
  "register-chooser-desktop-fold.png"
  "request-success.png"
  "agents-filtered-openclaw-desktop.png"
  "teams-ari-collective-files-lessons-desktop.png"
  "teams-ari-collective-files-lessons-mobile.png"
)
MISSING_CAPTURES=()
for cap in "${REQUIRED_CAPTURES[@]}"; do
  if [[ ! -f "${OUT_DIR}/${cap}" ]]; then
    MISSING_CAPTURES+=("${cap}")
    INTERACTION_PASS=false
  fi
done

if [[ "${INTERACTION_PASS}" == "false" ]]; then
  echo "================================================================"
  echo "  FAIL  |  Missing required captures:"
  for m in "${MISSING_CAPTURES[@]}"; do
    echo "          - ${m}"
  done
  echo "================================================================"
  exit 1
fi

echo "================================================================"
echo "  PASS  |  ${SHOT_COUNT} shots captured  |  ${UNEXPECTED_COUNT} unexpected console error(s)"
echo "  Interaction captures: register-team-success ✓  register-chooser ✓  request-success ✓  agents-filtered ✓"
echo "  Output: ${OUT_DIR}"
echo "  Console log: ${CONSOLE_LOG}"
echo "================================================================"

# Print overflow report if present
if [[ -f "${OVERFLOW_REPORT}" ]]; then
  echo ""
  echo "── Overflow report ─────────────────────────────────────────────"
  cat "${OVERFLOW_REPORT}"
  echo "────────────────────────────────────────────────────────────────"
fi
echo ""
