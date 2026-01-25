# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an npx-installable CLI tool that configures a custom statusline for Claude Code. It installs a platform-specific script (shell or PowerShell) and updates Claude's settings.json to display contextual information (current directory, model, context usage, style, session ID, last message) in the statusline.

## Platform Support

| Platform | Script | Dependencies |
|----------|--------|--------------|
| macOS / Linux | `claude-statusline.sh` | jq (required), python3, git |
| Windows | `claude-statusline.ps1` | python (optional), git |

## Commands

```bash
# Test the CLI locally
node bin/cli.js status

# Run install/uninstall
node bin/cli.js install [--force] [--backup]
node bin/cli.js uninstall [--keep-script]
```

## Architecture

```
bin/cli.js           # Entry point, uses Commander.js to define commands
src/commands/        # Command handlers (install, uninstall, status)
src/utils/
  config.js          # File operations for ~/.claude/settings.json and script installation
  dependency.js      # System dependency checks (jq, python3, git) - platform aware
  platform.js        # Platform detection utilities (isWindows, getScriptName)
assets/
  claude-statusline.sh   # Bash script for macOS/Linux
  claude-statusline.ps1  # PowerShell script for Windows
```

**Key paths managed by the tool:**
- `~/.claude/settings.json` - Claude Code settings (adds/removes `statusLine` config)
- macOS/Linux: `~/.claude/claude-statusline.sh`
- Windows: `%USERPROFILE%\.claude\claude-statusline.ps1`

## Dependencies

### macOS / Linux
- **jq** (required): Used by the shell script to parse JSON input from Claude Code
- **python3** (recommended): Used for relative path calculation in the shell script
- **git** (recommended): Used for git-relative path display

### Windows
- **jq**: Not required (PowerShell uses `ConvertFrom-Json`)
- **python** (optional): Used for relative path calculation (fallback: `[System.IO.Path]::GetRelativePath()`)
- **git** (recommended): Used for git-relative path display
