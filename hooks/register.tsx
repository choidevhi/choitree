import type { Register } from 'claude-code'

type Touch = { path: string; tool: string; at: number }
type Snapshot = {
  root: string
  branch: string
  upstream: string
  ahead: number
  behind: number
  lastCommit: string
  files: string[]
  status: Record<string, string>
  isRepo: boolean
}
type Activity = { busy: boolean; since: number; frame: number; tool: string }
type Tokens = { input: number; output: number; cacheRead: number; cacheWrite: number; steps: number }

const PANE = 'choitree'


// 패널이 그리는 값. 모듈 안에만 두고, 바뀌면 다시 그린다.
const state = {
  touches: [] as Touch[],
  snap: null as Snapshot | null,
  opened: {} as Record<string, boolean>,
  activity: { busy: false, since: 0, frame: 0, tool: '' } as Activity,
  tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, steps: 0 } as Tokens,
}
function redraw($: any) {
  $.ui.invalidate('ui.render')
}
let ticker: { cancel: () => void } | undefined

const fmt = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(n))
const SPIN = ['·', '✢', '✳', '✶', '✻', '✽', '✻', '✶', '✳', '✢']
// Claude Code 마스코트: 눈 깜빡임·발 구르기 프레임
const BODY = [
  [' ▐▛███▜▌ ', '▝▜█████▛▘', '  ▘▘ ▝▝  '],
  [' ▐▛███▜▌ ', '▝▜█████▛▘', '  ▝▘ ▘▝  '],
  [' ▐▙███▟▌ ', '▝▜█████▛▘', '  ▘▘ ▝▝  '],
  [' ▐▛███▜▌ ', '▗▟█████▙▖', '  ▝▘ ▘▝  '],
]
const IDLE = [' ▐▛███▜▌ ', ' ▜█████▛ ', '  ▘▘ ▝▝  ']

type Lang = 'ko' | 'en' | 'zh' | 'ja'
const T = {
  ko: {
    cmd: '파일 트리·git 상태·작업 위치 패널 열기', opened: 'choitree 패널을 열었습니다.', scanning: '스캔 중…',
    verbs: ['생각하는 중', '코드 읽는 중', '열심히 작업 중', '두드리는 중', '고민하는 중'], idle: '대기 중 zZ',
    steps: (n: number) => `요청 ${n}회`, context: '컨텍스트', limit: '한도', reset: '리셋',
    changed: (n: number) => `변경 ${n}개`, clean: '깨끗함 ✓', noUpstream: '원격 없음',  notRepo: 'git 저장소 아님', nothing: '(아직 작업 없음)',
    more: (n: number) => `… ${n}개 더`, keys1: '⌨ ctrl+x tab 패널 포커스 · ↑↓ 이동 · Enter 열기/접기',
    keys2: '  📂 폴더 클릭 접기/펼치기 · 파일 클릭 프롬프트에 @경로',
    kinds: { five_hour: '5시간', seven_day: '주간', seven_day_opus: '주간Opus', seven_day_sonnet: '주간Sonnet', spend_limit: '지출' } as Record<string, string>,
  },
  en: {
    cmd: 'Open the file tree / git status / work location pane', opened: 'choitree pane opened.', scanning: 'Scanning…',
    verbs: ['Thinking', 'Reading code', 'Working hard', 'Typing away', 'Pondering'], idle: 'Idle zZ',
    steps: (n: number) => `${n} requests`, context: 'Context', limit: 'Limit', reset: 'resets',
    changed: (n: number) => `${n} changed`, clean: 'clean ✓', noUpstream: 'no upstream',  notRepo: 'not a git repository', nothing: '(no work yet)',
    more: (n: number) => `… ${n} more`, keys1: '⌨ ctrl+x tab focus pane · ↑↓ move · Enter open/fold',
    keys2: '  📂 click folder to fold · click file to insert @path',
    kinds: { five_hour: '5-hour', seven_day: 'Weekly', seven_day_opus: 'Wk Opus', seven_day_sonnet: 'Wk Sonnet', spend_limit: 'Spend' } as Record<string, string>,
  },
  zh: {
    cmd: '打开文件树 / git 状态 / 工作位置面板', opened: '已打开 choitree 面板。', scanning: '扫描中…',
    verbs: ['思考中', '阅读代码中', '努力工作中', '敲代码中', '琢磨中'], idle: '待机中 zZ',
    steps: (n: number) => `请求 ${n} 次`, context: '上下文', limit: '额度', reset: '重置',
    changed: (n: number) => `${n} 个变更`, clean: '干净 ✓', noUpstream: '无上游',  notRepo: '不是 git 仓库', nothing: '(尚无工作)',
    more: (n: number) => `… 还有 ${n} 个`, keys1: '⌨ ctrl+x tab 聚焦面板 · ↑↓ 移动 · Enter 打开/折叠',
    keys2: '  📂 点击文件夹折叠/展开 · 点击文件插入 @路径',
    kinds: { five_hour: '5小时', seven_day: '每周', seven_day_opus: '每周Opus', seven_day_sonnet: '每周Sonnet', spend_limit: '支出' } as Record<string, string>,
  },
  ja: {
    cmd: 'ファイルツリー・git 状態・作業位置パネルを開く', opened: 'choitree パネルを開きました。', scanning: 'スキャン中…',
    verbs: ['考え中', 'コードを読み中', 'がんばって作業中', 'タイプ中', '悩み中'], idle: '待機中 zZ',
    steps: (n: number) => `リクエスト ${n} 回`, context: 'コンテキスト', limit: '上限', reset: 'リセット',
    changed: (n: number) => `変更 ${n} 件`, clean: 'クリーン ✓', noUpstream: '上流なし',  notRepo: 'git リポジトリではありません', nothing: '(まだ作業なし)',
    more: (n: number) => `… 他 ${n} 件`, keys1: '⌨ ctrl+x tab パネルにフォーカス · ↑↓ 移動 · Enter 開く/たたむ',
    keys2: '  📂 フォルダをクリックで開閉 · ファイルをクリックで @パス を挿入',
    kinds: { five_hour: '5時間', seven_day: '週間', seven_day_opus: '週Opus', seven_day_sonnet: '週Sonnet', spend_limit: '支出' } as Record<string, string>,
  },
}
let L: (typeof T)['ko'] = T.en

const dur = (ms: number) => {
  const m = Math.floor(ms / 60000)
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`
}

// 리셋 시각: 오늘이면 HH:MM, 아니면 MM-DD HH:MM (현지 시간)
const when = (iso: string) => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return d.toDateString() === new Date().toDateString() ? hm : `${d.getMonth() + 1}/${d.getDate()} ${hm}`
}

const pickLang = (want: string): Lang => {
  const v = want.toLowerCase()
  if (/^(ko|kor|korean)|한국/.test(v)) return 'ko'
  if (/^(zh|chi|chinese)|中文|汉语|漢語/.test(v)) return 'zh'
  if (/^(ja|jp|jpn|japanese)|日本/.test(v)) return 'ja'
  return 'en'
}

const norm = (p: string) => p.replace(/\\/g, '/').replace(/\/+$/, '')
const inside = (root: string, p: string) => {
  const r = root.toLowerCase()
  const q = p.toLowerCase()
  return q === r || q.startsWith(r + '/')
}

// 세션의 프로젝트 루트 아래만 본다. git 저장소가 더 위에 있어도 루트 밖 파일은 넣지 않는다.
async function scan($: any): Promise<Snapshot> {
  const root = norm(await $.session.root())
  const run = (p: Promise<any>) => p.catch(() => null)
  const pre = await run($.process.run(['git', 'rev-parse', '--show-prefix'], { cwd: root }))
  if (pre && pre.exitCode === 0) {
    const prefix = pre.stdout.trim()
    const br = await run($.process.run(['git', 'branch', '--show-current'], { cwd: root }))
    const up = await run($.process.run(['git', 'rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'], { cwd: root }))
    const ab = await run($.process.run(['git', 'rev-list', '--left-right', '--count', '@{upstream}...HEAD'], { cwd: root }))
    const lc = await run($.process.run(['git', 'log', '-1', '--format=%h %s'], { cwd: root }))
    const ls = await run($.process.run(['git', 'ls-files'], { cwd: root }))
    const st = await run($.process.run(['git', 'status', '--porcelain=v1', '-uall', '--', '.'], { cwd: root }))
    const status: Record<string, string> = {}
    for (const line of (st?.stdout ?? '').split('\n')) {
      if (line.length < 4) continue
      let p = line.slice(3).split(' -> ').pop()!.replace(/^"|"$/g, '')
      if (prefix && !p.startsWith(prefix)) continue
      p = p.slice(prefix.length)
      status[p] = line.slice(0, 2).trim() || 'M'
    }
    const files = [...new Set([...(ls?.stdout ?? '').split('\n').filter(Boolean), ...Object.keys(status)])]
      .filter(f => !f.startsWith('../'))
      .sort()
    const [behind = 0, ahead = 0] = up?.exitCode === 0 && ab?.exitCode === 0 ? ab.stdout.trim().split(/\s+/).map(Number) : []
    return {
      root,
      branch: br?.stdout.trim() || '(detached)',
      upstream: up?.exitCode === 0 ? up.stdout.trim() : '',
      ahead,
      behind,
      lastCommit: lc?.exitCode === 0 ? lc.stdout.trim() : '',
      files,
      status,
      isRepo: true,
    }
  }
  const entries = await $.fs.list(root).catch(() => [])
  const files = entries
    .filter((x: any) => !x.name.startsWith('.'))
    .map((x: any) => x.name)
    .sort()
  return { root, branch: '', upstream: '', ahead: 0, behind: 0, lastCommit: '', files, status: {}, isRepo: false }
}

async function refresh($: any) {
  state.snap = await scan($)
  redraw($)
}

const ICON: Record<string, [string, string]> = {
  M: ['●', 'yellow'],
  A: ['+', 'green'],
  D: ['✖', 'red'],
  R: ['→', 'cyan'],
  '??': ['?', 'green'],
  U: ['!', 'red'],
}

const EXT: Record<string, string> = {
  // web / js
  ts: '🟦', mts: '🟦', cts: '🟦', tsx: '⚛️', jsx: '⚛️', js: '🟨', mjs: '🟨', cjs: '🟨',
  vue: '💚', svelte: '🧡', astro: '🚀', html: '🌐', htm: '🌐', css: '🎨', scss: '🎨', sass: '🎨', less: '🎨',
  // systems
  c: '🇨', h: '🇨', cpp: '➕', cc: '➕', cxx: '➕', hpp: '➕', rs: '🦀', go: '🐹', zig: '⚡', nim: '👑', v: '✌️',
  asm: '⚙️', s: '⚙️', wasm: '🧩', d: '🔺',
  // jvm / .net
  java: '☕', kt: '🟪', kts: '🟪', scala: '🔴', groovy: '⭐', gradle: '🐘', clj: '🌀', cs: '🟩', fs: '🔹', vb: '🔵',
  // scripting
  py: '🐍', pyi: '🐍', ipynb: '📓', rb: '💎', php: '🐘', pl: '🐪', pm: '🐪', lua: '🌙', r: '📊', jl: '🟣',
  dart: '🎯', swift: '🕊️', m: '🍎', mm: '🍎', ex: '💧', exs: '💧', erl: '📡', hs: 'λ', ml: '🐫', elm: '🌳',
  cr: '🔮', coffee: '☕', tcl: '🪶',
  // shell
  sh: '💲', bash: '💲', zsh: '💲', fish: '🐟', ps1: '💲', psm1: '💲', bat: '💲', cmd: '💲',
  // game
  gd: '🤖', godot: '🤖', tscn: '🎬', tres: '📦', unity: '🎮', shader: '✨', glsl: '✨', hlsl: '✨', wgsl: '✨',
  // data / config
  json: '🔧', jsonc: '🔧', json5: '🔧', yaml: '🔧', yml: '🔧', toml: '🔧', ini: '🔧', cfg: '🔧', conf: '🔧',
  xml: '📰', csv: '📊', tsv: '📊', xlsx: '📊', env: '🔐', pem: '🔑', key: '🔑', age: '🔐',
  graphql: '💗', gql: '💗', proto: '📡', prisma: '🔺', sql: '🗄️', db: '🗄️', sqlite: '🗄️',
  tf: '🏗️', nix: '❄️', cmake: '🔨', mk: '🔨', lock: '🔒',
  // docs
  md: '📝', mdx: '📝', rst: '📝', tex: '📐', txt: '📄', log: '🧾', pdf: '📕', doc: '📘', docx: '📘', pptx: '📙',
  // media
  svg: '🖼️', png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', webp: '🖼️', ico: '🖼️', bmp: '🖼️', aseprite: '🖼️', psd: '🖼️',
  mp3: '🎵', wav: '🎵', ogg: '🎵', flac: '🎵', mp4: '🎞️', mov: '🎞️', webm: '🎞️', ttf: '🔤', otf: '🔤', woff: '🔤', woff2: '🔤',
  zip: '📦', gz: '📦', tar: '📦', '7z': '📦', rar: '📦', exe: '⚙️', dll: '⚙️', so: '⚙️',
}
const NAME: Record<string, string> = {
  'package.json': '📦', 'tsconfig.json': '🟦', 'cargo.toml': '🦀', 'go.mod': '🐹', makefile: '🔨',
  'docker-compose.yml': '🐳', '.env': '🔐', 'pnpm-lock.yaml': '🔒', 'requirements.txt': '🐍', 'project.godot': '🤖', '.gitignore': '🙈', dockerfile: '🐳', 'readme.md': '📘', license: '📜', 'claude.md': '✳️',
}
const iconOf = (label: string, isDir: boolean, isOpen: boolean) => {
  if (isDir) return isOpen ? '📂' : '📁'
  const n = label.toLowerCase()
  return NAME[n] ?? EXT[n.split('.').pop() ?? ''] ?? '📄'
}

type Line = { depth: number; label: string; path: string; isDir: boolean; count: number }

export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    L = T[pickLang(String((options as any)?.language ?? 'en'))]
    await $.command.register({ name: 'choitree', description: L.cmd })
    void refresh($)
    $.clock.every(30000, () => $.ui.invalidate('ui.render'))
    void $.ui.open({ id: PANE, title: 'choitree' })
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    state.activity = { ...state.activity, busy: true, since: Date.now(), tool: '' }
    redraw($)
    ticker?.cancel()
    ticker = $.clock.every(250, () => {
      state.activity = { ...state.activity, frame: state.activity.frame + 1 }
      redraw($)
    })
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    ticker?.cancel()
    ticker = undefined
    state.activity = { ...state.activity, busy: false, tool: '' }
    redraw($)
    void refresh($)
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    const r = yield* next(e)
    const u = (r as any)?.usage
    if (u) {
      const t = state.tokens
      state.tokens = {
        input: t.input + (u.input_tokens ?? 0),
        output: t.output + (u.output_tokens ?? 0),
        cacheRead: t.cacheRead + (u.cache_read_input_tokens ?? 0),
        cacheWrite: t.cacheWrite + (u.cache_creation_input_tokens ?? 0),
        steps: t.steps + 1,
      }
      redraw($)
    }
    return r
  })

  on('command.run', { command: 'choitree' }, async $ => {
    await refresh($)
    await $.ui.open({ id: PANE, title: 'choitree' })
    return { text: L.opened }
  })

  on('tool.call', async ($, e, next) => {
    const a = e as any
    const p = a.file_path ?? a.notebook_path ?? (a.tool === 'Grep' || a.tool === 'Glob' ? a.path : undefined)
    if (typeof p === 'string' && inside(norm(await $.session.root()), norm(p))) {
      const t: Touch = { path: norm(p), tool: a.tool, at: Date.now() }
      state.touches = [...state.touches.filter(x => x.path !== t.path), t].slice(-30)
      redraw($)
    }
    state.activity = { ...state.activity, tool: a.tool }
    redraw($)
    const ran = await next(e)
    if (['Edit', 'Write', 'NotebookEdit', 'Bash', 'PowerShell'].includes(a.tool)) void refresh($)
    return ran
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const ov = state.opened
    const s = state.snap
    const ts = state.touches
    if (!s) return <Text dimColor>{L.scanning}</Text>
    const act = state.activity
    const tk = state.tokens
    const us = await $.session.usage().catch(() => undefined)
    const body = act.busy ? BODY[Math.floor(act.frame / 2) % BODY.length]! : IDLE
    const secs = act.busy ? Math.floor((Date.now() - act.since) / 1000) : 0
    const model = await $.session.model().catch(() => '')
    const total = us?.startedAt ? dur(Date.now() - us.startedAt) : ''
    const ctx = us?.context
    const pct = ctx?.percent ?? (ctx?.tokens ? (ctx.tokens / ctx.window) * 100 : 0)
    const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10))
    const limits = us?.rateLimits ?? []
    const rows = Math.max(6, (e.viewport?.rows ?? 30) - 18 - limits.length)

    const lowRoot = s.root.toLowerCase() + '/'
    const rel = (p: string) => (p.toLowerCase().startsWith(lowRoot) ? p.slice(lowRoot.length) : p)
    const touched = new Map(ts.map(t => [rel(t.path), t]))
    const last = ts[ts.length - 1]
    const current = last ? rel(last.path) : ''
    const changed = Object.keys(s.status)
    const under = (dir: string, list: Iterable<string>) => [...list].some(c => c.startsWith(dir + '/'))
    const auto = (dir: string) => current.startsWith(dir + '/') || under(dir, changed) || under(dir, touched.keys())

    const hot = (dir: string) => ov[dir] ?? auto(dir)

    // 클릭으로 바꾼 폴더는 그대로, 나머지는 작업 중·변경·최근 접근 경로만 펼치고 나머지 폴더는 한 줄로 접는다.
    const lines: Line[] = []
    const walk = (prefix: string, depth: number) => {
      const dirs = new Map<string, number>()
      const files: string[] = []
      for (const f of s.files) {
        if (prefix && !f.startsWith(prefix + '/')) continue
        const rest = prefix ? f.slice(prefix.length + 1) : f
        const i = rest.indexOf('/')
        if (i > 0) dirs.set(rest.slice(0, i), (dirs.get(rest.slice(0, i)) ?? 0) + 1)
        else files.push(rest)
      }
      for (const [d, n] of [...dirs].sort()) {
        const full = prefix ? `${prefix}/${d}` : d
        lines.push({ depth, label: d + '/', path: full, isDir: true, count: n })
        if (hot(full)) walk(full, depth + 1)
      }
      for (const f of files.sort()) {
        lines.push({ depth, label: f, path: prefix ? `${prefix}/${f}` : f, isDir: false, count: 0 })
      }
    }
    walk('', 0)

    return (
      <Box flexDirection="column">
        <Box flexDirection="row">
          <Box flexDirection="column" marginRight={1}>
            {body.map(row => <Text color="#D97757">{row}</Text>)}
          </Box>
          <Box flexDirection="column">
            {act.busy ? (
              <Text color="#D97757" bold>{SPIN[act.frame % SPIN.length]} {L.verbs[Math.floor(act.since / 1000) % L.verbs.length]}… <Text dimColor>{secs}s</Text></Text>
            ) : (
              <Text dimColor>✳ {L.idle}</Text>
            )}
            <Text dimColor>{act.busy && act.tool ? `🔧 ${act.tool}` : L.steps(tk.steps)}</Text>
            <Text>
              <Text color="#D97757">🧠 {model || '?'}</Text>
              {total && <Text dimColor>  ⏱ {total}</Text>}
            </Text>
            <Text>
              <Text color="cyan">↑{fmt(tk.input + tk.cacheRead + tk.cacheWrite)}</Text>
              <Text color="magenta"> ↓{fmt(tk.output)}</Text>
              {us?.cost && <Text color="green"> ${us.cost.usd.toFixed(2)}</Text>}
            </Text>
          </Box>
        </Box>
        {ctx && (
          <Text>
            <Text dimColor>{L.context} </Text>
            <Text color={pct > 80 ? 'red' : pct > 50 ? 'yellow' : 'green'}>{bar}</Text>
            <Text dimColor> {pct.toFixed(0)}% ({fmt(ctx.tokens ?? 0)}/{fmt(ctx.window)})</Text>
          </Text>
        )}
        {limits.map(r => {
          const used = Math.max(0, Math.min(100, r.percentUsed))
          const n = Math.round(used / 10)
          return (
            <Text key={r.kind}>
              <Text dimColor>{(L.kinds[r.kind as keyof typeof L.kinds] ?? r.kind).padEnd(6)} </Text>
              <Text color={used > 80 ? 'red' : used > 50 ? 'yellow' : 'green'}>{'█'.repeat(n) + '░'.repeat(10 - n)}</Text>
              <Text dimColor> {used.toFixed(0)}%{r.resetsAt ? ` · ${L.reset} ${when(r.resetsAt)}` : ''}</Text>
            </Text>
          )
        })}
        <Text bold color="cyan">📁 {s.root.split('/').pop()}</Text>
        {s.isRepo ? (
          <Text>
            <Text color="magenta" bold> {s.branch}</Text>
            {s.upstream ? (
              <Text>
                <Text dimColor> → {s.upstream}</Text>
                {s.ahead > 0 && <Text color="green"> ↑{s.ahead}</Text>}
                {s.behind > 0 && <Text color="yellow"> ↓{s.behind}</Text>}
                {s.ahead === 0 && s.behind === 0 && <Text dimColor> ≡</Text>}
              </Text>
            ) : (
              <Text dimColor> ({L.noUpstream})</Text>
            )}
            <Text dimColor>  {changed.length ? L.changed(changed.length) : L.clean}</Text>
          </Text>
        ) : null}
        {!s.isRepo && <Text dimColor>{L.notRepo}</Text>}
        {s.isRepo && s.lastCommit && <Text dimColor wrap="truncate-end">● {s.lastCommit}</Text>}
        <Text color="green">▶ {current || L.nothing}</Text>
        <Text dimColor>────────────────</Text>
        {lines.slice(0, rows).map(l => {
          const st = s.status[l.path]
          const [ic, col] = st ? (ICON[st] ?? ICON[st.charAt(0)] ?? ['●', 'yellow']) : [' ', 'white']
          const isCur = l.path === current
          const t = touched.get(l.path)
          const mark = l.isDir ? (under(l.path, changed) ? '•' : ' ') : ic
          return (
            <Box flexDirection="row" key={l.path}>
              <Text color={l.isDir ? 'yellow' : col}>{mark} </Text>
              <Text dimColor>{'  '.repeat(l.depth)}</Text>
              <Text>{iconOf(l.label.replace(/\/$/, ''), l.isDir, l.isDir && hot(l.path))} </Text>
              {isCur && <Text color="green" bold>▶</Text>}
              <Button
                key={l.path}
                label={l.label}
                plain
                dimColor={!isCur && !t && !l.isDir && !st}
                onPress={() =>
                  l.isDir
                    ? void ((state.opened = { ...state.opened, [l.path]: !hot(l.path) }), redraw($))
                    : void $.prompt.fill({ text: `@${l.path} `, mode: 'insert' })
                }
              />
              {l.isDir && !hot(l.path) && <Text dimColor> ({l.count})</Text>}
              {t && !isCur && <Text color="blue"> ← {t.tool}</Text>}
            </Box>
          )
        })}
        {lines.length > rows && <Text dimColor>{L.more(lines.length - rows)}</Text>}
        <Text dimColor>────────────────</Text>
        <Text dimColor>{L.keys1}</Text>
        <Text dimColor>{L.keys2}</Text>
      </Box>
    )
  })
}
