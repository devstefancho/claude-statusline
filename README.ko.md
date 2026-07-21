[English](README.md) | **한국어**

# @devstefancho/claude-statusline

Claude Code CLI를 위한 커스텀 statusline 설정을 간편하게 설치할 수 있는 npx 패키지입니다.

## Screenshot

### Without Worktree
![claude-statusline without worktree](assets/no-worktree.png)

### With Worktree
![claude-statusline with worktree](assets/worktree.png)

## Features

두 가지 레이아웃 모드를 제공합니다:

**Multi-line (기본)** — 의미별로 그룹핑된 3줄:

```
 DIR repo/src | GIT main (main) ↑2↓3 ?3 +2 ~4 -1 !1 | WORKTREE ✓
 MODEL Opus 4.6 (1M context) | CTX [████░░░░░░] 8% | USED 64%(0h1m) 23%(5d21h) | LINES +42 -15
 SID a5bc4601... | STYLE default | MSG hi
```

**Compact** — 모든 정보를 한 줄에:

```
 45% | [✓ repo/src  main ↑2 ~1  +42/-15] | Opus 4.7 1M | 60%(2h30m) 20%(3d5h)
```

Compact 모드의 변화:
- `ctx`는 `NN%`만 표시, 모델 context window 크기에 따라 색상 변경
  - 1M context 모델: 30% 미만 gray, 30–50% yellow, 50% 이상 red
  - 일반 모델: 50% 미만 gray, 50–80% yellow, 80% 이상 red
- `model`은 `Claude ` 접두사 제거
- `used`는 `USED` / `5h` / `7d` 라벨 제거 (순서 고정: 5시간 먼저, 7일 뒤)
- `proj`는 `dir`, worktree(내부면 `✓` 접두사), `git`, 코드 변경 줄수를 하나의 `[...]` 그룹으로 묶음

### 사용 가능한 항목

| 항목 | 설명 | 기본 줄 |
|------|------|:-------:|
| `dir` | 현재 작업 디렉토리 (git 기준 상대경로) | 1 |
| `git` | 브랜치, ahead/behind, 파일 상태 (untracked/staged/modified/deleted/conflicts) | 1 |
| `worktree` | Worktree 표시 — `✓` (초록) / `✗` (빨강) | 1 |
| `proj` | dir + worktree + git + 코드 변경을 하나의 괄호 그룹으로 (compact 전용) | 1 |
| `model` | 사용 중인 Claude 모델명 | 2 |
| `fast` | Fast mode 표시 (`FAST ⚡`, compact는 `⚡`) — `/fast`가 켜져 있을 때만 표시. [Fast Mode](#fast-mode) 참고 | 2 |
| `ctx` | Context window 사용률 (프로그레스 바, compact에서는 `NN%`) | 2 |
| `used` | Rate limit 사용률 (5시간 / 7일, 남은 시간 포함) | 2 |
| `fable` | 모델별 주간 사용률 (`FABLE 89%`, compact는 `F89%`) — **macOS 전용, opt-in, 비공식 엔드포인트 사용**. [Fable Usage](#fable-usage) 참고 | 2 |
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

### Compact 설치

한 줄짜리 compact 프리셋으로 바로 설치:

```bash
npx @devstefancho/claude-statusline install --compact
```

### Interactive 설치

프리셋(compact / multi-line / custom)을 선택하거나 항목과 줄 배치를 직접 지정할 수 있습니다:

```bash
npx @devstefancho/claude-statusline install -i
```

Interactive 모드에서는:
1. **프리셋 선택** — Compact(한 줄), Multi-line(세 줄), Custom 중 선택
2. **항목 선택** (Custom 전용) — Space로 항목 토글, `a`로 전체 선택/해제
3. **줄 배정** (Custom 전용) — 각 항목을 Line 1, 2, 3에 배치 (또는 기본 레이아웃 사용)

선택한 설정은 `~/.claude/statusline-config.json`에 저장되며, 스크립트가 런타임에 이 설정을 읽습니다.

### Options

```bash
# 강제 설치 (기존 파일 덮어쓰기)
npx @devstefancho/claude-statusline install --force

# 기존 파일 백업 후 설치
npx @devstefancho/claude-statusline install --backup

# Compact 한 줄 프리셋으로 설치
npx @devstefancho/claude-statusline install --compact

# Interactive 프리셋 / 항목 / 레이아웃 선택
npx @devstefancho/claude-statusline install -i

# Interactive 모드 건너뛰기, 기본(multi-line) 레이아웃 사용
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
| `-i, --interactive` | Interactive 프리셋 / 항목 선택 및 줄 배치 |
| `-c, --compact` | Compact 한 줄 프리셋으로 설치 |
| `--default` | Interactive 모드 건너뛰기, 기본(multi-line) 레이아웃 사용 |

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

설정 예시 (multi-line):
```json
{
  "version": 1,
  "compact": false,
  "layout": {
    "line1": ["dir", "git", "worktree"],
    "line2": ["model", "fast", "ctx", "used", "lines"],
    "line3": ["sid", "style", "msg"]
  }
}
```

설정 예시 (compact):
```json
{
  "version": 1,
  "compact": true,
  "layout": {
    "line1": ["ctx", "proj", "model", "fast", "used"],
    "line2": [],
    "line3": []
  }
}
```

`compact` 플래그는 `ctx` / `model` / `used` 렌더링 방식을 바꿉니다 (라벨 제거, `ctx`는 사용률별 색상).

### 스크립트 파일 직접 수정

고급 커스터마이징을 위해 스크립트 파일을 직접 편집할 수도 있습니다:

```bash
# macOS/Linux
vim ~/.claude/claude-statusline.sh

# Windows (PowerShell)
notepad $env:USERPROFILE\.claude\claude-statusline.ps1
```

## Fast Mode

`fast` 항목은 Claude Code의 fast mode(`/fast`)가 켜져 있는 동안 `⚡` 표시를 보여줍니다. fast mode가 꺼져 있을 때는 아무것도 표시하지 않으므로, 이 기능을 쓰지 않더라도 layout에 추가해 두는 비용이 없습니다.

### 상태 감지 방식

Claude Code는 현재 statusline JSON에 fast mode 상태를 노출하지 않습니다. 우회책으로, 스크립트가 `~/.claude/settings.json`의 `fastMode` 불리언 값을 직접 읽습니다. 이 키는 공식 문서에 없는 비공식 키로, 향후 Claude Code 릴리스에서 이름이 바뀌거나 제거되면 표시가 조용히 사라질 수 있습니다. 결정 배경과 트레이드오프는 [docs/adr/0001-read-unofficial-fastmode-key.md](docs/adr/0001-read-unofficial-fastmode-key.md)에 기록되어 있습니다.

### 갱신 타이밍

Statusline은 특정 이벤트(새 assistant 메시지, `/compact`, permission mode 변경, vim mode 토글) 시점에만 갱신됩니다. 따라서 `/fast`만 토글한 직후에는 statusline이 즉시 갱신되지 않고, 다음 상호작용 때 표시가 바뀝니다. 즉시 반영이 필요하면 `~/.claude/settings.json`의 `statusLine` 설정에 `refreshInterval`을 추가하세요:

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/claude-statusline.sh",
    "refreshInterval": 2000
  }
}
```

## Fable Usage

> **임시 / 비공식.** 이 세그먼트는 Claude Code가 statusline JSON에 모델별 사용량을 공식적으로 노출하기 전까지만 쓰는 우회책입니다. 켜기 전에 아래 리스크를 먼저 읽으세요.

`fable` 항목은 **모델별 주간 사용률**을 보여줍니다. Claude Code의 `/usage` 명령이나 데스크탑 앱에 뜨는 "Fable 89%"와 같은 숫자입니다. `FABLE 89%(13h50m)`(multi-line) 또는 `F89%`(compact)로 표시되며, 서버가 준 severity에 따라 회색/노랑/빨강으로 색이 바뀝니다.

**opt-in 항목**입니다: 기본 및 compact 레이아웃에 포함되지 않습니다. Interactive 설치나 `~/.claude/statusline-config.json` 직접 편집으로 추가하세요([Customization](#customization) 참고).

### 숫자의 출처

Statusline stdin JSON에는 집계된 rate limit(5시간 / 7일, `used` 항목)만 있고 모델별 분해가 없습니다. 그래서 이 세그먼트는 **비공식** 엔드포인트에서 값을 가져옵니다:

```
GET https://api.anthropic.com/api/oauth/usage
```

인증은 Claude Code가 이미 macOS 키체인(`Claude Code-credentials` 항목)에 저장해 둔 OAuth 토큰을 사용합니다. **claude.ai 쿠키를 쓰지 않으며**, 새 비밀값을 저장하지도 않습니다. 결과는 `~/.claude/cache/fable-usage.json`에 캐시되고 최대 5분에 한 번만 갱신됩니다.

### 리스크와 한계

- **비공식 엔드포인트 — 조용히 깨질 수 있음.** 엔드포인트와 응답 스키마는 문서화되어 있지 않아 예고 없이 바뀔 수 있습니다. 구조가 바뀌면 세그먼트가 에러 없이 그냥 사라집니다. 그럴 때는 캐시된 응답 `~/.claude/cache/fable-usage.json`을 살펴보거나, 이 repo의 `scripts/fable-usage-test.sh` 헬퍼를 실행해 엔드포인트를 직접 확인하세요.
- **macOS 전용.** 인증이 `security` 명령으로 키체인을 읽습니다. Linux/Windows에서는 아무것도 표시되지 않습니다.
- **키체인 접근 팝업.** 최초 사용 시 macOS 키체인 접근 팝업이 뜰 수 있습니다. 매 갱신마다 팝업이 뜨지 않게 하려면 **Always Allow**를 선택하세요.
- **공식 API 아님.** 본인 토큰으로 내부 엔드포인트를 저빈도(최대 5분에 1회)로 호출하는 편의 우회책이며, 지원되는 통합이 아닙니다.

결정 배경과 트레이드오프는 [docs/adr/0002-fetch-fable-usage-oauth-endpoint.md](docs/adr/0002-fetch-fable-usage-oauth-endpoint.md)에 기록되어 있습니다.

## Updating

이 패키지는 npm에 게시되어 있지 않으므로, GitHub 설치 명령을 다시 실행해 업데이트합니다. 재설치하면 `~/.claude/`의 스크립트가 최신 버전으로 덮어써집니다:

```bash
# 최신 스크립트를 받고 현재 레이아웃 설정은 유지
npx github:devstefancho/claude-statusline install --force
```

참고:

- `--force`는 `~/.claude/claude-statusline.sh`를 덮어씁니다. `~/.claude/statusline-config.json`의 레이아웃은 유지됩니다(재설치가 이를 초기화하지 않으며, Interactive 선택을 다시 하지 않는 한 그대로입니다). 항목/레이아웃을 다시 구성하려면 `-i`를, 기존 파일을 먼저 백업하려면 `--backup`을 붙이세요.
- `npx`는 패키지를 캐시합니다. 설치 후에도 옛 버전이 보이면 캐시를 비우고 다시 시도하세요:
  ```bash
  npx --yes github:devstefancho/claude-statusline install --force
  # 또는 캐시를 완전히 비운 뒤 재설치
  npm cache clean --force && npx github:devstefancho/claude-statusline install --force
  ```
- 변경된 출력을 보려면 Claude Code를 재시작하거나 다음 statusline 갱신을 기다리세요.

## Uninstallation

```bash
# 완전 제거
npx @devstefancho/claude-statusline uninstall

# 설정만 제거 (스크립트는 유지)
npx @devstefancho/claude-statusline uninstall --keep-script
```

## License

MIT
