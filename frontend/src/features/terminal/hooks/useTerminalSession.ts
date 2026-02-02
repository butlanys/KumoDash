import { useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { terminalService, CreateSessionRequest, CreateSessionResponse, ReconnectSessionResponse } from '@/services/terminalService'
import { WsConnectionStatus } from '../types'

interface UseTerminalSessionOptions {
  sessionId?: string
  autoCreate?: boolean
  createOptions?: CreateSessionRequest
}

interface UseTerminalSessionReturn {
  // Session data
  session: CreateSessionResponse | ReconnectSessionResponse | null
  sessions: ReturnType<typeof useQuery<Awaited<ReturnType<typeof terminalService.listSessions>>>>
  
  // Connection state
  wsUrl: string | null
  wsToken: string | null
  connectionStatus: WsConnectionStatus
  scrollbackData: Uint8Array | null
  
  // Actions
  createSession: (options?: CreateSessionRequest) => Promise<CreateSessionResponse>
  reconnectSession: (sessionId: string) => Promise<ReconnectSessionResponse>
  terminateSession: (sessionId: string) => Promise<void>
  disconnectSession: () => void
  refreshToken: () => Promise<void>
  setConnectionStatus: (status: WsConnectionStatus) => void
  
  // Loading states
  isCreating: boolean
  isReconnecting: boolean
  isTerminating: boolean
  isLoadingScrollback: boolean
  
  // Errors
  error: Error | null
}

/**
 * Decode base64 string to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

export function useTerminalSession(options: UseTerminalSessionOptions = {}): UseTerminalSessionReturn {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<CreateSessionResponse | ReconnectSessionResponse | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<WsConnectionStatus>('disconnected')
  const [scrollbackData, setScrollbackData] = useState<Uint8Array | null>(null)
  const [isLoadingScrollback, setIsLoadingScrollback] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Query for session list
  const sessions = useQuery({
    queryKey: ['terminal', 'sessions'],
    queryFn: terminalService.listSessions,
    refetchInterval: 30000, // Refresh every 30s
  })

  // Create session mutation
  const createMutation = useMutation({
    mutationFn: (opts: CreateSessionRequest = {}) => terminalService.createSession(opts),
    onSuccess: (data) => {
      setSession(data)
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['terminal', 'sessions'] })
    },
    onError: (err: Error) => {
      setError(err)
    },
  })

  // Reconnect session mutation
  const reconnectMutation = useMutation<ReconnectSessionResponse, Error, string>({
    mutationFn: async (sessionId: string) => {
      setIsLoadingScrollback(true)
      try {
        // Get reconnect token
        const reconnectData = await terminalService.reconnectSession(sessionId)
        
        // Load scrollback if available
        if (reconnectData.scrollback_available) {
          try {
            const scrollback = await terminalService.getScrollback(sessionId)
            // Decode base64 to Uint8Array
            setScrollbackData(base64ToUint8Array(scrollback.content))
          } catch {
            // Scrollback is optional
            setScrollbackData(null)
          }
        } else {
          setScrollbackData(null)
        }
        
        return reconnectData
      } finally {
        setIsLoadingScrollback(false)
      }
    },
    onSuccess: (data) => {
      setSession(data)
      setError(null)
    },
    onError: (err: Error) => {
      setError(err)
    },
  })

  // Terminate session mutation
  const terminateMutation = useMutation<void, Error, string>({
    mutationFn: async (sessionId: string) => {
      // Clear session state first to unmount TerminalView and stop reconnection
      setSession(null)
      setScrollbackData(null)
      setConnectionStatus('disconnected')
      
      // Then call the API
      await terminalService.terminateSession(sessionId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminal', 'sessions'] })
    },
    onError: (err: Error) => {
      setError(err)
    },
  })

  // Actions
  const createSession = useCallback(async (opts?: CreateSessionRequest) => {
    return createMutation.mutateAsync(opts || options.createOptions || {})
  }, [createMutation, options.createOptions])

  const reconnectSession = useCallback(async (sessionId: string) => {
    return reconnectMutation.mutateAsync(sessionId)
  }, [reconnectMutation])

  const terminateSession = useCallback(async (sessionId: string) => {
    return terminateMutation.mutateAsync(sessionId)
  }, [terminateMutation])

  // Disconnect from current session (keep session alive on server)
  const disconnectSession = useCallback(() => {
    setSession(null)
    setScrollbackData(null)
    setConnectionStatus('disconnected')
  }, [])

  const refreshToken = useCallback(async () => {
    if (session?.session_id) {
      await reconnectMutation.mutateAsync(session.session_id)
    }
  }, [session, reconnectMutation])

  // Compute WebSocket URL and token
  const wsUrl = session ? terminalService.buildWsUrl(session.ws_url) : null
  const wsToken = session?.ws_token || null

  return {
    session,
    sessions,
    wsUrl,
    wsToken,
    connectionStatus,
    scrollbackData,
    createSession,
    reconnectSession,
    terminateSession,
    disconnectSession,
    refreshToken,
    setConnectionStatus,
    isCreating: createMutation.isPending,
    isReconnecting: reconnectMutation.isPending,
    isTerminating: terminateMutation.isPending,
    isLoadingScrollback,
    error,
  }
}
