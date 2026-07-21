# Fetch per-model (Fable) weekly usage from the unofficial OAuth usage endpoint

To display a per-model weekly usage percentage in the statusline (e.g. "Fable 89%", the same number Claude Code's `/usage` command and the desktop app show), the `fable` segment calls an **undocumented** endpoint:

```
GET https://api.anthropic.com/api/oauth/usage
```

It authenticates with the OAuth access token that Claude Code already stores in the macOS keychain (item `Claude Code-credentials`, field `claudeAiOauth.accessToken`) and sends the header `anthropic-beta: oauth-2025-04-20`. The response contains a `limits` array; the segment reads the entry with `kind == "weekly_scoped"` whose `scope.model.display_name` matches `fable`.

This is a **temporary workaround**. Remove the fetch block and the `fable` render once Claude Code exposes a per-model usage field in the statusline stdin JSON.

## Considered Options

- **Wait for an official statusline JSON field.** The statusline stdin only carries aggregate `rate_limits` (5-hour / 7-day); there is no per-model breakdown. Chosen as the long-term answer, but there is no field today, so it does not solve the present request.
- **Scrape `claude.ai/api/organizations/{org}/usage` with the web session cookie.** Rejected: the session cookie is effectively full account access, and putting it in a statusline script is a large credential blast radius for one number.
- **Use the keychain OAuth token against `api.anthropic.com/api/oauth/usage`.** Chosen. Verified to return HTTP 200 with the per-model `weekly_scoped` entry. It reuses a credential Claude Code already manages (no new secret stored, no cookie), and the token is only ever sent to Anthropic's own API.
- **Skip the feature.** Rejected: the number is visible in `/usage` and the desktop app, so the data is clearly available; a statusline surface is the whole point of this tool.

## Consequences

- **Unofficial endpoint / silent breakage.** The endpoint and its response schema are undocumented and may change without notice. The response even carries internal codename fields (`tangelo`, `omelette`, `iguana_necktie`, ...). If the `weekly_scoped` / `scope.model.display_name` shape changes, the segment renders nothing rather than erroring — there is no alarm path, so this doc and the README "Fable Usage" section must be the place users are pointed when the segment disappears. Verify with the cached response at `~/.claude/cache/fable-usage.json`, or run `scripts/fable-usage-test.sh` (in this repo) to hit the endpoint directly.
- **macOS only.** Authentication reads the keychain via `security`. On Linux and Windows the segment renders nothing. The item is intentionally left out of the default and compact layouts — it is opt-in.
- **Keychain access prompt.** Reading the keychain item may raise a macOS access prompt; choosing "Always Allow" is required to avoid a prompt every refresh. "Always Allow" widens no-prompt access to that item via the `security` CLI.
- **Call rate.** The statusline runs on every refresh, so the fetch is cached for 5 minutes (`FABLE_TTL`) and the timestamp slot is claimed *before* the request — a failed or hung request still counts, so a dead network stalls at most one render (bounded by `--max-time`) per 5 minutes rather than every render.
- **Token scope.** The token is Claude Code's subscription OAuth token. It is read at render time, sent only to `api.anthropic.com`, and never written to disk; only the non-secret usage JSON is cached.
