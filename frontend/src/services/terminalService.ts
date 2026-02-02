import api from '@/lib/api'

// Types
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

export interface SessionsListResponse {
  sessions: TerminalSession[]
  limits: SessionLimits
}

export interface CreateSessionRequest {
  name?: string
  shell?: string
  cwd?: string
  cols?: number
  rows?: number
}

export interface CreateSessionResponse {
  session_id: string
  name: string
  ws_token: string
  ws_url: string
  token_expires_at: string
  created_at: string
}

export interface ReconnectSessionResponse {
  session_id: string
  ws_token: string
  ws_url: string
  token_expires_at: string
  scrollback_available: boolean
}

export interface ScrollbackResponse {
  /** Base64 encoded raw terminal output */
  content: string
  byte_count: number
}

export const terminalService = {
  /**
   * Create a new terminal session
   */
  createSession: async (request: CreateSessionRequest = {}): Promise<CreateSessionResponse> => {
    const response = await api.post('/terminal/sessions', request)
    return response.data.data
  },

  /**
   * List all terminal sessions
   */
  listSessions: async (): Promise<SessionsListResponse> => {
    const response = await api.get('/terminal/sessions')
    return response.data.data
  },

  /**
   * Reconnect to an existing session
   */
  reconnectSession: async (sessionId: string): Promise<ReconnectSessionResponse> => {
    const response = await api.post(`/terminal/sessions/${sessionId}/reconnect`)
    return response.data.data
  },

  /**
   * Get scrollback buffer (returns base64 encoded raw bytes)
   */
  getScrollback: async (sessionId: string): Promise<ScrollbackResponse> => {
    const response = await api.get(`/terminal/sessions/${sessionId}/scrollback`)
    return response.data.data
  },

  /**
   * Terminate a session
   */
  terminateSession: async (sessionId: string): Promise<void> => {
    await api.delete(`/terminal/sessions/${sessionId}`)
  },

  /**
   * Terminate all sessions
   */
  terminateAllSessions: async (): Promise<{ terminated_count: number }> => {
    const response = await api.delete('/terminal/sessions')
    return response.data.data
  },

  /**
   * Build WebSocket URL
   */
  buildWsUrl: (wsPath: string): string => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}${wsPath}`
  },
}
