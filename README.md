# 🌳 choitree

**Claude Code 안에서 파일 트리·git 상태·Claude의 작업 위치·토큰 사용량을 한눈에 보여주는 라이브 패널**

만든 사람: [choidev](https://choidev.com)

```
 ▐▛███▜▌   ✻ 열심히 작업 중… 12s
▝▜█████▛▘  🔧 Edit
  ▘▘ ▝▝    ↑182.4k ↓3.1k $0.42
컨텍스트 ███░░░░░░░ 31% (62.0k/200.0k)
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
    📘 README.md
```

## 기능

- **파일 트리**: git이 추적하는 파일 기준. 작업 중·변경됨·최근에 연 폴더만 자동으로 펼치고 나머지는 `(파일 수)`로 접습니다.
- **git 상태**: 브랜치, 변경 파일 수, 파일별 아이콘 (`●` 수정 · `+` 추가 · `?` 새 파일 · `✖` 삭제 · `→` 이름 변경).
- **Claude 작업 위치**: Claude가 지금 읽거나 고치는 파일에 `▶`, 최근에 다룬 파일에 `← Read`/`← Edit`.
- **Claude 캐릭터**: 작업하는 동안 움직이고, 사용 중인 도구와 경과 시간을 보여줍니다.
- **토큰·비용**: 입력(↑)·출력(↓) 토큰, 세션 비용, 컨텍스트 사용률 막대, 사용 한도.
- **파일 아이콘**: 60가지가 넘는 언어와 설정·문서·미디어 파일.
- **코드 뷰어**: 파일을 클릭하면 줄 번호와 함께 옆 패널에 열립니다.
- **자동 새로고침**: 편집이나 셸 명령이 끝날 때마다 git 상태를 다시 읽습니다.

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

- 터미널 폭이 144칸 이상이면 세션 시작 때 자동으로 열립니다.
- 직접 열려면 `/choitree`.

### 마우스

| 동작 | 결과 |
|---|---|
| 폴더 클릭 | 접기 / 펼치기 |
| 파일 이름 클릭 | 코드 뷰어로 열기 |
| 파일 옆 `@` 클릭 | 프롬프트에 `@경로` 넣기 |

### 키보드

| 키 | 동작 |
|---|---|
| `ctrl+x tab` | 패널로 포커스 이동 |
| `↑` `↓` / `Enter` | 항목 이동 / 열기·접기 |

코드 뷰어 안에서:

| 키 | 동작 |
|---|---|
| `g` / `e` | 맨 위 / 맨 끝 |
| `k` / `j` | 한 페이지 위 / 아래 |
| `a` | 프롬프트에 `@경로` 넣기 |
| `x` | 닫기 |

## 요구 사항

- 플러그인 훅(`hooks/hooks.json`의 `modules`)을 지원하는 Claude Code
- 저장소 기능을 쓰려면 `git`. git 저장소가 아니면 맨 위 단계 목록만 보여 줍니다.

## 라이선스

MIT © [choidev](https://choidev.com)
