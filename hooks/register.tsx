import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Activity, Snapshot, Tokens, Touch, View } from '../types'

const PANE = 'choitree'
const touches = atom({ plugin: 'choitree', key: 'touches' } as const, [] as Touch[])
const snap = atom({ plugin: 'choitree', key: 'snap' } as const, null as Snapshot | null)

const opened = atom({ plugin: 'choitree', key: 'opened' } as const, {} as Record<string, boolean>)

const VIEW = 'choitree-view'
const viewing = atom({ plugin: 'choitree', key: 'viewing' } as const, null as View | null)

const activity = atom({ plugin: 'choitree', key: 'activity' } as const, { busy: false, since: 0, frame: 0, tool: '' } as Activity)
const tokens = atom({ plugin: 'choitree', key: 'tokens' } as const, { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, steps: 0 } as Tokens)
let ticker: { cancel: () => void } | undefined

const fmt = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(n))
const SPIN = ['·', '✢', '✳', '✶', '✻', '✽', '✻', '✶', '✳', '✢']
const VERB = ['생각하는 중', '코드 읽는 중', '열심히 작업 중', '두드리는 중', '고민하는 중']
// Claude Code 마스코트: 눈 깜빡임·발 구르기 프레임
const BODY = [
  [' ▐▛███▜▌ ', '▝▜█████▛▘', '  ▘▘ ▝▝  '],
  [' ▐▛███▜▌ ', '▝▜█████▛▘', '  ▝▘ ▘▝  '],
  [' ▐▙███▟▌ ', '▝▜█████▛▘', '  ▘▘ ▝▝  '],
  [' ▐▛███▜▌ ', '▗▟█████▙▖', '  ▝▘ ▘▝  '],
]
const IDLE = [' ▐▛███▜▌ ', ' ▜█████▛ ', '  ▘▘ ▝▝  ']

const norm = (p: string) => p.replace(/\\/g, '/')

const scan = async ($: any): Promise<Snapshot> => {
  const root = norm(await $.session.cwd())
  const top = await $.process.run(['git', 'rev-parse', '--show-toplevel']).catch(() => null)
  if (top && top.exitCode === 0) {
    const gitRoot = norm(top.stdout.trim())
    const br = await $.process.run(['git', 'branch', '--show-current'], { cwd: gitRoot })
    const ls = await $.process.run(['git', 'ls-files'], { cwd: gitRoot })
    const st = await $.process.run(['git', 'status', '--porcelain', '-uall'], { cwd: gitRoot })
    const status: Record<string, string> = {}
    for (const line of st.stdout.split('\n')) {
      if (line.length < 4) continue
      const p = line.slice(3).split(' -> ').pop()!.replace(/^"|"$/g, '')
      status[p] = line.slice(0, 2).trim() || 'M'
    }
    const files = [...new Set([...ls.stdout.split('\n').filter(Boolean), ...Object.keys(status)])].sort()
    return { root: gitRoot, branch: br.stdout.trim() || '(detached)', files, status, isRepo: true }
  }
  const entries = await $.fs.list().catch(() => [])
  const files = entries
    .filter((x: any) => !x.name.startsWith('.'))
    .map((x: any) => x.name)
    .sort()
  return { root, branch: '', files, status: {}, isRepo: false }
}

const refresh = async ($: any) => {
  const s = await scan($)
  await update($, snap, () => s)
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

const openView = async ($: any, root: string, path: string) => {
  let text: string
  try {
    text = await $.fs.read(`${root}/${path}`)
    if (text.includes('\u0000')) text = '(바이너리 파일)'
    else if (text.length > 400000) text = text.slice(0, 400000) + '\n… (잘림)'
  } catch (err) {
    text = `(읽을 수 없음: ${String(err)})`
  }
  await update($, viewing, () => ({ path, text, top: 0 }))
  await $.ui.open({ id: VIEW, title: path })
}

type Line = { depth: number; label: string; path: string; isDir: boolean; count: number }

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'choitree', description: '파일 트리·git 상태·작업 위치 패널 열기' })
    void refresh($)
    void $.ui.open({ id: PANE, title: 'choitree' })
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    await update($, activity, a => ({ ...a, busy: true, since: Date.now(), tool: '' }))
    ticker?.cancel()
    ticker = $.clock.every(250, () => void update($, activity, a => ({ ...a, frame: a.frame + 1 })))
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    ticker?.cancel()
    ticker = undefined
    await update($, activity, a => ({ ...a, busy: false, tool: '' }))
    void refresh($)
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    const r = yield* next(e)
    const u = (r as any)?.usage
    if (u) {
      await update($, tokens, t => ({
        input: t.input + (u.input_tokens ?? 0),
        output: t.output + (u.output_tokens ?? 0),
        cacheRead: t.cacheRead + (u.cache_read_input_tokens ?? 0),
        cacheWrite: t.cacheWrite + (u.cache_creation_input_tokens ?? 0),
        steps: t.steps + 1,
      }))
    }
    return r
  })

  on('command.run', { command: 'choitree' }, async $ => {
    await refresh($)
    await $.ui.open({ id: PANE, title: 'choitree' })
    return { text: 'choitree 패널을 열었습니다.' }
  })

  on('tool.call', async ($, e, next) => {
    const a = e as any
    const p = a.file_path ?? a.notebook_path ?? (a.tool === 'Grep' || a.tool === 'Glob' ? a.path : undefined)
    if (typeof p === 'string') {
      const t: Touch = { path: norm(p), tool: a.tool, at: Date.now() }
      await update($, touches, l => [...l.filter(x => x.path !== t.path), t].slice(-30))
    }
    void update($, activity, x => ({ ...x, tool: a.tool }))
    const ran = await next(e)
    if (['Edit', 'Write', 'NotebookEdit', 'Bash', 'PowerShell'].includes(a.tool)) void refresh($)
    return ran
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const ov = await read($, opened)
    const s = await read($, snap)
    const ts = await read($, touches)
    const rows = Math.max(6, (e.viewport?.rows ?? 30) - 16)
    if (!s) return <Text dimColor>스캔 중…</Text>
    const act = await read($, activity)
    const tk = await read($, tokens)
    const us = await $.session.usage().catch(() => undefined)
    const body = act.busy ? BODY[Math.floor(act.frame / 2) % BODY.length]! : IDLE
    const secs = act.busy ? Math.floor((Date.now() - act.since) / 1000) : 0
    const ctx = us?.context
    const pct = ctx?.percent ?? (ctx?.tokens ? (ctx.tokens / ctx.window) * 100 : 0)
    const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10))
    const limit = us?.rateLimits?.[0]

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
              <Text color="#D97757" bold>{SPIN[act.frame % SPIN.length]} {VERB[Math.floor(act.since / 1000) % VERB.length]}… <Text dimColor>{secs}s</Text></Text>
            ) : (
              <Text dimColor>✳ 대기 중 zZ</Text>
            )}
            <Text dimColor>{act.busy && act.tool ? `🔧 ${act.tool}` : `요청 ${tk.steps}회`}</Text>
            <Text>
              <Text color="cyan">↑{fmt(tk.input + tk.cacheRead + tk.cacheWrite)}</Text>
              <Text color="magenta"> ↓{fmt(tk.output)}</Text>
              {us?.cost && <Text color="green"> ${us.cost.usd.toFixed(2)}</Text>}
            </Text>
          </Box>
        </Box>
        {ctx && (
          <Text>
            <Text dimColor>컨텍스트 </Text>
            <Text color={pct > 80 ? 'red' : pct > 50 ? 'yellow' : 'green'}>{bar}</Text>
            <Text dimColor> {pct.toFixed(0)}% ({fmt(ctx.tokens ?? 0)}/{fmt(ctx.window)})</Text>
          </Text>
        )}
        {limit && (
          <Text dimColor>한도 {limit.kind} {limit.percentUsed.toFixed(0)}%{limit.resetsAt ? ` · 리셋 ${limit.resetsAt.slice(11, 16)}` : ''}</Text>
        )}
        <Text bold color="cyan">📁 {s.root.split('/').pop()}</Text>
        {s.isRepo ? (
          <Text>
            <Text color="magenta"> {s.branch}</Text>
            <Text dimColor>  {changed.length ? `변경 ${changed.length}개` : '깨끗함 ✓'}</Text>
          </Text>
        ) : (
          <Text dimColor>git 저장소 아님</Text>
        )}
        <Text color="green">▶ {current || '(아직 작업 없음)'}</Text>
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
                    ? void update($, opened, o => ({ ...o, [l.path]: !hot(l.path) }))
                    : void openView($, s.root, l.path)
                }
              />
              {!l.isDir && (
                <Button
                  key={'@' + l.path}
                  label=" @"
                  plain
                  dimColor
                  onPress={() => void $.prompt.fill({ text: `@${l.path} `, mode: 'insert' })}
                />
              )}
              {l.isDir && !hot(l.path) && <Text dimColor> ({l.count})</Text>}
              {t && !isCur && <Text color="blue"> ← {t.tool}</Text>}
            </Box>
          )
        })}
        {lines.length > rows && <Text dimColor>… {lines.length - rows}개 더</Text>}
        <Text dimColor>────────────────</Text>
        <Text dimColor>⌨ ctrl+x tab 패널 포커스 · ↑↓ 이동 · Enter 열기/접기</Text>
        <Text dimColor>  📂 폴더 클릭 접기/펼치기 · 파일 클릭 코드 보기 · @ 프롬프트에 넣기</Text>
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: VIEW }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const v = await read($, viewing)
    if (!v) return <Text dimColor>트리에서 파일을 클릭하세요.</Text>
    const all = v.text.split('\n')
    const room = Math.max(5, (e.viewport?.rows ?? 30) - 5)
    const top = Math.min(v.top, Math.max(0, all.length - room))
    const w = String(all.length).length
    const move = (d: number) => () =>
      void update($, viewing, x => (x ? { ...x, top: Math.max(0, Math.min(x.top + d, all.length - room)) } : x))
    return (
      <Box flexDirection="column">
        <Box flexDirection="row">
          <Text>{iconOf(v.path.split('/').pop() ?? '', false, false)} </Text>
          <Text bold color="cyan">{v.path}</Text>
          <Text dimColor>  {top + 1}–{Math.min(top + room, all.length)} / {all.length}줄  </Text>
          <Button key="top" label="⤒" hotkey="g" plain onPress={move(-all.length)} />
          <Text> </Text>
          <Button key="pgup" label="▲" hotkey="k" plain onPress={move(-room)} />
          <Text> </Text>
          <Button key="pgdn" label="▼" hotkey="j" plain onPress={move(room)} />
          <Text> </Text>
          <Button key="end" label="⤓" hotkey="e" plain onPress={move(all.length)} />
          <Text> </Text>
          <Button key="at" label="@" hotkey="a" plain onPress={() => void $.prompt.fill({ text: `@${v.path} `, mode: 'insert' })} />
          <Text> </Text>
          <Button key="close" label="✕" hotkey="x" plain role="dismiss" onPress={() => void $.ui.close({ id: VIEW })} />
        </Box>
        <Text dimColor>⌨ g 맨위 · k 위 · j 아래 · e 맨끝 · a @넣기 · x 닫기</Text>
        {all.slice(top, top + room).map((line, i) => (
          <Box flexDirection="row" key={String(top + i)}>
            <Text dimColor>{String(top + i + 1).padStart(w)} │ </Text>
            <Text>{line.replace(/	/g, '  ') || ' '}</Text>
          </Box>
        ))}
      </Box>
    )
  })
}
