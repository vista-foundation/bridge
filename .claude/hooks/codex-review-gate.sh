#!/usr/bin/env bash
set -uo pipefail

# ──────────────────────────────────────────────────────────────
# Codex Review Gate — Claude Code PreToolUse hook
# Intercepts `git commit` commands, runs `codex review`, and
# blocks the commit if findings are reported.
#
# Handles the known issue where `codex review` finishes its
# review but the process doesn't exit cleanly — uses idle
# detection (output stops growing for 30s) to kill and proceed.
# ──────────────────────────────────────────────────────────────

LOG="/tmp/codex-review-gate.log"
log() { echo "[$(date '+%H:%M:%S')] $*" >> "$LOG"; }

log "=== Hook invoked ==="

# Bypass: set SKIP_CODEX_REVIEW=1 to skip the review
if [[ "${SKIP_CODEX_REVIEW:-}" == "1" ]]; then
  log "Bypassed via SKIP_CODEX_REVIEW"
  exit 0
fi

# Read hook input from stdin
INPUT=$(cat)

# Extract the bash command from the JSON input
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
log "Command: $COMMAND"

# Only intercept git commit commands (not git add, git status, etc.)
if [[ ! "$COMMAND" =~ git[[:space:]]+commit ]]; then
  log "Not a git commit — passing through"
  exit 0
fi

# Check that codex is available
if ! command -v codex &>/dev/null; then
  echo "Warning: codex CLI not found, skipping review" >&2
  log "codex not found, skipping"
  exit 0
fi

log "Starting codex review (model=gpt-5.3-codex)..."
echo "Running Codex review on uncommitted changes (gpt-5.3-codex)..." >&2

START_TIME=$(date +%s)
REVIEW_TMPFILE=$(mktemp /tmp/codex-review-out-XXXXXX)

# Run codex in background, output to temp file
codex review --uncommitted -c 'model="gpt-5.3-codex"' > "$REVIEW_TMPFILE" 2>&1 &
CODEX_PID=$!
log "codex PID: $CODEX_PID"

# Monitor: idle detection + hard timeout
# After codex finishes its review, output stops growing. 45s of silence = done.
LAST_SIZE=0
IDLE_SECS=0
TOTAL_SECS=0

while true; do
  sleep 5
  TOTAL_SECS=$((TOTAL_SECS + 5))

  # Check if process actually exited
  if ! kill -0 "$CODEX_PID" 2>/dev/null; then
    log "codex process exited naturally after ${TOTAL_SECS}s"
    break
  fi

  # Idle detection: output stopped growing
  CURRENT_SIZE=$(stat -f%z "$REVIEW_TMPFILE" 2>/dev/null || echo 0)
  if [[ "$CURRENT_SIZE" -eq "$LAST_SIZE" && "$CURRENT_SIZE" -gt 100 ]]; then
    IDLE_SECS=$((IDLE_SECS + 5))
    log "Output idle: ${IDLE_SECS}s (size: ${CURRENT_SIZE} bytes)"
    if [[ $IDLE_SECS -ge 120 ]]; then
      log "Output idle for ${IDLE_SECS}s — codex likely done. Killing PID $CODEX_PID"
      kill "$CODEX_PID" 2>/dev/null || true
      break
    fi
  else
    IDLE_SECS=0
    LAST_SIZE=$CURRENT_SIZE
  fi

  # Hard timeout (just under the 2700s hook timeout)
  if [[ $TOTAL_SECS -ge 2550 ]]; then
    log "Hard timeout after ${TOTAL_SECS}s"
    kill "$CODEX_PID" 2>/dev/null || true
    echo "Warning: Codex review timed out after ${TOTAL_SECS}s, allowing commit" >&2
    wait "$CODEX_PID" 2>/dev/null || true
    rm -f "$REVIEW_TMPFILE"
    exit 0
  fi
done

# Reap the process
wait "$CODEX_PID" 2>/dev/null || true

REVIEW_OUTPUT=$(cat "$REVIEW_TMPFILE")
rm -f "$REVIEW_TMPFILE"

END_TIME=$(date +%s)
ELAPSED=$(( END_TIME - START_TIME ))

log "codex review done in ${ELAPSED}s (output: ${#REVIEW_OUTPUT} bytes)"
log "--- OUTPUT START ---"
echo "$REVIEW_OUTPUT" >> "$LOG"
log "--- OUTPUT END ---"

# If output is empty or very short, something went wrong — allow commit
if [[ ${#REVIEW_OUTPUT} -lt 50 ]]; then
  echo "Warning: Codex review returned minimal output (${#REVIEW_OUTPUT} bytes), allowing commit" >&2
  log "Minimal output (<50 bytes), allowing commit"
  exit 0
fi

# Check for API/infra errors — don't block commits due to Codex service issues
if echo "$REVIEW_OUTPUT" | grep -qE 'usage_limit_reached|rate_limit|429 Too Many Requests|503 Service|Review was interrupted|error.*http [45][0-9][0-9]'; then
  echo "Warning: Codex review hit an API error, allowing commit" >&2
  log "API error detected, allowing commit"
  exit 0
fi

# Check for actual findings: [P0] through [P4] markers from Codex structured output
if echo "$REVIEW_OUTPUT" | grep -qE '\[P[0-4]\]'; then
  FINDING_COUNT=$(echo "$REVIEW_OUTPUT" | grep -cE '\[P[0-4]\]' || true)
  log "Found $FINDING_COUNT finding(s) with priority markers — blocking commit"
else
  echo "Codex review passed in ${ELAPSED}s — no actionable findings." >&2
  log "Clean review (no [P0]-[P4] markers found)"
  exit 0
fi

# Codex found issues — block the commit and show findings
log "Blocking commit — $FINDING_COUNT finding(s) detected"
cat >&2 <<EOF

======================================================
  CODEX REVIEW — FINDINGS DETECTED (${ELAPSED}s)
======================================================

${REVIEW_OUTPUT}

======================================================
  ACTION REQUIRED — Fix before commit can proceed:
------------------------------------------------------
  1. Fix ALL Codex findings listed above
  2. Self-review your fixes for additional issues
  3. Retry the commit when everything is clean
======================================================

EOF

exit 2
