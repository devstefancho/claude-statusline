# Manual Setup Guide

This guide explains how to manually install claude-statusline without using npx.

## Prerequisites

Before installation, ensure the following tools are available:

| Tool | Required | Purpose |
|------|----------|---------|
| jq | Yes | Parse JSON input from Claude Code |
| python3 | Yes | Calculate relative paths |
| git | No | Detect git repository root (optional) |
| curl | Yes | Download the script |

Check if prerequisites are installed:

```bash
# Check jq
jq --version

# Check python3
python3 --version

# Check git (optional)
git --version
```

## Installation Steps

### Step 1: Create the ~/.claude directory

```bash
mkdir -p ~/.claude
```

### Step 2: Download the script

```bash
curl -o ~/.claude/claude-statusline.sh \
  https://raw.githubusercontent.com/devstefancho/claude-statusline/main/assets/claude-statusline.sh
```

### Step 3: Make the script executable

```bash
chmod +x ~/.claude/claude-statusline.sh
```

### Step 4: Configure settings.json

Edit `~/.claude/settings.json` and add the statusLine configuration.

**If settings.json does not exist**, create it:

```bash
cat > ~/.claude/settings.json << 'EOF'
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/claude-statusline.sh"
  }
}
EOF
```

**If settings.json already exists**, add the statusLine key to the existing JSON. The file should include:

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/claude-statusline.sh"
  }
}
```

## Layout Configuration (Optional)

The statusline script reads `~/.claude/statusline-config.json` if present. When absent, it falls back to the default multi-line layout.

**Multi-line (default):**

```bash
cat > ~/.claude/statusline-config.json << 'EOF'
{
  "version": 1,
  "compact": false,
  "layout": {
    "line1": ["dir", "git", "worktree"],
    "line2": ["model", "ctx", "used", "lines"],
    "line3": ["sid", "style", "msg"]
  }
}
EOF
```

**Compact (single-line):**

```bash
cat > ~/.claude/statusline-config.json << 'EOF'
{
  "version": 1,
  "compact": true,
  "layout": {
    "line1": ["ctx", "proj", "model", "used"],
    "line2": [],
    "line3": []
  }
}
EOF
```

The `compact` flag changes how `ctx`, `model`, and `used` render (labels stripped, thresholded colors for `ctx`). Available items: `dir`, `git`, `worktree`, `proj`, `model`, `ctx`, `used`, `lines`, `sid`, `style`, `msg`.

## Verification

1. Restart Claude Code (close and reopen the terminal, then run `claude`)
2. You should see a status line at the bottom displaying:
   - Current directory (relative path)
   - Model name
   - Context window usage (progress bar)
   - Output style
   - Session ID
   - Last user message

Test the script manually:

```bash
echo '{"workspace":{"current_dir":"/tmp","project_dir":"/tmp"},"model":{"display_name":"Sonnet"},"output_style":{"name":"normal"},"transcript_path":"","session_id":"test123","context_window":{"used_percentage":25}}' | ~/.claude/claude-statusline.sh
```

## Uninstall

To remove claude-statusline:

```bash
# Remove the script
rm ~/.claude/claude-statusline.sh

# Remove statusLine from settings.json
# Edit ~/.claude/settings.json and delete the "statusLine" key
```

## Troubleshooting

### Status line not showing

1. Verify the script exists and is executable:
   ```bash
   ls -la ~/.claude/claude-statusline.sh
   ```

2. Check settings.json syntax:
   ```bash
   cat ~/.claude/settings.json | jq .
   ```

3. Ensure jq is installed:
   ```bash
   which jq
   ```

### Script errors

If the status line shows errors, test the script directly:

```bash
echo '{}' | ~/.claude/claude-statusline.sh
```

Check that python3 and jq are in your PATH.
