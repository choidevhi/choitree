export type Touch = { path: string; tool: string; at: number }
export type Snapshot = {
  root: string
  branch: string
  files: string[]
  status: Record<string, string>
  isRepo: boolean
}

export type View = { path: string; text: string; top: number }

export type Activity = { busy: boolean; since: number; frame: number; tool: string }
export type Tokens = { input: number; output: number; cacheRead: number; cacheWrite: number; steps: number }

declare module 'claude-code' {
  interface PluginState {
    choitree: { touches: Touch[]; snap: Snapshot | null; opened: Record<string, boolean>; viewing: View | null; activity: Activity; tokens: Tokens }
  }
}
