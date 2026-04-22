# Claude Statusline for Windows PowerShell
# Read JSON input from stdin

$input_json = [Console]::In.ReadToEnd()
$data = $input_json | ConvertFrom-Json

# Read layout config
$configPath = Join-Path $env:USERPROFILE ".claude\statusline-config.json"
$compactMode = $false
if (Test-Path $configPath) {
    $config = Get-Content $configPath -Raw | ConvertFrom-Json
    if ($config.PSObject.Properties.Name -contains 'compact') {
        $compactMode = [bool]$config.compact
    }
    $line1Items = @($config.layout.line1)
    $line2Items = @($config.layout.line2)
    $line3Items = @($config.layout.line3)
} else {
    $line1Items = @("dir", "git", "worktree")
    $line2Items = @("model", "ctx", "used", "lines")
    $line3Items = @("sid", "style", "msg")
}

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
$lines_added = $data.cost.total_lines_added
$lines_removed = $data.cost.total_lines_removed

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
$PIPE = "${GRAY}|${RESET}"

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

function Is-1MModel {
    if (-not $model_name) { return $false }
    return ($model_name -match '(^|[^A-Za-z0-9])1[Mm]([^A-Za-z0-9]|$)')
}

# Pick color from (gray, yellow, red) by thresholds (warn, crit)
function Pick-Color($val, $warn, $crit) {
    if ($val -lt $warn) { return $GRAY }
    if ($val -lt $crit) { return $YELLOW }
    return $RED
}

function Compute-RelativePath {
    try {
        $git_check = git -C $current_dir rev-parse --is-inside-work-tree 2>$null
        if ($LASTEXITCODE -eq 0) {
            $git_root = git -C $current_dir rev-parse --show-toplevel 2>$null
            $repo_name = Split-Path -Leaf $git_root
            if ($current_dir -eq $git_root) {
                $rp = $repo_name
            } else {
                $rel_path = [System.IO.Path]::GetRelativePath($git_root, $current_dir)
                $rp = "$repo_name/$rel_path"
            }
        } else {
            throw "Not a git repo"
        }
    } catch {
        if ($current_dir -eq $project_dir) {
            $rp = Split-Path -Leaf $project_dir
        } else {
            $rel_path = [System.IO.Path]::GetRelativePath($project_dir, $current_dir)
            $base_name = Split-Path -Leaf $project_dir
            $rp = "$base_name/$rel_path"
        }
    }
    return ($rp -replace '\\', '/')
}

function Compute-GitStatus {
    try {
        $git_check = git -C $current_dir rev-parse --is-inside-work-tree 2>$null
        if ($LASTEXITCODE -ne 0) { return "" }
    } catch { return "" }

    $git_branch = git -C $current_dir symbolic-ref --short HEAD 2>$null
    if (-not $git_branch) { $git_branch = git -C $current_dir rev-parse --short HEAD 2>$null }
    $git_status_str = $git_branch

    if ($worktree_orig_branch) { $git_status_str += " ($worktree_orig_branch)" }

    $upstream = git -C $current_dir rev-parse --abbrev-ref '@{upstream}' 2>$null
    if ($upstream) {
        $ahead = git -C $current_dir rev-list --count '@{upstream}..HEAD' 2>$null
        $behind = git -C $current_dir rev-list --count 'HEAD..@{upstream}' 2>$null
        if ([int]$ahead -gt 0) { $git_status_str += " ↑$ahead" }
        if ([int]$behind -gt 0) { $git_status_str += " ↓$behind" }
    }

    $porcelain = git -C $current_dir status --porcelain 2>$null
    if ($porcelain) {
        $lines_p = $porcelain -split "`n"
        $untracked = ($lines_p | Where-Object { $_ -match '^\?\?' }).Count
        $staged = ($lines_p | Where-Object { $_ -match '^[MADRC]' }).Count
        $modified = ($lines_p | Where-Object { $_ -match '^.M' }).Count
        $deleted = ($lines_p | Where-Object { $_ -match '^.D' }).Count
        $conflicts = ($lines_p | Where-Object { $_ -match '^(UU|DD|AU|UA|UD|DU)' }).Count

        if ($untracked -gt 0) { $git_status_str += " ?$untracked" }
        if ($staged -gt 0) { $git_status_str += " +$staged" }
        if ($modified -gt 0) { $git_status_str += " ~$modified" }
        if ($deleted -gt 0) { $git_status_str += " -$deleted" }
        if ($conflicts -gt 0) { $git_status_str += " !$conflicts" }
    }

    return $git_status_str
}

# Precompute once — Render-Dir/Render-Git/Render-Proj all read these,
# so git is invoked at most a single set of times regardless of layout.
$relativePath = Compute-RelativePath
$gitStatusStr = Compute-GitStatus

# --- Render functions ---

function Render-Dir {
    return "${BLUE}DIR${RESET} ${GRAY}$relativePath${RESET}"
}

function Render-Git {
    if (-not $gitStatusStr) { return "" }
    return "${GREEN}GIT${RESET} ${GRAY}$gitStatusStr${RESET}"
}

function Render-Worktree {
    if ($worktree_name) {
        return "${CYAN}WORKTREE${RESET} ${GRAY}${GREEN}✓${RESET}${RESET}"
    } else {
        return "${CYAN}WORKTREE${RESET} ${GRAY}${RED}✗${RESET}${RESET}"
    }
}

function Render-Proj {
    $inside = ""
    if ($worktree_name) { $inside = "${GREEN}✓${RESET} " }
    $inside += "${BLUE}${relativePath}${RESET}"
    if ($gitStatusStr) { $inside += "  ${GREEN}${gitStatusStr}${RESET}" }
    if ($lines_added -ne $null -or $lines_removed -ne $null) {
        $a = if ($lines_added) { $lines_added } else { 0 }
        $r = if ($lines_removed) { $lines_removed } else { 0 }
        $inside += "  ${GREEN}+$a${RESET}${GRAY}/${RESET}${RED}-$r${RESET}"
    }
    return "${GRAY}[${RESET}${inside}${GRAY}]${RESET}"
}

function Render-Model {
    if ($compactMode) {
        $name = $model_name -replace '^Claude ', ''
        return "${GREEN}${name}${RESET}"
    }
    return "${GREEN}MODEL${RESET} ${GRAY}$model_name${RESET}"
}

function Render-Ctx {
    $used_int = [math]::Floor($used_pct)
    if ($compactMode) {
        $color = if (Is-1MModel) { Pick-Color $used_int 30 50 } else { Pick-Color $used_int 50 80 }
        return "${color}${used_int}%${RESET}"
    }
    $filled = [math]::Floor($used_int / 10)
    $empty = 10 - $filled
    $ctx_bar = "["
    for ($i = 0; $i -lt $filled; $i++) { $ctx_bar += [char]0x2588 }
    for ($i = 0; $i -lt $empty; $i++) { $ctx_bar += [char]0x2591 }
    $ctx_bar += "]"
    return "${MAGENTA}CTX${RESET} ${GRAY}$ctx_bar ${used_int}%${RESET}"
}

function Render-Used {
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
    if (-not $limit_str) { return "" }
    if ($compactMode) {
        return "${GRAY}$limit_str${RESET}"
    }
    return "${RED}USED${RESET} ${GRAY}$limit_str${RESET}"
}

function Render-Lines {
    if ($lines_added -eq $null -and $lines_removed -eq $null) { return "" }
    $a = if ($lines_added) { $lines_added } else { 0 }
    $r = if ($lines_removed) { $lines_removed } else { 0 }
    return "${GREEN}LINES${RESET} ${GRAY}+$a -$r${RESET}"
}

function Render-Sid {
    return "${CYAN}SID${RESET} ${GRAY}$session_id${RESET}"
}

function Render-Style {
    return "${YELLOW}STYLE${RESET} ${GRAY}$output_style${RESET}"
}

function Render-Msg {
    $last_user_message = "Empty"
    if ($transcript_path -and (Test-Path $transcript_path)) {
        try {
            $tlines = Get-Content -Path $transcript_path -Tail 100 -ErrorAction SilentlyContinue
            foreach ($tline in ($tlines | Select-Object -Last 100)) {
                try {
                    $entry = $tline | ConvertFrom-Json -ErrorAction SilentlyContinue
                    if ($entry.message.role -eq "user" -and $entry.message.content -is [string]) {
                        $last_user_message = $entry.message.content
                    }
                } catch {}
            }
            if ($last_user_message -and $last_user_message -ne "null" -and $last_user_message -ne "Empty") {
                # Strip control chars to prevent terminal escape injection from transcript content
                $last_user_message = $last_user_message -replace '[\x00-\x1F]', ''
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
    return "${WHITE}MSG${RESET} ${GRAY}$last_user_message${RESET}"
}

# --- Build output from config ---
function Build-Line($items) {
    $segments = @()
    foreach ($item in $items) {
        $seg = switch ($item) {
            "dir"      { Render-Dir }
            "git"      { Render-Git }
            "worktree" { Render-Worktree }
            "proj"     { Render-Proj }
            "model"    { Render-Model }
            "ctx"      { Render-Ctx }
            "used"     { Render-Used }
            "lines"    { Render-Lines }
            "sid"      { Render-Sid }
            "style"    { Render-Style }
            "msg"      { Render-Msg }
            default    { "" }
        }
        if ($seg) { $segments += $seg }
    }
    return ($segments -join " $PIPE ")
}

# Build and output each line
$outputLines = @()
$l1 = Build-Line $line1Items
$l2 = Build-Line $line2Items
$l3 = Build-Line $line3Items

if ($l1) { $outputLines += " $l1" }
if ($l2) { $outputLines += " $l2" }
if ($l3) { $outputLines += " $l3" }

Write-Host -NoNewline ($outputLines -join "`n")
