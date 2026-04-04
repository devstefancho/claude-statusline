**English** | [한국어](README.ko.md)

# @devstefancho/claude-statusline

An npx package for easily installing custom statusline configuration for Claude Code CLI.

## Screenshot

![claude-statusline screenshot](assets/screenshot.png)

## Features

The statusline is displayed in 3 lines, grouped by meaning:

```
 DIR repo/src | GIT main ↑2↓3 ?3 +2 ~4 -1 !1 | WORKTREE ✗
 MODEL Opus 4.6 (1M context) | CTX [████░░░░░░] 8% | USED 64%(0h1m) 23%(5d21h)
 SID a5bc4601... | STYLE default | MSG hi
```

### Line 1 — Workspace
- **DIR**: Current working directory (relative path from git root)
- **GIT**: Git status — branch, ahead/behind (`↑↓`), untracked (`?`), staged (`+`), modified (`~`), deleted (`-`), conflicts (`!`). Items with 0 count are hidden.
- **WORKTREE**: Worktree indicator — `✓` (green) with name if in a worktree, `✗` (red) if not

### Line 2 — Model / Resources
- **MODEL**: Active Claude model
- **CTX**: Context window usage (progress bar)
- **USED**: Rate limit usage (5-hour / 7-day with remaining time)

### Line 3 — Session
- **SID**: Session ID
- **STYLE**: Output style
- **MSG**: Last user message (preview)

## Supported Platforms

| Platform | Script | Dependencies |
|----------|--------|--------------|
| macOS / Linux | `claude-statusline.sh` (Bash) | jq (required), python3, git |
| Windows | `claude-statusline.ps1` (PowerShell) | python (optional), git |

## Installation

### Install directly from GitHub (not published to npm)

```bash
npx github:devstefancho/claude-statusline install
```

### Install from npm (after publishing)

```bash
npx @devstefancho/claude-statusline install
```

### Options

```bash
# Force install (overwrite existing files)
npx @devstefancho/claude-statusline install --force

# Backup existing files before install
npx @devstefancho/claude-statusline install --backup
```

## Commands

### install

Installs the statusline configuration.

```bash
npx @devstefancho/claude-statusline install [options]
```

| Option | Description |
|--------|-------------|
| `-f, --force` | Overwrite existing files |
| `-b, --backup` | Backup existing files before install |

### uninstall

Removes the statusline configuration.

```bash
npx @devstefancho/claude-statusline uninstall [options]
```

| Option | Description |
|--------|-------------|
| `--keep-script` | Keep script file, only remove settings |

### status

Check current installation status.

```bash
npx @devstefancho/claude-statusline status
```

## Requirements

### macOS / Linux

#### Required
- **jq**: Required for JSON parsing
  ```bash
  # macOS
  brew install jq

  # Ubuntu/Debian
  apt install jq
  ```

#### Recommended
- **python3**: Used for relative path calculation
- **git**: Used for git-relative path display

### Windows

Windows uses a PowerShell script, so **jq is not required**.

#### Recommended
- **python**: Used for relative path calculation (falls back to PowerShell built-in function if unavailable)
- **git**: Used for git-relative path display

## How It Works

1. Installs platform-specific script file:
   - macOS/Linux: `~/.claude/claude-statusline.sh`
   - Windows: `%USERPROFILE%\.claude\claude-statusline.ps1`
2. Adds statusLine configuration to `~/.claude/settings.json`

Restart Claude Code after installation to apply the statusline.

## Customization

After installation, you can customize the statusline by editing the script file directly.

```bash
# macOS/Linux
vim ~/.claude/claude-statusline.sh

# Windows (PowerShell)
notepad $env:USERPROFILE\.claude\claude-statusline.ps1
```

## Uninstallation

```bash
# Complete removal
npx @devstefancho/claude-statusline uninstall

# Remove settings only (keep script)
npx @devstefancho/claude-statusline uninstall --keep-script
```

## License

MIT
