#!/bin/bash

# Read JSON input from stdin
input=$(cat)

# Extract data from JSON
current_dir=$(echo "$input" | jq -r '.workspace.current_dir')
project_dir=$(echo "$input" | jq -r '.workspace.project_dir')
model_name=$(echo "$input" | jq -r '.model.display_name')
output_style=$(echo "$input" | jq -r '.output_style.name')
transcript_path=$(echo "$input" | jq -r '.transcript_path')
session_id=$(echo "$input" | jq -r '.session_id')
used_pct=$(echo "$input" | jq -r '.context_window.used_percentage // 0')
five_hour_pct=$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // empty')
five_hour_resets=$(echo "$input" | jq -r '.rate_limits.five_hour.resets_at // empty')
seven_day_pct=$(echo "$input" | jq -r '.rate_limits.seven_day.used_percentage // empty')
seven_day_resets=$(echo "$input" | jq -r '.rate_limits.seven_day.resets_at // empty')
worktree_name=$(echo "$input" | jq -r '.worktree.name // empty')
worktree_orig_branch=$(echo "$input" | jq -r '.worktree.original_branch // empty')

# Get relative path
if git -C "$current_dir" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git_root=$(git -C "$current_dir" rev-parse --show-toplevel)
    repo_name=$(basename "$git_root")
    if [ "$current_dir" = "$git_root" ]; then
        relative_path="$repo_name"
    else
        rel_path=$(python3 -c "import os; print(os.path.relpath('$current_dir', '$git_root'))")
        relative_path="$repo_name/$rel_path"
    fi
else
    if [ "$current_dir" = "$project_dir" ]; then
        relative_path="$(basename "$project_dir")"
    else
        rel_path=$(python3 -c "import os; print(os.path.relpath('$current_dir', '$project_dir'))")
        relative_path="$(basename "$project_dir")/$rel_path"
    fi
fi

# Get last user message
if [ -n "$transcript_path" ] && [ -f "$transcript_path" ]; then
    last_user_message=$(tail -n 100 "$transcript_path" 2>/dev/null | jq -r 'select(.message.role == "user" and (.message.content | type == "string")) | .message.content' | tail -n 1 | head -c 200)
    if [ -n "$last_user_message" ] && [ "$last_user_message" != "null" ]; then
        if [ ${#last_user_message} -eq 200 ]; then
            last_user_message="${last_user_message}..."
        fi
    else
        last_user_message="Empty"
    fi
else
    last_user_message="Empty"
fi

# Build context progress bar
used_int=${used_pct%.*}
filled=$((used_int / 10))
empty=$((10 - filled))
ctx_bar="["
for ((i=0; i<filled; i++)); do ctx_bar+="█"; done
for ((i=0; i<empty; i++)); do ctx_bar+="░"; done
ctx_bar+="]"

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

# Build rate limit string (only if data exists)
limit_str=""
if [ -n "$five_hour_pct" ]; then
    five_h_int=${five_hour_pct%.*}
    five_h_remaining=$(format_remaining "$five_hour_resets")
    limit_str="${five_h_int}%"
    [ -n "$five_h_remaining" ] && limit_str="${limit_str}(${five_h_remaining})"
fi
if [ -n "$seven_day_pct" ]; then
    seven_d_int=${seven_day_pct%.*}
    seven_d_remaining=$(format_remaining "$seven_day_resets")
    part="${seven_d_int}%"
    [ -n "$seven_d_remaining" ] && part="${part}(${seven_d_remaining})"
    limit_str="${limit_str:+$limit_str }${part}"
fi

# Build worktree string (colored check/cross)
worktree_str=""
if [ -n "$worktree_name" ]; then
    worktree_str="${GREEN}✓${RESET} ${GRAY}$worktree_name"
    [ -n "$worktree_orig_branch" ] && worktree_str="$worktree_str ($worktree_orig_branch)"
    worktree_str="${worktree_str}${RESET}"
else
    worktree_str="${RED}✗${RESET}"
fi

# Build git status string
git_status_str=""
if git -C "$current_dir" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    # Branch name
    git_branch=$(git -C "$current_dir" symbolic-ref --short HEAD 2>/dev/null || git -C "$current_dir" rev-parse --short HEAD 2>/dev/null)
    git_status_str="$git_branch"

    # Ahead/Behind
    upstream=$(git -C "$current_dir" rev-parse --abbrev-ref '@{upstream}' 2>/dev/null)
    if [ -n "$upstream" ]; then
        ahead=$(git -C "$current_dir" rev-list --count '@{upstream}..HEAD' 2>/dev/null)
        behind=$(git -C "$current_dir" rev-list --count 'HEAD..@{upstream}' 2>/dev/null)
        [ "$ahead" -gt 0 ] 2>/dev/null && git_status_str="$git_status_str ↑$ahead"
        [ "$behind" -gt 0 ] 2>/dev/null && git_status_str="$git_status_str ↓$behind"
    fi

    # File statuses from git status --porcelain
    porcelain=$(git -C "$current_dir" status --porcelain 2>/dev/null)
    if [ -n "$porcelain" ]; then
        untracked=$(echo "$porcelain" | grep -c '^??')
        # Staged: first column is [MADRC] (not ? or U)
        staged=$(echo "$porcelain" | grep -c '^[MADRC]')
        # Modified (unstaged): second column is M
        modified=$(echo "$porcelain" | grep -c '^.M')
        # Deleted (unstaged): second column is D
        deleted=$(echo "$porcelain" | grep -c '^.D')
        # Conflicts: both columns are U, or DD, AU, UA patterns
        conflicts=$(echo "$porcelain" | grep -c '^UU\|^DD\|^AU\|^UA\|^UD\|^DU')

        [ "$untracked" -gt 0 ] && git_status_str="$git_status_str ?$untracked"
        [ "$staged" -gt 0 ] && git_status_str="$git_status_str +$staged"
        [ "$modified" -gt 0 ] && git_status_str="$git_status_str ~$modified"
        [ "$deleted" -gt 0 ] && git_status_str="$git_status_str -$deleted"
        [ "$conflicts" -gt 0 ] && git_status_str="$git_status_str !$conflicts"
    fi
fi

# --- Line 1: Workspace ---
PIPE="${GRAY}|${RESET}"
line1="${BLUE}DIR${RESET} ${GRAY}$relative_path${RESET}"
if [ -n "$git_status_str" ]; then
    line1="$line1 ${PIPE} ${GREEN}GIT${RESET} ${GRAY}$git_status_str${RESET}"
fi
line1="$line1 ${PIPE} ${CYAN}WORKTREE${RESET} ${GRAY}$worktree_str${RESET}"

# --- Line 2: Model / Resources ---
line2="${GREEN}MODEL${RESET} ${GRAY}$model_name${RESET}"
line2="$line2 ${PIPE} ${MAGENTA}CTX${RESET} ${GRAY}$ctx_bar ${used_int}%${RESET}"
[ -n "$limit_str" ] && line2="$line2 ${PIPE} ${RED}USED${RESET} ${GRAY}$limit_str${RESET}"

# --- Line 3: Session ---
line3="${CYAN}SID${RESET} ${GRAY}$session_id${RESET}"
line3="$line3 ${PIPE} ${YELLOW}STYLE${RESET} ${GRAY}$output_style${RESET}"
line3="$line3 ${PIPE} ${WHITE}MSG${RESET} ${GRAY}$last_user_message${RESET}"

# Output the status lines
printf ' %b\n %b\n %b' "$line1" "$line2" "$line3"
