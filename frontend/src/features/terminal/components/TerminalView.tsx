import { useEffect, useRef, useState } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import 'xterm/css/xterm.css'
import { WsConnectionStatus, WsStatusMessage, DEFAULT_TERMINAL_CONFIG } from '../types'

interface TerminalViewProps {
  wsUrl: string
  wsToken: string
  onStatusChange?: (status: WsConnectionStatus) => void
  onSessionEnd?: (reason: string) => void
  scrollbackData?: Uint8Array
}

const CONTROL_PREFIX = '\x00'
const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_BASE_DELAY = 1000

export function TerminalView({
  wsUrl,
  wsToken,
  onStatusChange,
  onSessionEnd,
  scrollbackData,
}: TerminalViewProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const terminalInstance = useRef<Terminal | null>(null)
  const fitAddon = useRef<FitAddon | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttempts = useRef(0)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const serverTerminatedRef = useRef(false)
  const [status, setStatus] = useState<WsConnectionStatus>('connecting')
  
  // Use refs for callbacks to avoid dependency issues
  const onStatusChangeRef = useRef(onStatusChange)
  const onSessionEndRef = useRef(onSessionEnd)
  
  // Keep refs in sync
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange
  }, [onStatusChange])
  
  useEffect(() => {
    onSessionEndRef.current = onSessionEnd
  }, [onSessionEnd])

  // Initialize terminal and WebSocket - only run once per wsUrl/wsToken
  useEffect(() => {
    if (!terminalRef.current) return

    // Cleanup any existing instance
    if (terminalInstance.current) {
      return
    }

    const updateStatus = (newStatus: WsConnectionStatus) => {
      if (!mountedRef.current) return
      setStatus(newStatus)
      onStatusChangeRef.current?.(newStatus)
    }

    const sendControlMessage = (msg: object) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(CONTROL_PREFIX + JSON.stringify(msg))
      }
    }

    const handleResize = () => {
      if (fitAddon.current && terminalInstance.current) {
        fitAddon.current.fit()
        const { cols, rows } = terminalInstance.current
        sendControlMessage({ type: 'resize', cols, rows })
      }
    }

    const handleStatusMessage = (msg: WsStatusMessage) => {
      switch (msg.type) {
        case 'ready':
          break
        case 'pong':
          break
        case 'disconnected':
          // Mark as server-terminated to prevent reconnection attempts
          serverTerminatedRef.current = true
          updateStatus('disconnected')
          onSessionEndRef.current?.(msg.reason || 'server_disconnect')
          // Close WebSocket cleanly
          if (wsRef.current) {
            wsRef.current.close(1000, 'server terminated')
          }
          break
        case 'exit':
          serverTerminatedRef.current = true
          updateStatus('disconnected')
          onSessionEndRef.current?.(`exit_${msg.code}`)
          break
        case 'error':
          terminalInstance.current?.writeln(`\r\n\x1b[31mError: ${msg.message}\x1b[0m`)
          break
      }
    }

    const connect = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN || 
          wsRef.current?.readyState === WebSocket.CONNECTING) {
        return
      }

      updateStatus('connecting')

      const ws = new WebSocket(wsUrl, ['kumodash-terminal', wsToken])
      ws.binaryType = 'arraybuffer'

      ws.onopen = () => {
        updateStatus('connected')
        reconnectAttempts.current = 0

        if (terminalInstance.current) {
          const { cols, rows } = terminalInstance.current
          sendControlMessage({ type: 'resize', cols, rows })
        }

        terminalInstance.current?.focus()
      }

      ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          terminalInstance.current?.write(new Uint8Array(event.data))
        } else if (typeof event.data === 'string') {
          if (event.data.startsWith(CONTROL_PREFIX)) {
            try {
              const msg: WsStatusMessage = JSON.parse(event.data.slice(1))
              handleStatusMessage(msg)
            } catch {
              terminalInstance.current?.write(event.data)
            }
          } else {
            terminalInstance.current?.write(event.data)
          }
        }
      }

      ws.onclose = (event) => {
        wsRef.current = null
        
        if (!mountedRef.current) return
        
        // Don't reconnect if server terminated the session
        if (serverTerminatedRef.current) {
          updateStatus('disconnected')
          return
        }
        
        if (event.code === 1000 || event.code === 1001) {
          updateStatus('disconnected')
          onSessionEndRef.current?.('normal')
        } else if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          updateStatus('reconnecting')
          const delay = Math.min(
            RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts.current),
            30000
          )
          reconnectTimer.current = setTimeout(() => {
            reconnectAttempts.current++
            connect()
          }, delay)
        } else {
          updateStatus('error')
          onSessionEndRef.current?.('max_reconnect_exceeded')
        }
      }

      ws.onerror = () => {
        if (!mountedRef.current) return
        updateStatus('error')
      }

      wsRef.current = ws
    }

    // Create terminal
    const terminal = new Terminal({
      fontSize: DEFAULT_TERMINAL_CONFIG.fontSize,
      fontFamily: DEFAULT_TERMINAL_CONFIG.fontFamily,
      cursorBlink: DEFAULT_TERMINAL_CONFIG.cursorBlink,
      scrollback: DEFAULT_TERMINAL_CONFIG.scrollback,
      theme: {
        background: '#1a1b26',
        foreground: '#c0caf5',
        cursor: '#c0caf5',
        cursorAccent: '#1a1b26',
        selectionBackground: '#33467c',
        black: '#15161e',
        red: '#f7768e',
        green: '#9ece6a',
        yellow: '#e0af68',
        blue: '#7aa2f7',
        magenta: '#bb9af7',
        cyan: '#7dcfff',
        white: '#a9b1d6',
        brightBlack: '#414868',
        brightRed: '#f7768e',
        brightGreen: '#9ece6a',
        brightYellow: '#e0af68',
        brightBlue: '#7aa2f7',
        brightMagenta: '#bb9af7',
        brightCyan: '#7dcfff',
        brightWhite: '#c0caf5',
      },
    })

    const fit = new FitAddon()
    const webLinks = new WebLinksAddon((event, uri) => {
      event.preventDefault()
      try {
        const url = new URL(uri)
        if (url.protocol === 'https:' || url.protocol === 'http:') {
          window.open(uri, '_blank', 'noopener,noreferrer')
        }
      } catch {
        // Invalid URL, ignore
      }
    })

    terminal.loadAddon(fit)
    terminal.loadAddon(webLinks)
    terminal.open(terminalRef.current)
    fit.fit()

    terminalInstance.current = terminal
    fitAddon.current = fit

    // Write scrollback data if available (raw bytes preserve ANSI sequences)
    if (scrollbackData && scrollbackData.length > 0) {
      terminal.write(scrollbackData)
    }

    terminal.onData((data) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(data)
      }
    })

    const resizeObserver = new ResizeObserver(() => {
      handleResize()
    })
    resizeObserver.observe(terminalRef.current)

    connect()

    return () => {
      mountedRef.current = false
      resizeObserver.disconnect()
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'component unmount')
        wsRef.current = null
      }
      terminalInstance.current = null
      fitAddon.current = null
      // Dispose terminal asynchronously to avoid blocking React render
      setTimeout(() => terminal.dispose(), 0)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsUrl, wsToken])

  return (
    <div 
      ref={terminalRef} 
      className="h-full w-full bg-[#1a1b26] rounded-lg overflow-hidden"
      style={{ minHeight: '400px' }}
    />
  )
}
