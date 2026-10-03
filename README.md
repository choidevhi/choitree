# 🌳 choitree

**English** · [한국어](README.ko.md) · [中文](README.zh.md) · [日本語](README.ja.md)

**A live pane for Claude Code that shows the file tree, git status, where Claude is working, token usage, and your usage limits, scoped to the current project.**

Made by [choidev](https://choidev.com)

```
 ▐▛███▜▌   ✻ Working hard… 12s
▝▜█████▛▘  🔧 Edit
  ▘▘ ▝▝    ↑182.4k ↓3.1k $0.42
Context ███░░░░░░░ 31% (62.0k/200.0k)
5-hour  ████░░░░░░ 41% · resets 18:00
Weekly  ██░░░░░░░░ 17% · resets 10/7 09:00
📁 my-app
 main  3 changed
▶ src/App.tsx
────────────────
•   📂 src/
●     ⚛️ ▶App.tsx
      🟦 utils.ts ← Read
?     🎨 theme.css
    📁 public/ (12)
    📦 package.json
```

## Features

- **File tree**: built from the files git tracks. Folders that Claude is working in, that changed, or that were opened recently unfold by themselves. The others fold to one line with a file count.
- **Git status**: branch, number of changed files, and a mark per file (`●` modified, `+` added, `?` untracked, `✖` deleted, `→` renamed).
- **Where Claude is working**: `▶` marks the file Claude is reading or editing now. Files it touched recently show `← Read` / `← Edit`.
- **Claude character**: moves while Claude works, and shows the current tool and elapsed time.
- **Tokens and limits**: input (↑) and output (↓) tokens, session cost, a context bar, and every usage limit Claude Code reports (5-hour, weekly, per-model weekly, spend) with reset times.
- **File icons**: 60+ languages plus config, docs, media and archive files.
- **Languages**: Korean, English, Chinese, Japanese.
- **Current project only**: see [Privacy and scope](#privacy-and-scope).

## Install

In Claude Code:

```
/plugin marketplace add choidevhi/choitree
/plugin install choitree@choitree
```

Or in a terminal:

```bash
claude plugin marketplace add choidevhi/choitree
claude plugin install choitree@choitree
```

## Usage

- The pane opens by itself at session start when the terminal is at least 144 columns wide.
- Open it yourself with `/choitree`.

### Mouse

| Action | Result |
|---|---|
| Click a folder | Fold / unfold |
| Click a file | Insert `@path` into the prompt |

### Keyboard

| Key | Action |
|---|---|
| `ctrl+x tab` | Move focus to the pane |
| `↑` `↓` / `Enter` | Move / open or fold |

### Language

The pane is in English by default. To change it, set the plugin's `language` option to `ko`, `zh` or `ja` in `/config`.

## Privacy and scope

**choitree sends nothing anywhere.** It makes no network requests, writes no files, and keeps no data after the session. Everything it reads is shown in the pane and nowhere else.

### What it reads and where it goes

| Call | What it reads | Where it goes |
|---|---|---|
| `$.session.root()` | The path of the session's project folder | Used to limit every other read to that folder |
| `$.process.run` (`git` only, see below) | File names, branch name and git status of the project folder | Drawn in the pane only |
| `$.fs.list` | File and folder names at the top of the project folder, only when it is not a git repository | Drawn in the pane only |
| `tool.call` hook input | The file path a tool works on, kept only if it is inside the project | Drawn in the pane only (`▶`, `← Read`) |
| `$.session.usage()` / `turn.step` result | Token counts, session cost, context size and usage limits that Claude Code already has | Drawn in the pane only |
| `options.language` | The plugin's own `language` option | Picks the pane language |
| `$.prompt.fill` | Nothing read. Writes `@path` into your prompt box when you click a file | Your prompt box |

- **File contents are never read.** Only names and git status.
- **Current project only.** If the git repository starts above the project folder, files outside the folder are left out. Paths outside the project that Claude touches are not shown.
- **No values are read from your computer's settings.** The language comes only from the plugin option (`user_config`).

### Programs it runs

choitree runs only `git`, in the project folder. Each command is written out in full as fixed text in the call (`$.process.run(['git', ...], { cwd: root })`); none is built from user input or file contents. It never runs a command built from user input or file contents.

| Command | Why |
|---|---|
| `git rev-parse --show-prefix` | Check whether the project is in a git repository, and where the project sits inside it |
| `git branch --show-current` | Show the branch name |
| `git ls-files` | List the tracked files for the tree |
| `git status --porcelain=v1 -uall -- .` | Show changed and untracked files in the project |

If `git` is missing or the folder is not a repository, it lists the top level of the project folder instead.

### What each hook does

| Hook | What it does |
|---|---|
| `session.start` | Reads the `language` option, registers `/choitree`, scans the project, opens the pane |
| `command.run` (`/choitree`) | Rescans and opens the pane |
| `turn.start` / `turn.complete` | Starts and stops the character animation; rescans git status when a turn ends |
| `turn.step` | Adds up the token counts of each model response. The response itself is passed on unchanged |
| `tool.call` | Notes which project file a tool works on (for `▶` and `← Read`), and rescans after edits and shell commands. It never changes, blocks or delays the tool call |
| `ui.render` (`choitree`) | Draws the pane |

choitree adds one slash command (`/choitree`). It adds no tools, agents, MCP servers or system prompt text.

## Requirements

- A Claude Code version that supports plugin hook modules (`modules` in `hooks/hooks.json`)
- `git` for the repository features

## License

MIT © [choidev](https://choidev.com)
