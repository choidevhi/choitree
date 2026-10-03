# 🌳 choitree

[English](README.md) · **한국어** · [中文](README.zh.md) · [日本語](README.ja.md)

**Claude Code 안에서 파일 트리·git 상태·Claude의 작업 위치·토큰 사용량·사용 한도를 보여주는 라이브 패널. 지금 세션의 프로젝트 안만 보여 줍니다.**

만든 사람: [choidev](https://choidev.com)

```
 ▐▛███▜▌   ✻ 열심히 작업 중… 12s
▝▜█████▛▘  🔧 Edit
  ▘▘ ▝▝    ↑182.4k ↓3.1k $0.42
컨텍스트 ███░░░░░░░ 31% (62.0k/200.0k)
5시간  ████░░░░░░ 41% · 리셋 18:00
주간   ██░░░░░░░░ 17% · 리셋 10/7 09:00
📁 my-app
 main  변경 3개
▶ src/App.tsx
────────────────
•   📂 src/
●     ⚛️ ▶App.tsx
      🟦 utils.ts ← Read
?     🎨 theme.css
    📁 public/ (12)
    📦 package.json
```

## 기능

- **파일 트리**: git이 추적하는 파일로 그립니다. Claude가 작업 중이거나, 바뀌었거나, 최근에 연 폴더는 저절로 펼쳐지고, 나머지는 파일 수와 함께 한 줄로 접힙니다.
- **git 상태**: 브랜치, 변경 파일 수, 파일별 기호 (`●` 수정 · `+` 추가 · `?` 새 파일 · `✖` 삭제 · `→` 이름 변경).
- **Claude 작업 위치**: Claude가 지금 읽거나 고치는 파일에 `▶`, 최근에 다룬 파일에 `← Read` / `← Edit`.
- **Claude 캐릭터**: 작업하는 동안 움직이며 지금 쓰는 도구와 경과 시간을 보여 줍니다.
- **토큰·한도**: 입력(↑)·출력(↓) 토큰, 세션 비용, 컨텍스트 막대, 그리고 Claude Code가 알려 주는 모든 사용 한도(5시간, 주간, 모델별 주간, 지출)와 리셋 시각.
- **파일 아이콘**: 60가지가 넘는 언어와 설정·문서·미디어·압축 파일.
- **언어**: 한국어, 영어, 중국어, 일본어.
- **현재 프로젝트만**: [개인정보와 범위](#개인정보와-범위) 참고.

## 설치

Claude Code에서:

```
/plugin marketplace add choidevhi/choitree
/plugin install choitree@choitree
```

또는 터미널에서:

```bash
claude plugin marketplace add choidevhi/choitree
claude plugin install choitree@choitree
```

## 사용법

- 터미널 폭이 144칸 이상이면 세션 시작 때 저절로 열립니다.
- 직접 열려면 `/choitree`.

### 마우스

| 동작 | 결과 |
|---|---|
| 폴더 클릭 | 접기 / 펼치기 |
| 파일 클릭 | 프롬프트에 `@경로` 넣기 |

### 키보드

| 키 | 동작 |
|---|---|
| `ctrl+x tab` | 패널로 포커스 이동 |
| `↑` `↓` / `Enter` | 이동 / 열기·접기 |

### 언어

기본값은 Claude Code의 `language` 설정을 따릅니다. 직접 고르려면 `/config`에서 플러그인의 `language` 옵션을 `ko`, `en`, `zh`, `ja` 중 하나로 바꾸세요.

## 개인정보와 범위

- **컴퓨터 밖으로 아무것도 보내지 않습니다.** choitree는 네트워크 요청을 하지 않고, 어떤 데이터도 외부로 보내지 않습니다. 파일 내용은 읽지 않고 파일 이름만 나열합니다.
- **현재 프로젝트만.** 트리와 git 상태는 세션의 프로젝트 폴더(`$.session.root()`) 안만 다룹니다. git 저장소가 그보다 위에서 시작해도 폴더 밖 파일은 넣지 않습니다. Claude가 프로젝트 밖 파일을 다뤄도 패널에는 표시하지 않습니다.
- **사용량 숫자**(토큰, 비용, 컨텍스트, 한도)는 Claude Code가 `$.session.usage()`와 세션의 모델 응답으로 알려 주는 값입니다. choitree가 따로 API를 부르지 않습니다.

### 실행하는 프로그램

choitree는 프로젝트 폴더에서 `git`만, 항상 고정된 인자로 실행합니다. 사용자 입력이나 파일 내용으로 명령을 만들지 않습니다.

| 명령 | 이유 |
|---|---|
| `git rev-parse --show-prefix` | 프로젝트가 git 저장소 안인지, 저장소 안 어디인지 확인 |
| `git branch --show-current` | 브랜치 이름 표시 |
| `git ls-files` | 트리에 넣을 추적 파일 목록 |
| `git status --porcelain=v1 -uall -- .` | 프로젝트 안의 변경·새 파일 표시 |

`git`이 없거나 저장소가 아니면 프로젝트 폴더의 맨 위 단계 목록만 보여 줍니다.

### 훅이 하는 일

| 훅 | 하는 일 |
|---|---|
| `session.start` | 언어 설정을 읽고, `/choitree`를 등록하고, 프로젝트를 스캔하고, 패널을 엽니다 |
| `command.run` (`/choitree`) | 다시 스캔하고 패널을 엽니다 |
| `turn.start` / `turn.complete` | 캐릭터 애니메이션을 시작·정지하고, 턴이 끝나면 git 상태를 다시 읽습니다 |
| `turn.step` | 모델 응답마다 토큰 수를 더합니다. 응답은 그대로 넘깁니다 |
| `tool.call` | 도구가 다루는 프로젝트 파일을 기록하고(`▶`, `← Read` 표시용), 편집·셸 명령 뒤에 다시 스캔합니다. 도구 호출을 바꾸거나 막거나 늦추지 않습니다 |
| `ui.render` (`choitree`) | 패널을 그립니다 |

choitree는 슬래시 명령 하나(`/choitree`)만 추가합니다. 도구, 에이전트, MCP 서버, 시스템 프롬프트 내용은 추가하지 않습니다.

## 요구 사항

- 플러그인 훅 모듈(`hooks/hooks.json`의 `modules`)을 지원하는 Claude Code
- 저장소 기능에 쓰는 `git`

## 라이선스

MIT © [choidev](https://choidev.com)
