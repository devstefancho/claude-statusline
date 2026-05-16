# Read unofficial `fastMode` key from settings.json

To display Claude Code's fast mode (`/fast` toggle) in the statusline, we read the `fastMode` boolean from `~/.claude/settings.json` directly. The official statusline JSON does not expose this state, and the feature request to add it ([anthropics/claude-code#24279](https://github.com/anthropics/claude-code/issues/24279)) was closed as not planned.

## Considered Options

- **Wait for an official statusline JSON field.** Rejected: the upstream issue is closed as not planned, so this could be indefinite.
- **Skip the feature.** Rejected: this is the single statusline-relevant piece of session state with no other source.

## Consequences

- The `fastMode` key is undocumented and may be renamed, moved, or removed by any Claude Code release. If that happens the segment silently shows nothing — there is no alarm path, so the README must direct users here when they report the indicator is missing.
- Windows uses the same `settings.json` schema in principle, but this has not been verified end-to-end on a Windows host. The PowerShell implementation is best-effort and mirrors the bash logic.
- The statusline only refreshes on specific Claude Code events (new message, `/compact`, permission mode change, vim mode toggle). A bare `/fast` toggle does not trigger a refresh, so users who want immediate feedback must set `refreshInterval` in their `statusLine` config.
