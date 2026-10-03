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
- **git 状态**：分支、变更文件数、每个文件的标记（`●` 修改 · `+` 新增 · `?` 未跟踪 · `✖` 删除 · `→` 重命名）。
- **Claude 工作位置**：`▶` 标出 Claude 正在读取或编辑的文件，最近处理过的文件显示 `← Read` / `← Edit`。
- **Claude 角色**：工作时会动，并显示当前工具和已用时间。
- **token 与额度**：输入(↑)/输出(↓) token、会话费用、上下文进度条，以及 Claude Code 报告的所有使用额度（5 小时、每周、按模型每周、支出）和重置时间。
- **文件图标**：60 多种语言以及配置、文档、媒体、压缩文件。
- **代码查看器**：点击文件，在第二个面板中带行号打开。
- **语言**：韩语、英语、中文、日语。

## 安装

```
/plugin marketplace add choidevhi/choitree
/plugin install choitree@choitree
```

## 用法

- 终端宽度不少于 144 列时，会话开始时自动打开；也可以输入 `/choitree` 打开。
- 鼠标：点击文件夹折叠/展开，点击文件名在查看器中打开，点击 `@` 把 `@路径` 插入提示，点击 `✕` 关闭查看器。
- 键盘：`ctrl+x tab` 聚焦面板，`↑` `↓` 移动，`Enter` 打开/折叠。查看器中 `g`/`e` 顶部/底部，`k`/`j` 上/下翻页，`a` 插入 `@路径`，`x`/`Esc` 关闭。
- 语言：默认跟随 Claude Code 的 `language` 设置；可在 `/config` 中把插件的 `language` 选项设为 `ko`、`en`、`zh` 或 `ja`。

## 隐私与范围

- **不向外发送任何数据。** choitree 不发起网络请求。
- **仅限当前项目。** 文件树、git 状态和代码查看器只覆盖会话的项目文件夹（`$.session.root()`）。代码查看器会解析符号链接，拒绝真实路径在项目之外的文件。
- **用量数据**来自 Claude Code 本身（`$.session.usage()` 与会话的模型响应），不调用任何 API。

### 运行的程序

只在项目文件夹中以固定参数运行 `git`：`git rev-parse --show-prefix`（检查是否在仓库中）、`git branch --show-current`（分支名）、`git ls-files`（文件列表）、`git status --porcelain=v1 -uall -- .`（变更文件）。

### 各个 hook 的作用

| Hook | 作用 |
|---|---|
| `session.start` | 读取语言设置、注册 `/choitree`、扫描项目、打开面板 |
| `command.run` | 重新扫描并打开面板 |
| `turn.start` / `turn.complete` | 开始/停止角色动画，回合结束后重新读取 git 状态 |
| `turn.step` | 累加每次模型响应的 token 数，响应原样传递 |
| `tool.call` | 记录工具处理的项目文件，编辑或 shell 命令后重新扫描；不修改、不阻止、不延迟工具调用 |
| `ui.render` | 绘制文件树面板和代码查看器 |

只添加一个斜杠命令（`/choitree`），不添加工具、代理、MCP 服务器或系统提示内容。

## 许可证

MIT © [choidev](https://choidev.com)
