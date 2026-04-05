[English](README.md) | **한국어**

# @devstefancho/claude-statusline

Claude Code CLI를 위한 커스텀 statusline 설정을 간편하게 설치할 수 있는 npx 패키지입니다.

## Screenshot

### Without Worktree
![claude-statusline without worktree](assets/no-worktree.png)

### With Worktree
![claude-statusline with worktree](assets/worktree.png)

## Features

statusline은 의미별로 그룹핑된 3줄로 표시됩니다:

```
 DIR repo/src | GIT main (main) ↑2↓3 ?3 +2 ~4 -1 !1 | WORKTREE ✓
 MODEL Opus 4.6 (1M context) | CTX [████░░░░░░] 8% | USED 64%(0h1m) 23%(5d21h) | LINES +42 -15
 SID a5bc4601... | STYLE default | MSG hi
```

### 사용 가능한 항목

| 항목 | 설명 | 기본 줄 |
|------|------|:-------:|
| `dir` | 현재 작업 디렉토리 (git 기준 상대경로) | 1 |
| `git` | 브랜치, ahead/behind, 파일 상태 (untracked/staged/modified/deleted/conflicts) | 1 |
| `worktree` | Worktree 표시 — `✓` (초록) / `✗` (빨강) | 1 |
| `model` | 사용 중인 Claude 모델명 | 2 |
| `ctx` | Context window 사용률 (프로그레스 바) | 2 |
| `used` | Rate limit 사용률 (5시간 / 7일, 남은 시간 포함) | 2 |
| `lines` | 세션 내 추가/삭제된 줄 수 (`+42 -15`) | 2 |
| `sid` | 세션 ID | 3 |
| `style` | 출력 스타일 | 3 |
| `msg` | 마지막 사용자 메시지 (미리보기, 200자 제한) | 3 |

모든 항목은 Interactive 설치를 통해 표시 여부와 줄 배치를 커스텀할 수 있습니다.

## Supported Platforms

| Platform | Script | Dependencies |
|----------|--------|--------------|
| macOS / Linux | `claude-statusline.sh` (Bash) | jq (required), python3, git |
| Windows | `claude-statusline.ps1` (PowerShell) | python (optional), git |

## Installation

### GitHub에서 직접 설치 (npm 미게시)

```bash
npx github:devstefancho/claude-statusline install
```

### npm에서 설치 (게시 후)

```bash
npx @devstefancho/claude-statusline install
```

### Interactive 설치

표시할 항목을 선택하고 줄 배치를 지정할 수 있습니다:

```bash
npx @devstefancho/claude-statusline install -i
```

Interactive 모드에서는:
1. **항목 선택** — Space로 항목 토글, `a`로 전체 선택/해제
2. **줄 배정** — 각 항목을 Line 1, 2, 3에 배치 (또는 기본 레이아웃 사용)

선택한 설정은 `~/.claude/statusline-config.json`에 저장되며, 스크립트가 런타임에 이 설정을 읽습니다.

### Options

```bash
# 강제 설치 (기존 파일 덮어쓰기)
npx @devstefancho/claude-statusline install --force

# 기존 파일 백업 후 설치
npx @devstefancho/claude-statusline install --backup

# Interactive 항목 & 레이아웃 선택
npx @devstefancho/claude-statusline install -i

# Interactive 모드 건너뛰기, 기본 레이아웃 사용
npx @devstefancho/claude-statusline install --default
```

## Commands

### install

statusline 설정을 설치합니다.

```bash
npx @devstefancho/claude-statusline install [options]
```

| 옵션 | 설명 |
|------|------|
| `-f, --force` | 기존 파일 덮어쓰기 |
| `-b, --backup` | 기존 파일 백업 후 설치 |
| `-i, --interactive` | Interactive 항목 선택 및 줄 배치 |
| `--default` | Interactive 모드 건너뛰기, 기본 레이아웃 사용 |

### uninstall

statusline 설정을 제거합니다.

```bash
npx @devstefancho/claude-statusline uninstall [options]
```

| 옵션 | 설명 |
|------|------|
| `--keep-script` | 스크립트 파일은 유지하고 설정만 제거 |

### status

현재 설치 상태와 레이아웃 설정을 확인합니다.

```bash
npx @devstefancho/claude-statusline status
```

## Requirements

### macOS / Linux

#### 필수
- **jq**: JSON 파싱을 위해 필요
  ```bash
  # macOS
  brew install jq

  # Ubuntu/Debian
  apt install jq
  ```

#### 권장
- **python3**: 상대 경로 계산에 사용
- **git**: git 저장소 기준 경로 표시에 사용

### Windows

Windows에서는 PowerShell 스크립트를 사용하므로 **jq가 필요하지 않습니다**.

#### 권장
- **python**: 상대 경로 계산에 사용 (없으면 PowerShell 내장 함수 사용)
- **git**: git 저장소 기준 경로 표시에 사용

## How It Works

1. 플랫폼에 맞는 스크립트 파일 설치:
   - macOS/Linux: `~/.claude/claude-statusline.sh`
   - Windows: `%USERPROFILE%\.claude\claude-statusline.ps1`
2. 레이아웃 설정을 `~/.claude/statusline-config.json`에 저장
3. `~/.claude/settings.json`에 statusLine 설정 추가

설치 후 Claude Code를 재시작하면 statusline이 적용됩니다.

## Customization

### Interactive 설치로 변경

`--force`와 `-i` 옵션으로 재설치하여 항목과 레이아웃을 재구성할 수 있습니다:

```bash
npx @devstefancho/claude-statusline install --force -i
```

### 설정 파일 직접 수정

레이아웃 설정을 직접 편집할 수 있습니다:

```bash
vim ~/.claude/statusline-config.json
```

설정 예시:
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

### 스크립트 파일 직접 수정

고급 커스터마이징을 위해 스크립트 파일을 직접 편집할 수도 있습니다:

```bash
# macOS/Linux
vim ~/.claude/claude-statusline.sh

# Windows (PowerShell)
notepad $env:USERPROFILE\.claude\claude-statusline.ps1
```

## Uninstallation

```bash
# 완전 제거
npx @devstefancho/claude-statusline uninstall

# 설정만 제거 (스크립트는 유지)
npx @devstefancho/claude-statusline uninstall --keep-script
```

## License

MIT
