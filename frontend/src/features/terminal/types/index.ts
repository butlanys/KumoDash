// Terminal session types
export interface TerminalSession {
  session_id: string
  name: string
  status: 'running' | 'stopped'
  created_at: string
  last_activity_at: string
  connected_clients: number
}

export interface SessionLimits {
  max_sessions: number
  current_count: number
}

// WebSocket message types
export type WsConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error'

export interface WsControlMessage {
  type: 'resize' | 'ping'
  cols?: number
  rows?: number
}

export interface WsStatusMessage {
  type: 'ready' | 'pong' | 'disconnected' | 'exit' | 'error'
  scrollback_lines?: number
  reason?: string
  code?: number
  message?: string
}

// Terminal configuration
export interface TerminalConfig {
  fontSize: number
  fontFamily: string
  theme: 'dark' | 'light'
  cursorBlink: boolean
  scrollback: number
}

export const DEFAULT_TERMINAL_CONFIG: TerminalConfig = {
  fontSize: 14,
  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
  theme: 'dark',
  cursorBlink: true,
  scrollback: 10000,
}
