# Claude Statusline for Windows PowerShell
# Read JSON input from stdin

$input_json = [Console]::In.ReadToEnd()
$data = $input_json | ConvertFrom-Json

# Extract data from JSON
$current_dir = $data.workspace.current_dir
$project_dir = $data.workspace.project_dir
$model_name = $data.model.display_name
$output_style = $data.output_style.name
$transcript_path = $data.transcript_path
$session_id = $data.session_id
$used_pct = if ($data.context_window.used_percentage) { $data.context_window.used_percentage } else { 0 }
$five_hour_pct = $data.rate_limits.five_hour.used_percentage
$five_hour_resets = $data.rate_limits.five_hour.resets_at
$seven_day_pct = $data.rate_limits.seven_day.used_percentage
$seven_day_resets = $data.rate_limits.seven_day.resets_at
$worktree_name = $data.worktree.name
$worktree_orig_branch = $data.worktree.original_branch

# Get relative path
$relative_path = ""
try {
    $git_check = git -C $current_dir rev-parse --is-inside-work-tree 2>$null
    if ($LASTEXITCODE -eq 0) {
        $git_root = git -C $current_dir rev-parse --show-toplevel 2>$null
        $repo_name = Split-Path -Leaf $git_root
        if ($current_dir -eq $git_root) {
            $relative_path = $repo_name
        } else {
            $rel_path = [System.IO.Path]::GetRelativePath($git_root, $current_dir)
            $relative_path = "$repo_name/$rel_path"
        }
    } else {
        throw "Not a git repo"
    }
} catch {
    if ($current_dir -eq $project_dir) {
        $relative_path = Split-Path -Leaf $project_dir
    } else {
        $rel_path = [System.IO.Path]::GetRelativePath($project_dir, $current_dir)
        $base_name = Split-Path -Leaf $project_dir
        $relative_path = "$base_name/$rel_path"
    }
}

# Normalize path separators for display
$relative_path = $relative_path -replace '\\', '/'

# Get last user message
$last_user_message = "Empty"
if ($transcript_path -and (Test-Path $transcript_path)) {
    try {
        $lines = Get-Content -Path $transcript_path -Tail 100 -ErrorAction SilentlyContinue
        foreach ($line in ($lines | Select-Object -Last 100)) {
            try {
                $entry = $line | ConvertFrom-Json -ErrorAction SilentlyContinue
                if ($entry.message.role -eq "user" -and $entry.message.content -is [string]) {
                    $last_user_message = $entry.message.content
                }
            } catch {
                # Skip invalid JSON lines
            }
        }
        if ($last_user_message -and $last_user_message -ne "null" -and $last_user_message -ne "Empty") {
            if ($last_user_message.Length -gt 200) {
                $last_user_message = $last_user_message.Substring(0, 200) + "..."
            }
        } else {
            $last_user_message = "Empty"
        }
    } catch {
        $last_user_message = "Empty"
    }
}

# Build context progress bar
$used_int = [math]::Floor($used_pct)
$filled = [math]::Floor($used_int / 10)
$empty = 10 - $filled
$ctx_bar = "["
for ($i = 0; $i -lt $filled; $i++) { $ctx_bar += [char]0x2588 }  # █
for ($i = 0; $i -lt $empty; $i++) { $ctx_bar += [char]0x2591 }   # ░
$ctx_bar += "]"

# ANSI color codes
$BLUE = "`e[34m"
$GREEN = "`e[32m"
$YELLOW = "`e[33m"
$CYAN = "`e[36m"
$WHITE = "`e[37m"
$GRAY = "`e[90m"
$MAGENTA = "`e[35m"
$RED = "`e[31m"
$RESET = "`e[0m"

# Format remaining time from unix epoch to human readable
function Format-Remaining($resets_at) {
    if (-not $resets_at) { return "" }
    $now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $remaining = $resets_at - $now
    if ($remaining -le 0) { return "" }
    $days = [math]::Floor($remaining / 86400)
    $hours = [math]::Floor(($remaining % 86400) / 3600)
    $mins = [math]::Floor(($remaining % 3600) / 60)
    if ($days -gt 0) { return "${days}d${hours}h" }
    else { return "${hours}h${mins}m" }
}

# Build rate limit string (only if data exists)
$limit_str = ""
if ($five_hour_pct -ne $null) {
    $pct = [math]::Floor($five_hour_pct)
    $rem = Format-Remaining $five_hour_resets
    $limit_str = "${pct}%"
    if ($rem) { $limit_str += "(${rem})" }
}
if ($seven_day_pct -ne $null) {
    $pct = [math]::Floor($seven_day_pct)
    $rem = Format-Remaining $seven_day_resets
    $part = "${pct}%"
    if ($rem) { $part += "(${rem})" }
    if ($limit_str) { $limit_str += " " }
    $limit_str += $part
}

# Build worktree string
$worktree_str = ""
if ($worktree_name) {
    $worktree_str = "${GREEN}$([char]0x2713)${RESET}"
} else {
    $worktree_str = "${RED}$([char]0x2717)${RESET}"
}

# Build git status string
$git_status_str = ""
try {
    $git_check = git -C $current_dir rev-parse --is-inside-work-tree 2>$null
    if ($LASTEXITCODE -eq 0) {
        $git_branch = git -C $current_dir symbolic-ref --short HEAD 2>$null
        if (-not $git_branch) { $git_branch = git -C $current_dir rev-parse --short HEAD 2>$null }
        $git_status_str = $git_branch
        if ($worktree_orig_branch) { $git_status_str += " ($worktree_orig_branch)" }
        $upstream = git -C $current_dir rev-parse --abbrev-ref '@{upstream}' 2>$null
        if ($upstream) {
            $ahead = git -C $current_dir rev-list --count '@{upstream}..HEAD' 2>$null
            $behind = git -C $current_dir rev-list --count 'HEAD..@{upstream}' 2>$null
            if ([int]$ahead -gt 0) { $git_status_str += " ${[char]0x2191}$ahead" }
            if ([int]$behind -gt 0) { $git_status_str += " ${[char]0x2193}$behind" }
        }
        $porcelain = git -C $current_dir status --porcelain 2>$null
        if ($porcelain) {
            $lines_arr = $porcelain -split "`n"
            $untracked = ($lines_arr | Where-Object { $_ -match '^\?\?' }).Count
            $staged = ($lines_arr | Where-Object { $_ -match '^[MADRC]' }).Count
            $modified = ($lines_arr | Where-Object { $_ -match '^.M' }).Count
            $deleted = ($lines_arr | Where-Object { $_ -match '^.D' }).Count
            if ($untracked -gt 0) { $git_status_str += " ?$untracked" }
            if ($staged -gt 0) { $git_status_str += " +$staged" }
            if ($modified -gt 0) { $git_status_str += " ~$modified" }
            if ($deleted -gt 0) { $git_status_str += " -$deleted" }
        }
    }
} catch {}

# --- Build output based on CLAUDE_STATUSLINE_LINES ---
# Default: 1 line (compact). Set CLAUDE_STATUSLINE_LINES=3 for full 3-line display.
$PIPE = "${GRAY}|${RESET}"
$STATUS_LINES = if ($env:CLAUDE_STATUSLINE_LINES) { $env:CLAUDE_STATUSLINE_LINES } else { "1" }

if ($STATUS_LINES -eq "3") {
    # --- 3-line mode ---
    $line1 = "${BLUE}DIR${RESET} ${GRAY}$relative_path${RESET}"
    if ($git_status_str) { $line1 += " $PIPE ${GREEN}GIT${RESET} ${GRAY}$git_status_str${RESET}" }
    $line1 += " $PIPE ${CYAN}WORKTREE${RESET} ${GRAY}$worktree_str${RESET}"

    $line2 = "${GREEN}MODEL${RESET} ${GRAY}$model_name${RESET}"
    $line2 += " $PIPE ${MAGENTA}CTX${RESET} ${GRAY}$ctx_bar ${used_int}%${RESET}"
    if ($limit_str) { $line2 += " $PIPE ${RED}USED${RESET} ${GRAY}$limit_str${RESET}" }

    $line3 = "${CYAN}SID${RESET} ${GRAY}$session_id${RESET}"
    $line3 += " $PIPE ${YELLOW}STYLE${RESET} ${GRAY}$output_style${RESET}"
    $line3 += " $PIPE ${WHITE}MSG${RESET} ${GRAY}$last_user_message${RESET}"

    Write-Host -NoNewline " $line1`n $line2`n $line3"

} elseif ($STATUS_LINES -eq "2") {
    # --- 2-line mode ---
    $line1 = "${BLUE}DIR${RESET} ${GRAY}$relative_path${RESET}"
    if ($git_status_str) { $line1 += " $PIPE ${GREEN}GIT${RESET} ${GRAY}$git_status_str${RESET}" }
    $line1 += " $PIPE ${CYAN}WORKTREE${RESET} ${GRAY}$worktree_str${RESET}"

    $line2 = "${MAGENTA}CTX${RESET} ${GRAY}$ctx_bar ${used_int}%${RESET}"
    if ($limit_str) { $line2 += " $PIPE ${RED}USED${RESET} ${GRAY}$limit_str${RESET}" }
    $line2 += " $PIPE ${YELLOW}STYLE${RESET} ${GRAY}$output_style${RESET}"
    $line2 += " $PIPE ${WHITE}MSG${RESET} ${GRAY}$last_user_message${RESET}"

    Write-Host -NoNewline " $line1`n $line2"

} else {
    # --- 1-line mode (default, compact) ---
    $line = "${BLUE}DIR${RESET} ${GRAY}$relative_path${RESET}"
    if ($git_status_str) { $line += " $PIPE ${GREEN}GIT${RESET} ${GRAY}$git_status_str${RESET}" }
    $line += " $PIPE ${MAGENTA}CTX${RESET} ${GRAY}${used_int}%${RESET}"
    if ($limit_str) { $line += " $PIPE ${RED}USED${RESET} ${GRAY}$limit_str${RESET}" }
    $line += " $PIPE ${YELLOW}STYLE${RESET} ${GRAY}$output_style${RESET}"

    Write-Host -NoNewline " $line"
}
