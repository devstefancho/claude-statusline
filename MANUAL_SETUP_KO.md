# 수동 설치 가이드

이 가이드는 npx를 사용하지 않고 claude-statusline을 수동으로 설치하는 방법을 설명합니다.

## 필수 조건

설치 전에 다음 도구들이 설치되어 있어야 합니다:

| 도구 | 필수 여부 | 용도 |
|------|----------|---------|
| jq | 예 | Claude Code에서 JSON 입력 파싱 |
| python3 | 예 | 상대 경로 계산 |
| git | 아니오 | Git 저장소 루트 감지 (선택사항) |
| curl | 예 | 스크립트 다운로드 |

필수 도구 설치 확인:

```bash
# jq 확인
jq --version

# python3 확인
python3 --version

# git 확인 (선택사항)
git --version
```

## 설치 단계

### 1단계: ~/.claude 디렉토리 생성

```bash
mkdir -p ~/.claude
```

### 2단계: 스크립트 다운로드

```bash
curl -o ~/.claude/claude-statusline.sh \
  https://raw.githubusercontent.com/devstefancho/claude-statusline/main/assets/claude-statusline.sh
```

### 3단계: 스크립트 실행 권한 부여

```bash
chmod +x ~/.claude/claude-statusline.sh
```

### 4단계: settings.json 설정

`~/.claude/settings.json` 파일을 열고 statusLine 설정을 추가합니다.

**settings.json 파일이 없는 경우**, 새로 생성합니다:

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

**settings.json 파일이 이미 있는 경우**, 기존 JSON에 statusLine 키를 추가합니다. 파일에 다음 내용이 포함되어야 합니다:

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/claude-statusline.sh"
  }
}
```

## 레이아웃 설정 (선택사항)

스크립트는 `~/.claude/statusline-config.json`이 있으면 이를 읽어서 레이아웃을 적용합니다. 파일이 없으면 기본 multi-line 레이아웃으로 동작합니다.

**Multi-line (기본):**

```bash
cat > ~/.claude/statusline-config.json << 'EOF'
{
  "version": 1,
  "compact": false,
  "layout": {
    "line1": ["dir", "git", "worktree"],
    "line2": ["model", "fast", "ctx", "used", "lines"],
    "line3": ["sid", "style", "msg"]
  }
}
EOF
```

**Compact (한 줄):**

```bash
cat > ~/.claude/statusline-config.json << 'EOF'
{
  "version": 1,
  "compact": true,
  "layout": {
    "line1": ["ctx", "proj", "model", "fast", "used"],
    "line2": [],
    "line3": []
  }
}
EOF
```

`compact` 플래그는 `ctx` / `model` / `used` 렌더링 방식을 바꿉니다 (라벨 제거, `ctx`는 사용률별 색상). 사용 가능한 항목: `dir`, `git`, `worktree`, `proj`, `model`, `fast`, `ctx`, `used`, `fable`, `lines`, `sid`, `style`, `msg`. (`fable`은 macOS 전용, opt-in이며 비공식 엔드포인트를 사용합니다 — README의 "Fable Usage" 섹션 참고.)

## 설치 확인

1. Claude Code를 재시작합니다 (터미널을 닫고 다시 열어 `claude` 실행)
2. 하단에 다음 정보를 표시하는 상태 표시줄이 보여야 합니다:
   - 현재 디렉토리 (상대 경로)
   - 모델 이름
   - 컨텍스트 윈도우 사용량 (진행 막대)
   - 출력 스타일
   - 세션 ID
   - 마지막 사용자 메시지

스크립트 수동 테스트:

```bash
echo '{"workspace":{"current_dir":"/tmp","project_dir":"/tmp"},"model":{"display_name":"Sonnet"},"output_style":{"name":"normal"},"transcript_path":"","session_id":"test123","context_window":{"used_percentage":25}}' | ~/.claude/claude-statusline.sh
```

## 제거

claude-statusline을 제거하려면:

```bash
# 스크립트 삭제
rm ~/.claude/claude-statusline.sh

# settings.json에서 statusLine 제거
# ~/.claude/settings.json 파일을 열고 "statusLine" 키를 삭제합니다
```

## 문제 해결

### 상태 표시줄이 나타나지 않는 경우

1. 스크립트가 존재하고 실행 가능한지 확인:
   ```bash
   ls -la ~/.claude/claude-statusline.sh
   ```

2. settings.json 문법 확인:
   ```bash
   cat ~/.claude/settings.json | jq .
   ```

3. jq가 설치되어 있는지 확인:
   ```bash
   which jq
   ```

### 스크립트 오류

상태 표시줄에 오류가 표시되면 스크립트를 직접 테스트해 보세요:

```bash
echo '{}' | ~/.claude/claude-statusline.sh
```

python3와 jq가 PATH에 있는지 확인하세요.
