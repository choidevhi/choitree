# 🌳 choitree

[English](README.md) · [한국어](README.ko.md) · **中文** · [日本語](README.ja.md)

**Claude Code 的实时面板：显示文件树、git 状态、Claude 的工作位置、token 用量和使用额度，仅限当前项目。**

作者：[choidev](https://choidev.com)

```
 ▐▛███▜▌   ✻ 努力工作中… 12s
▝▜█████▛▘  🔧 Edit
  ▘▘ ▝▝    ↑182.4k ↓3.1k $0.42
上下文 ███░░░░░░░ 31% (62.0k/200.0k)
5小时  ████░░░░░░ 41% · 重置 18:00
每周   ██░░░░░░░░ 17% · 重置 10/7 09:00
📁 my-app
 main  3 个变更
▶ src/App.tsx
```

## 功能

- **文件树**：基于 git 跟踪的文件。Claude 正在工作、有变更或最近打开过的文件夹会自动展开，其余折叠为一行并显示文件数。
- **会话**：正在使用的模型，以及 Claude 在本项目中实际工作的累计时间（只算回合时间，跨会话累计，不含空闲）。
- **git 状态**：分支、远程分支及领先/落后提交数、最后一次提交、变更文件数、每个文件的标记（`●` 修改 · `+` 新增 · `?` 未跟踪 · `✖` 删除 · `→` 重命名）。
- **Claude 工作位置**：`▶` 标出 Claude 正在读取或编辑的文件，最近处理过的文件显示 `← Read` / `← Edit`。
- **Claude 角色**：工作时会动，并显示当前工具和已用时间。
- **token 与额度**：输入(↑)/输出(↓) token、会话费用、上下文进度条，以及 Claude Code 报告的所有使用额度（5 小时、每周、按模型每周、支出）和重置时间。
- **文件图标**：60 多种语言以及配置、文档、媒体、压缩文件。
- **语言**：韩语、英语、中文、日语。

## 安装

```
/plugin marketplace add choidevhi/choitree
/plugin install choitree@choitree
```

## 用法

- 终端宽度不少于 144 列时，会话开始时自动打开；也可以输入 `/choitree` 打开。
- 鼠标：点击文件夹折叠/展开，点击文件把 `@路径` 插入提示。
- 键盘：`ctrl+x tab` 聚焦面板，`↑` `↓` 移动，`Enter` 打开/折叠。
- 语言：默认英语；可在 `/config` 中把插件的 `language` 选项设为 `ko`、`zh` 或 `ja`。

## 隐私与范围

**choitree 不向任何地方发送任何内容。** 不发起网络请求、不写文件。跨会话保留的只有下面的工作时间合计，存放在 Claude Code 的本地插件存储中。读取的内容只显示在面板中。

### 读取什么、去向何处

| 调用 | 读取的内容 | 去向 |
|---|---|---|
| `$.session.root()` | 会话的项目文件夹路径 | 用于把其他所有读取限制在该文件夹内 |
| `$.process.run`（仅 `git`，见下文） | 项目文件夹的文件名、分支名和 git 状态 | 仅显示在面板中 |
| `$.fs.list` | 仅在不是 git 仓库时，项目文件夹顶层的文件和文件夹名 | 仅显示在面板中 |
| `tool.call` hook 输入 | 工具处理的文件路径，仅保留项目内的 | 仅显示在面板中（`▶`、`← Read`） |
| `$.session.model()` | 会话使用的模型名（与 `/model` 显示一致） | 仅显示在面板中 |
| `$.session.usage()` / `turn.step` 结果 | Claude Code 已有的 token 数、会话费用、上下文大小和使用额度 | 仅显示在面板中 |
| `$.store.get` / `$.store.set` | 每个项目一个数字：Claude 在该项目中实际工作的总时间（每个回合从开始到结束），以项目路径为键 | 保存在本机 Claude Code 的插件存储中，跨会话累计。不向外发送 |
| `options.language` | 插件自身的 `language` 选项 | 选择面板语言 |
| `$.prompt.fill` | 不读取。点击文件时把 `@路径` 写入提示框 | 提示输入框 |

- **从不读取文件内容**，只看文件名和 git 状态。
- **仅限当前项目。** 即使 git 仓库从项目文件夹的上层开始，也不包含文件夹外的文件。
- **不读取电脑上的设置值。** 语言只来自插件选项（`user_config`）。

### 运行的程序

只在项目文件夹中运行 `git`，每条命令都以固定文本完整写在调用中（`$.process.run(['git', ...], { cwd: root })`）：`git rev-parse --show-prefix`（检查是否在仓库中）、`git branch --show-current`（分支名）、`git rev-parse --abbrev-ref --symbolic-full-name @{upstream}`（跟踪的远程分支）、`git rev-list --left-right --count @{upstream}...HEAD`（领先/落后的提交数）、`git log -1 --format=%h %s`（最后一次提交）、`git ls-files`（文件列表）、`git status --porcelain=v1 -uall -- .`（变更文件）。

### 各个 hook 的作用

| Hook | 作用 |
|---|---|
| `session.start` | 读取 `language` 选项、注册 `/choitree`、扫描项目、打开面板 |
| `command.run` | 重新扫描并打开面板 |
| `turn.start` / `turn.complete` | 开始/停止角色动画，回合结束后重新读取 git 状态 |
| `turn.step` | 累加每次模型响应的 token 数，响应原样传递 |
| `tool.call` | 记录工具处理的项目文件，编辑或 shell 命令后重新扫描；不修改、不阻止、不延迟工具调用 |
| `ui.render` | 绘制面板 |

只添加一个斜杠命令（`/choitree`），不添加工具、代理、MCP 服务器或系统提示内容。

## 许可证

MIT © [choidev](https://choidev.com)
