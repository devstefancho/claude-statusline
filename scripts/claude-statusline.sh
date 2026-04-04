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

# Build worktree string (only if in worktree session)
worktree_str=""
if [ -n "$worktree_name" ]; then
    worktree_str="$worktree_name"
    [ -n "$worktree_orig_branch" ] && worktree_str="$worktree_str ($worktree_orig_branch)"
fi

RED='\033[31m'

# Define status line components (순서 변경/추가/삭제 용이)
components=(
    "${BLUE}DIR${RESET} ${GRAY}$relative_path${RESET}"
    "${GREEN}MODEL${RESET} ${GRAY}$model_name${RESET}"
    "${MAGENTA}CTX${RESET} ${GRAY}$ctx_bar ${used_int}%${RESET}"
)
[ -n "$limit_str" ] && components+=("${RED}USED${RESET} ${GRAY}$limit_str${RESET}")
components+=(
    "${YELLOW}STYLE${RESET} ${GRAY}$output_style${RESET}"
)
[ -n "$worktree_str" ] && components+=("${CYAN}WORKTREE${RESET} ${GRAY}$worktree_str${RESET}")
components+=(
    "${CYAN}SID${RESET} ${GRAY}$session_id${RESET}"
    "${WHITE}MSG${RESET} ${GRAY}$last_user_message${RESET}"
)

# Output the status line (join with gray ' | ')
PIPE="${GRAY}|${RESET}"
result=""
for i in "${!components[@]}"; do
    if [ $i -gt 0 ]; then
        result+=" ${PIPE} "
    fi
    result+="${components[$i]}"
done
printf ' %b' "$result"
