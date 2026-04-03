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
$seven_day_pct = $data.rate_limits.seven_day.used_percentage
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

# Build rate limit string (only if data exists)
$limit_str = ""
if ($five_hour_pct -ne $null) {
    $limit_str = "5h:$([math]::Floor($five_hour_pct))%"
}
if ($seven_day_pct -ne $null) {
    if ($limit_str) { $limit_str += " " }
    $limit_str += "7d:$([math]::Floor($seven_day_pct))%"
}

# Build worktree string (only if in worktree session)
$worktree_str = ""
if ($worktree_name) {
    $worktree_str = $worktree_name
    if ($worktree_orig_branch) {
        $worktree_str += " ($worktree_orig_branch)"
    }
}

# Define status line components
$components = @(
    "${BLUE}DIR${RESET} ${GRAY}$relative_path${RESET}",
    "${GREEN}MODEL${RESET} ${GRAY}$model_name${RESET}",
    "${MAGENTA}CTX${RESET} ${GRAY}$ctx_bar ${used_int}%${RESET}"
)
if ($limit_str) {
    $components += "${RED}LIMIT${RESET} ${GRAY}$limit_str${RESET}"
}
$components += "${YELLOW}STYLE${RESET} ${GRAY}$output_style${RESET}"
if ($worktree_str) {
    $components += "${CYAN}WORKTREE${RESET} ${GRAY}$worktree_str${RESET}"
}
$components += @(
    "${CYAN}SID${RESET} ${GRAY}$session_id${RESET}",
    "${WHITE}MSG${RESET} ${GRAY}$last_user_message${RESET}"
)

# Output the status line (join with gray ' | ')
$PIPE = "${GRAY}|${RESET}"
$result = " " + ($components -join " $PIPE ")
Write-Host -NoNewline $result
