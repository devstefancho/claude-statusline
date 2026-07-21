#!/bin/bash
# One-shot test: does Claude Code's keychain OAuth token authenticate
# against the usage endpoint, and does the response contain per-model
# (Fable) usage? Token is never printed.
set -u

CREDS=$(security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null)
if [ -z "$CREDS" ]; then
    echo "FAIL: keychain item 'Claude Code-credentials' not readable"
    exit 1
fi

TOKEN=$(printf '%s' "$CREDS" | jq -r '.claudeAiOauth.accessToken // empty')
if [ -z "$TOKEN" ]; then
    echo "FAIL: no accessToken inside keychain item"
    exit 1
fi
echo "token: OK (${#TOKEN} chars, not shown)"

OUT="$HOME/.claude/fable-usage-test-response.json"
code=$(curl -sS -o "$OUT" -w "%{http_code}" --max-time 10 \
    -H "Authorization: Bearer $TOKEN" \
    -H "anthropic-beta: oauth-2025-04-20" \
    "https://api.anthropic.com/api/oauth/usage")

echo "HTTP $code — response saved to $OUT"
echo "---- response body ----"
jq . "$OUT" 2>/dev/null || head -c 2000 "$OUT"
