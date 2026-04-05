**English** | [한국어](README.ko.md)

# @devstefancho/claude-statusline

An npx package for easily installing custom statusline configuration for Claude Code CLI.

## Screenshot

### Without Worktree
![claude-statusline without worktree](assets/no-worktree.png)

### With Worktree
![claude-statusline with worktree](assets/worktree.png)

## Features

The statusline is displayed in 3 lines, grouped by meaning:

```
 DIR repo/src | GIT main (main) ↑2↓3 ?3 +2 ~4 -1 !1 | WORKTREE ✓
 MODEL Opus 4.6 (1M context) | CTX [████░░░░░░] 8% | USED 64%(0h1m) 23%(5d21h) | LINES +42 -15
 SID a5bc4601... | STYLE default | MSG hi
```

### Available Items

| Item | Description | Default Line |
|------|-------------|:------------:|
| `dir` | Current working directory (relative path from git root) | 1 |
| `git` | Branch, ahead/behind, file status (untracked/staged/modified/deleted/conflicts) | 1 |
| `worktree` | Worktree indicator — `✓` (green) / `✗` (red) | 1 |
| `model` | Active Claude model name | 2 |
| `ctx` | Context window usage (progress bar) | 2 |
| `used` | Rate limit usage (5-hour / 7-day with remaining time) | 2 |
| `lines` | Lines added/removed in session (`+42 -15`) | 2 |
| `sid` | Session ID | 3 |
| `style` | Output style | 3 |
| `msg` | Last user message (preview, truncated to 200 chars) | 3 |

All items can be toggled on/off and assigned to any line (1, 2, or 3) via interactive install.

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

### Interactive Install

Select which items to display and assign them to lines interactively:

```bash
npx @devstefancho/claude-statusline install -i
```

The interactive mode lets you:
1. **Select items** — Toggle items on/off with space, toggle all with `a`
2. **Assign lines** — Place each item on Line 1, 2, or 3 (or use the default layout)

Your choices are saved to `~/.claude/statusline-config.json` and the scripts read this config at runtime.

### Options

```bash
# Force install (overwrite existing files)
npx @devstefancho/claude-statusline install --force

# Backup existing files before install
npx @devstefancho/claude-statusline install --backup

# Interactive item & layout selection
npx @devstefancho/claude-statusline install -i

# Skip interactive mode, use default layout
npx @devstefancho/claude-statusline install --default
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
| `-i, --interactive` | Interactively select items and line layout |
| `--default` | Skip interactive mode, use default layout |

### uninstall

Removes the statusline configuration.

```bash
npx @devstefancho/claude-statusline uninstall [options]
```

| Option | Description |
|--------|-------------|
| `--keep-script` | Keep script file, only remove settings |

### status

Check current installation status, including layout configuration.

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
2. Saves layout config to `~/.claude/statusline-config.json`
3. Adds statusLine configuration to `~/.claude/settings.json`

Restart Claude Code after installation to apply the statusline.

## Customization

### Via Interactive Install

Re-run with `--force` and `-i` to reconfigure items and layout:

```bash
npx @devstefancho/claude-statusline install --force -i
```

### Via Config File

Edit the layout config directly:

```bash
vim ~/.claude/statusline-config.json
```

Example config:
```json
{
  "version": 1,
  "layout": {
    "line1": ["dir", "git", "worktree"],
    "line2": ["model", "ctx", "used", "lines"],
    "line3": ["sid", "style", "msg"]
  }
}
```

### Via Script File

You can also edit the script file directly for advanced customization:

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
