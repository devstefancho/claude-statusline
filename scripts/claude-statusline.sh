#!/bin/bash

# Read JSON input from stdin
input=$(cat)

# Read layout config
CONFIG_FILE="$HOME/.claude/statusline-config.json"
if [ -f "$CONFIG_FILE" ]; then
    LINE1_ITEMS=$(jq -r '.layout.line1[]?' "$CONFIG_FILE" 2>/dev/null)
    LINE2_ITEMS=$(jq -r '.layout.line2[]?' "$CONFIG_FILE" 2>/dev/null)
    LINE3_ITEMS=$(jq -r '.layout.line3[]?' "$CONFIG_FILE" 2>/dev/null)
else
    LINE1_ITEMS="dir git worktree"
    LINE2_ITEMS="model ctx used lines"
    LINE3_ITEMS="sid style msg"
fi

# Extract data from JSON (all at once to avoid repeated jq calls)
eval "$(echo "$input" | jq -r '
  @sh "current_dir=\(.workspace.current_dir)",
  @sh "project_dir=\(.workspace.project_dir)",
  @sh "model_name=\(.model.display_name)",
  @sh "output_style=\(.output_style.name)",
  @sh "transcript_path=\(.transcript_path)",
  @sh "session_id=\(.session_id)",
  @sh "used_pct=\(.context_window.used_percentage // 0)",
  @sh "five_hour_pct=\(.rate_limits.five_hour.used_percentage // empty)",
  @sh "five_hour_resets=\(.rate_limits.five_hour.resets_at // empty)",
  @sh "seven_day_pct=\(.rate_limits.seven_day.used_percentage // empty)",
  @sh "seven_day_resets=\(.rate_limits.seven_day.resets_at // empty)",
  @sh "worktree_name=\(.worktree.name // empty)",
  @sh "worktree_orig_branch=\(.worktree.original_branch // empty)",
  @sh "lines_added=\(.cost.total_lines_added // empty)",
  @sh "lines_removed=\(.cost.total_lines_removed // empty)"
' 2>/dev/null)"

# ANSI color codes
BLUE='\033[34m'
GREEN='\033[32m'
YELLOW='\033[33m'
CYAN='\033[36m'
WHITE='\033[37m'
GRAY='\033[90m'
MAGENTA='\033[35m'
RED='\033[31m'
RESET='\033[0m'
PIPE="${GRAY}|${RESET}"

# Format remaining time from unix epoch to human readable
format_remaining() {
    local resets_at=$1
    if [ -z "$resets_at" ]; then return; fi
    local now=$(date +%s)
    local remaining=$((resets_at - now))
    if [ $remaining -le 0 ]; then return; fi
    local days=$((remaining / 86400))
    local hours=$(( (remaining % 86400) / 3600 ))
    local mins=$(( (remaining % 3600) / 60 ))
    if [ $days -gt 0 ]; then
        echo "${days}d${hours}h"
    else
        echo "${hours}h${mins}m"
    fi
}

# --- Render functions ---
# Each outputs a colored segment string or nothing if data is unavailable.
# All JSON fields are parsed above; render functions use those variables.

render_dir() {
    local relative_path=""
    if git -C "$current_dir" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        local git_root
        git_root=$(git -C "$current_dir" rev-parse --show-toplevel)
        local repo_name
        repo_name=$(basename "$git_root")
        if [ "$current_dir" = "$git_root" ]; then
            relative_path="$repo_name"
        else
            local rel_path
            rel_path=$(python3 -c "import os; print(os.path.relpath('$current_dir', '$git_root'))" 2>/dev/null || echo "")
            relative_path="$repo_name/$rel_path"
        fi
    else
        if [ "$current_dir" = "$project_dir" ]; then
            relative_path="$(basename "$project_dir")"
        else
            local rel_path
            rel_path=$(python3 -c "import os; print(os.path.relpath('$current_dir', '$project_dir'))" 2>/dev/null || echo "")
            relative_path="$(basename "$project_dir")/$rel_path"
        fi
    fi
    echo "${BLUE}DIR${RESET} ${GRAY}$relative_path${RESET}"
}

render_git() {
    if ! git -C "$current_dir" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        return
    fi

    local git_branch
    git_branch=$(git -C "$current_dir" symbolic-ref --short HEAD 2>/dev/null || git -C "$current_dir" rev-parse --short HEAD 2>/dev/null)
    local git_status_str="$git_branch"

    # Original branch (when in worktree)
    [ -n "$worktree_orig_branch" ] && git_status_str="$git_status_str ($worktree_orig_branch)"

    # Ahead/Behind
    local upstream
    upstream=$(git -C "$current_dir" rev-parse --abbrev-ref '@{upstream}' 2>/dev/null)
    if [ -n "$upstream" ]; then
        local ahead behind
        ahead=$(git -C "$current_dir" rev-list --count '@{upstream}..HEAD' 2>/dev/null)
        behind=$(git -C "$current_dir" rev-list --count 'HEAD..@{upstream}' 2>/dev/null)
        [ "$ahead" -gt 0 ] 2>/dev/null && git_status_str="$git_status_str ↑$ahead"
        [ "$behind" -gt 0 ] 2>/dev/null && git_status_str="$git_status_str ↓$behind"
    fi

    # File statuses from git status --porcelain
    local porcelain
    porcelain=$(git -C "$current_dir" status --porcelain 2>/dev/null)
    if [ -n "$porcelain" ]; then
        local untracked staged modified deleted conflicts
        untracked=$(echo "$porcelain" | grep -c '^??')
        staged=$(echo "$porcelain" | grep -c '^[MADRC]')
        modified=$(echo "$porcelain" | grep -c '^.M')
        deleted=$(echo "$porcelain" | grep -c '^.D')
        conflicts=$(echo "$porcelain" | grep -c '^UU\|^DD\|^AU\|^UA\|^UD\|^DU')

        [ "$untracked" -gt 0 ] && git_status_str="$git_status_str ?$untracked"
        [ "$staged" -gt 0 ] && git_status_str="$git_status_str +$staged"
        [ "$modified" -gt 0 ] && git_status_str="$git_status_str ~$modified"
        [ "$deleted" -gt 0 ] && git_status_str="$git_status_str -$deleted"
        [ "$conflicts" -gt 0 ] && git_status_str="$git_status_str !$conflicts"
    fi

    echo "${GREEN}GIT${RESET} ${GRAY}$git_status_str${RESET}"
}

render_worktree() {
    local worktree_str
    if [ -n "$worktree_name" ]; then
        worktree_str="${GREEN}✓${RESET}"
    else
        worktree_str="${RED}✗${RESET}"
    fi
    echo "${CYAN}WORKTREE${RESET} ${GRAY}$worktree_str${RESET}"
}

render_model() {
    echo "${GREEN}MODEL${RESET} ${GRAY}$model_name${RESET}"
}

render_ctx() {
    local used_int=${used_pct%.*}
    local filled=$((used_int / 10))
    local empty=$((10 - filled))
    local ctx_bar="["
    for ((i=0; i<filled; i++)); do ctx_bar+="█"; done
    for ((i=0; i<empty; i++)); do ctx_bar+="░"; done
    ctx_bar+="]"
    echo "${MAGENTA}CTX${RESET} ${GRAY}$ctx_bar ${used_int}%${RESET}"
}

render_used() {
    local limit_str=""
    if [ -n "$five_hour_pct" ]; then
        local five_h_int=${five_hour_pct%.*}
        local five_h_remaining
        five_h_remaining=$(format_remaining "$five_hour_resets")
        limit_str="${five_h_int}%"
        [ -n "$five_h_remaining" ] && limit_str="${limit_str}(${five_h_remaining})"
    fi
    if [ -n "$seven_day_pct" ]; then
        local seven_d_int=${seven_day_pct%.*}
        local seven_d_remaining
        seven_d_remaining=$(format_remaining "$seven_day_resets")
        local part="${seven_d_int}%"
        [ -n "$seven_d_remaining" ] && part="${part}(${seven_d_remaining})"
        limit_str="${limit_str:+$limit_str }${part}"
    fi
    [ -z "$limit_str" ] && return
    echo "${RED}USED${RESET} ${GRAY}$limit_str${RESET}"
}

render_lines() {
    [ -z "$lines_added" ] && [ -z "$lines_removed" ] && return
    echo "${GREEN}LINES${RESET} ${GRAY}+${lines_added:-0} -${lines_removed:-0}${RESET}"
}

render_sid() {
    echo "${CYAN}SID${RESET} ${GRAY}$session_id${RESET}"
}

render_style() {
    echo "${YELLOW}STYLE${RESET} ${GRAY}$output_style${RESET}"
}

render_msg() {
    local last_user_message="Empty"
    if [ -n "$transcript_path" ] && [ -f "$transcript_path" ]; then
        last_user_message=$(tail -n 100 "$transcript_path" 2>/dev/null | jq -r 'select(.message.role == "user" and (.message.content | type == "string")) | .message.content' | tail -n 1 | head -c 200)
        if [ -n "$last_user_message" ] && [ "$last_user_message" != "null" ]; then
            if [ ${#last_user_message} -eq 200 ]; then
                last_user_message="${last_user_message}..."
            fi
        else
            last_user_message="Empty"
        fi
    fi
    echo "${WHITE}MSG${RESET} ${GRAY}$last_user_message${RESET}"
}

# --- Build output from config ---
build_line() {
    local items="$1"
    local segments=()
    for item in $items; do
        local seg=""
        case "$item" in
            dir)      seg=$(render_dir) ;;
            git)      seg=$(render_git) ;;
            worktree) seg=$(render_worktree) ;;
            model)    seg=$(render_model) ;;
            ctx)      seg=$(render_ctx) ;;
            used)     seg=$(render_used) ;;
            lines)    seg=$(render_lines) ;;
            sid)      seg=$(render_sid) ;;
            style)    seg=$(render_style) ;;
            msg)      seg=$(render_msg) ;;
        esac
        [ -n "$seg" ] && segments+=("$seg")
    done

    # Join segments with pipe
    local result=""
    for seg in "${segments[@]}"; do
        [ -n "$result" ] && result="$result $PIPE "
        result="$result$seg"
    done
    echo "$result"
}

# Build and output each line
output=""
line1=$(build_line "$LINE1_ITEMS")
line2=$(build_line "$LINE2_ITEMS")
line3=$(build_line "$LINE3_ITEMS")

[ -n "$line1" ] && output=" $line1"
[ -n "$line2" ] && output="$output${output:+\n} $line2"
[ -n "$line3" ] && output="$output${output:+\n} $line3"

printf '%b' "$output"
