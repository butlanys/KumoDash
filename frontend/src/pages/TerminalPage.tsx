import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, ButtonGroup, Card, CardBody, Spinner, Chip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, useDisclosure } from '@heroui/react'
import { PlusIcon, CommandLineIcon, ArrowPathIcon, TrashIcon, EllipsisVerticalIcon, WifiIcon, XMarkIcon, XCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { TerminalView } from '@/features/terminal/components/TerminalView'
import { useTerminalSession } from '@/features/terminal/hooks/useTerminalSession'
import { WsConnectionStatus } from '@/features/terminal/types'
import { terminalService } from '@/services/terminalService'
import { toast } from 'sonner'

const STATUS_COLORS: Record<WsConnectionStatus, 'success' | 'warning' | 'danger' | 'default'> = {
  connected: 'success',
  connecting: 'warning',
  reconnecting: 'warning',
  disconnected: 'default',
  error: 'danger',
}

const STATUS_ICONS: Record<WsConnectionStatus, React.ReactNode> = {
  connected: <WifiIcon className="w-3 h-3" />,
  connecting: <ArrowPathIcon className="w-3 h-3 animate-spin" />,
  reconnecting: <ArrowPathIcon className="w-3 h-3 animate-spin" />,
  disconnected: <XMarkIcon className="w-3 h-3" />,
  error: <XMarkIcon className="w-3 h-3" />,
}

export default function TerminalPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const sessionIdFromUrl = searchParams.get('session')
  
  const {
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
    setConnectionStatus,
    isCreating,
    isReconnecting,
    isLoadingScrollback,
  } = useTerminalSession()

  const { isOpen: isNewSessionOpen, onOpen: onNewSessionOpen, onClose: onNewSessionClose } = useDisclosure()
  const [newSessionName, setNewSessionName] = useState('')
  const isDisconnectingRef = useRef(false)

  // Auto-connect to session from URL or create new
  useEffect(() => {
    // Skip if we're in the process of disconnecting
    if (isDisconnectingRef.current) return
    
    if (sessionIdFromUrl && !session) {
      reconnectSession(sessionIdFromUrl).catch(() => {
        toast.error(t('terminal.session_not_found'))
        setSearchParams({})
      })
    }
  }, [sessionIdFromUrl, session, reconnectSession, setSearchParams, t])

  const handleCreateSession = async () => {
    try {
      const result = await createSession({ 
        name: newSessionName || undefined 
      })
      setSearchParams({ session: result.session_id })
      onNewSessionClose()
      setNewSessionName('')
      toast.success(t('terminal.session_created'))
    } catch (err) {
      toast.error(t('terminal.create_failed'))
    }
  }

  const handleSelectSession = async (sessionId: string) => {
    try {
      await reconnectSession(sessionId)
      setSearchParams({ session: sessionId })
    } catch {
      toast.error(t('terminal.reconnect_failed'))
    }
  }

  const handleTerminateSession = async (sessionId: string) => {
    const isCurrentSession = session?.session_id === sessionId
    
    // If terminating current session, clear URL first to unmount TerminalView
    // This prevents infinite reconnection attempts
    if (isCurrentSession) {
      setSearchParams({})
    }
    
    try {
      await terminateSession(sessionId)
      toast.success(t('terminal.session_terminated'))
    } catch {
      toast.error(t('terminal.terminate_failed'))
    }
  }

  const handleSessionEnd = (reason: string) => {
    // Clear session state when server terminates the session
    if (reason === 'terminated' || reason === 'server_disconnect') {
      isDisconnectingRef.current = true
      setSearchParams({})
      disconnectSession()
      toast.info(t('terminal.session_terminated'))
      setTimeout(() => {
        isDisconnectingRef.current = false
      }, 100)
    } else if (reason === 'normal' || reason.startsWith('exit_')) {
      toast.info(t('terminal.session_ended'))
    } else if (reason === 'max_reconnect_exceeded') {
      toast.error(t('terminal.connection_lost'))
    }
  }

  const handleDisconnect = () => {
    // Set flag to prevent useEffect from triggering reconnect
    isDisconnectingRef.current = true
    // Clear URL first
    setSearchParams({})
    // Disconnect session and show toast
    disconnectSession()
    toast.info(t('terminal.disconnected'))
    // Reset flag after a short delay
    setTimeout(() => {
      isDisconnectingRef.current = false
    }, 100)
  }

  const handleDisconnectAndDestroy = async () => {
    if (session?.session_id) {
      // Just call terminate API, server will notify us via WebSocket
      try {
        await terminalService.terminateSession(session.session_id)
        sessions.refetch()
      } catch {
        toast.error(t('terminal.terminate_failed'))
      }
    }
  }

  const handleTerminateAllSessions = async () => {
    try {
      disconnectSession()
      setSearchParams({})
      const result = await terminalService.terminateAllSessions()
      sessions.refetch()
      toast.success(t('terminal.all_sessions_terminated', { count: result.terminated_count }))
    } catch {
      toast.error(t('terminal.terminate_all_failed'))
    }
  }

  const isLoading = isCreating || isReconnecting || isLoadingScrollback

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
                    <CommandLineIcon className="w-6 h-6" />
          <h1 className="text-2xl font-bold">{t('terminal.title')}</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Connection Status */}
          {session && (
            <Chip
              color={STATUS_COLORS[connectionStatus]}
              variant="flat"
              size="sm"
              startContent={STATUS_ICONS[connectionStatus]}
            >
              {t(`terminal.status.${connectionStatus}`)}
            </Chip>
          )}
          
          {/* Disconnect Button (Split Button) */}
          {session && (
            <ButtonGroup size="sm" variant="flat">
              <Button
                color="warning"
                startContent={<XCircleIcon className="w-4 h-4" />}
                onPress={handleDisconnect}
              >
                {t('terminal.disconnect')}
              </Button>
              <Dropdown placement="bottom-end">
                <DropdownTrigger>
                  <Button isIconOnly color="warning">
                                        <ChevronDownIcon className="w-4 h-4" />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu aria-label="Disconnect options">
                  <DropdownItem
                    key="disconnect-destroy"
                    color="danger"
                    className="text-danger"
                    startContent={<TrashIcon className="w-4 h-4" />}
                    onPress={handleDisconnectAndDestroy}
                  >
                    {t('terminal.disconnect_and_destroy')}
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </ButtonGroup>
          )}
          
          {/* Session Selector */}
          {sessions.data && sessions.data.sessions.length > 0 && (
            <Dropdown>
              <DropdownTrigger>
                <Button variant="flat" size="sm">
                  {session ? session.session_id.slice(0, 8) : t('terminal.select_session')}
                                    <EllipsisVerticalIcon className="w-4 h-4 ml-1" />
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Sessions">
                {sessions.data.sessions.map((s) => (
                  <DropdownItem
                    key={s.session_id}
                    onPress={() => handleSelectSession(s.session_id)}
                    endContent={
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleTerminateSession(s.session_id)
                        }}
                      >
                                                <TrashIcon className="w-3 h-3" />
                      </Button>
                    }
                  >
                    <div className="flex flex-col">
                      <span>{s.name}</span>
                      <span className="text-xs text-default-400">
                        {new Date(s.created_at).toLocaleString()}
                      </span>
                    </div>
                  </DropdownItem>
                ))}
                <DropdownItem
                  key="terminate-all"
                  color="danger"
                  className="text-danger"
                  startContent={<TrashIcon className="w-4 h-4" />}
                  onPress={handleTerminateAllSessions}
                >
                  {t('terminal.terminate_all')}
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          )}
          
          {/* New Session Button */}
          <Button
            color="primary"
            size="sm"
            startContent={<PlusIcon className="w-4 h-4" />}
            onPress={onNewSessionOpen}
            isLoading={isCreating}
          >
            {t('terminal.new_session')}
          </Button>
        </div>
      </div>

      {/* Terminal View */}
      <Card className="flex-1">
        <CardBody className="p-0 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Spinner size="lg" label={t('terminal.connecting')} />
            </div>
          ) : session && wsUrl && wsToken && sessionIdFromUrl ? (
            <TerminalView
              key={session.session_id}
              wsUrl={wsUrl}
              wsToken={wsToken}
              scrollbackData={scrollbackData || undefined}
              onStatusChange={setConnectionStatus}
              onSessionEnd={handleSessionEnd}
            />
          ) : sessions.data && sessions.data.sessions.length > 0 ? (
            // Show session list when sessions exist but none is connected
            <div className="flex flex-col h-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{t('terminal.available_sessions')}</h2>
                <Button
                  size="sm"
                  color="danger"
                  variant="flat"
                  startContent={<TrashIcon className="w-4 h-4" />}
                  onPress={handleTerminateAllSessions}
                >
                  {t('terminal.terminate_all')}
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {sessions.data.sessions.map((s) => (
                  <Card
                    key={s.session_id}
                    isPressable
                    className="border border-default-200"
                    onPress={() => handleSelectSession(s.session_id)}
                  >
                    <CardBody className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                                                        <CommandLineIcon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{s.name}</p>
                            <p className="text-xs text-default-400">
                              {new Date(s.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div
                          className="inline-flex items-center justify-center p-1 rounded-md cursor-pointer hover:bg-danger/20 text-danger"
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            handleTerminateSession(s.session_id)
                          }}
                        >
                                                    <TrashIcon className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <Chip size="sm" color={s.status === 'running' ? 'success' : 'default'} variant="flat">
                          {s.status === 'running' ? t('terminal.status.running') : t('terminal.status.stopped')}
                        </Chip>
                        {s.connected_clients > 0 && (
                          <Chip size="sm" color="primary" variant="flat">
                            {t('terminal.connected_clients', { count: s.connected_clients })}
                          </Chip>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                ))}
                {/* New Session Card */}
                <Card
                  isPressable
                  className="border border-dashed border-default-300 bg-default-50"
                  onPress={onNewSessionOpen}
                >
                  <CardBody className="flex flex-col items-center justify-center p-6 text-default-400">
                                        <PlusIcon className="w-8 h-8 mb-2" />
                    <p>{t('terminal.create_session')}</p>
                  </CardBody>
                </Card>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-default-400">
                            <CommandLineIcon className="w-16 h-16" />
              <p>{t('terminal.no_session')}</p>
              <Button
                color="primary"
                startContent={<PlusIcon className="w-4 h-4" />}
                onPress={onNewSessionOpen}
              >
                {t('terminal.create_session')}
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* New Session Modal */}
      <Modal isOpen={isNewSessionOpen} onClose={onNewSessionClose}>
        <ModalContent>
          <ModalHeader>{t('terminal.new_session')}</ModalHeader>
          <ModalBody>
            <Input
              label={t('terminal.session_name')}
              placeholder={t('terminal.session_name_placeholder')}
              value={newSessionName}
              onValueChange={setNewSessionName}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onNewSessionClose}>
              {t('common.cancel')}
            </Button>
            <Button 
              color="primary" 
              onPress={handleCreateSession}
              isLoading={isCreating}
            >
              {t('terminal.create')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
