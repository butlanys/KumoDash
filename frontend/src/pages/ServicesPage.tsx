import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tabs,
  Tab,
  Textarea,
  Switch,
} from '@heroui/react'
import { ArrowPathIcon, MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline'
import { toast } from 'sonner'
import { systemdService } from '@/services/systemdService'
import type { SystemdUnit } from '@/features/systemd/types'
import Editor from '@monaco-editor/react'

const DEFAULT_UNIT_CONTENT = `[Unit]\nDescription=New Service\nAfter=network.target\n\n[Service]\nExecStart=/usr/bin/your-command\nRestart=on-failure\n\n[Install]\nWantedBy=multi-user.target\n`

type UnitAction = 'start' | 'stop' | 'restart'

type PendingAction = {
  name: string
  action: UnitAction
} | null

export default function ServicesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [selectedUnit, setSelectedUnit] = useState<SystemdUnit | null>(null)
  const [search, setSearch] = useState('')
  const [since, setSince] = useState('1h')
  const [limit, setLimit] = useState(200)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'logs' | 'editor'>('logs')
  const [editorContent, setEditorContent] = useState('')
  const [editorDirty, setEditorDirty] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newContent, setNewContent] = useState(DEFAULT_UNIT_CONTENT)
  const [newEnable, setNewEnable] = useState(false)
  const [newStart, setNewStart] = useState(false)

  const unitsQuery = useQuery({
    queryKey: ['systemdUnits'],
    queryFn: systemdService.getUnits,
    refetchInterval: 15000,
  })

  const logsQuery = useQuery({
    queryKey: ['systemdLogs', selectedUnit?.name, since, limit],
    queryFn: () => systemdService.getLogs(selectedUnit!.name, { since, limit }),
    enabled: detailsOpen && !!selectedUnit,
    refetchInterval: 5000,
  })

  const unitFileQuery = useQuery({
    queryKey: ['systemdUnitFile', selectedUnit?.name],
    queryFn: () => systemdService.getUnitFile(selectedUnit!.name),
    enabled: detailsOpen && !!selectedUnit,
  })

  const controlMutation = useMutation({
    mutationFn: ({ name, action }: { name: string; action: UnitAction }) =>
      systemdService.controlUnit(name, action),
    onMutate: (vars) => {
      setPendingAction(vars)
    },
    onSuccess: async () => {
      toast.success(t('services.actionSuccess'))
      await queryClient.invalidateQueries({ queryKey: ['systemdUnits'] })
    },
    onError: () => {
      toast.error(t('services.actionError'))
    },
    onSettled: () => {
      setPendingAction(null)
    },
  })

  const updateFileMutation = useMutation({
    mutationFn: () => systemdService.updateUnitFile(selectedUnit!.name, editorContent),
    onSuccess: async () => {
      toast.success(t('services.editorSaveSuccess'))
      setEditorDirty(false)
      await queryClient.invalidateQueries({ queryKey: ['systemdUnitFile'] })
    },
    onError: () => {
      toast.error(t('services.editorSaveError'))
    },
  })

  const createMutation = useMutation({
    mutationFn: () =>
      systemdService.createUnit({
        name: newName.trim(),
        content: newContent,
        enable: newEnable,
        start: newStart,
      }),
    onSuccess: async () => {
      toast.success(t('services.createSuccess'))
      setCreateOpen(false)
      setNewName('')
      setNewContent(DEFAULT_UNIT_CONTENT)
      setNewEnable(false)
      setNewStart(false)
      await queryClient.invalidateQueries({ queryKey: ['systemdUnits'] })
    },
    onError: () => {
      toast.error(t('services.createError'))
    },
  })

  useEffect(() => {
    if (unitFileQuery.data) {
      setEditorContent(unitFileQuery.data.content)
      setEditorDirty(false)
    }
  }, [unitFileQuery.data])

  const sortedUnits = useMemo(() => {
    if (!unitsQuery.data) return []
    return [...unitsQuery.data].sort((a, b) => a.name.localeCompare(b.name))
  }, [unitsQuery.data])

  const filteredUnits = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return sortedUnits
    return sortedUnits.filter((unit) =>
      unit.name.toLowerCase().includes(query) || unit.description.toLowerCase().includes(query)
    )
  }, [sortedUnits, search])

  const handleRowClick = (unit: SystemdUnit) => {
    setSelectedUnit(unit)
    setActiveTab('logs')
    setDetailsOpen(true)
  }

  const handleEditClick = (unit: SystemdUnit) => {
    setSelectedUnit(unit)
    setActiveTab('editor')
    setDetailsOpen(true)
  }

  const handleCloseDetails = () => {
    if (editorDirty && !window.confirm(t('services.unsavedChanges'))) {
      return
    }
    setDetailsOpen(false)
    setSelectedUnit(null)
  }

  const handleCreate = () => {
    const trimmedName = newName.trim()
    if (!trimmedName || !trimmedName.endsWith('.service')) {
      toast.error(t('services.nameInvalid'))
      return
    }
    if (!newContent.trim()) {
      toast.error(t('services.contentRequired'))
      return
    }
    createMutation.mutate()
  }

  if (unitsQuery.isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center min-h-[50vh]">
        <Spinner size="lg" label="Loading services..." />
      </div>
    )
  }

  if (unitsQuery.isError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 min-h-[50vh] text-default-500">
        <div>{t('services.description')}</div>
        <Button variant="flat" onPress={() => unitsQuery.refetch()}>
          {t('services.refresh')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('services.title')}</h1>
          <p className="text-sm text-default-500">{t('services.description')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            size="sm"
            startContent={<MagnifyingGlassIcon className="h-4 w-4 text-default-400" />}
            placeholder={t('services.searchPlaceholder')}
            value={search}
            onValueChange={setSearch}
            className="min-w-[200px]"
          />
          <Button
            color="primary"
            startContent={<PlusIcon className="h-4 w-4" />}
            onPress={() => setCreateOpen(true)}
          >
            {t('services.newService')}
          </Button>
          <Button
            variant="flat"
            startContent={<ArrowPathIcon className="h-4 w-4" />}
            onPress={() => unitsQuery.refetch()}
          >
            {t('services.refresh')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="text-sm font-semibold">{t('services.title')}</CardHeader>
        <CardBody>
          <Table aria-label="systemd units" removeWrapper>
            <TableHeader>
              <TableColumn>{t('services.unit')}</TableColumn>
              <TableColumn>{t('services.load')}</TableColumn>
              <TableColumn>{t('services.active')}</TableColumn>
              <TableColumn>{t('services.sub')}</TableColumn>
              <TableColumn>{t('services.descriptionCol')}</TableColumn>
              <TableColumn>{t('services.actions')}</TableColumn>
            </TableHeader>
            <TableBody emptyContent={t('services.empty')}>
              {filteredUnits.map((unit) => (
                <TableRow
                  key={unit.name}
                  className="cursor-pointer hover:bg-default-100"
                  onClick={() => handleRowClick(unit)}
                >
                  <TableCell className="font-medium text-primary">{unit.name}</TableCell>
                  <TableCell>{unit.load_state}</TableCell>
                  <TableCell>{unit.active_state}</TableCell>
                  <TableCell>{unit.sub_state}</TableCell>
                  <TableCell className="max-w-[320px] truncate">{unit.description}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="flat"
                        isLoading={
                          pendingAction?.name === unit.name && pendingAction?.action === 'start'
                        }
                        onClick={(event) => {
                          event.stopPropagation()
                          controlMutation.mutate({ name: unit.name, action: 'start' })
                        }}
                      >
                        {t('services.actionStart')}
                      </Button>
                      <Button
                        size="sm"
                        variant="flat"
                        color="warning"
                        isLoading={
                          pendingAction?.name === unit.name && pendingAction?.action === 'stop'
                        }
                        onClick={(event) => {
                          event.stopPropagation()
                          controlMutation.mutate({ name: unit.name, action: 'stop' })
                        }}
                      >
                        {t('services.actionStop')}
                      </Button>
                      <Button
                        size="sm"
                        color="primary"
                        isLoading={
                          pendingAction?.name === unit.name && pendingAction?.action === 'restart'
                        }
                        onClick={(event) => {
                          event.stopPropagation()
                          controlMutation.mutate({ name: unit.name, action: 'restart' })
                        }}
                      >
                        {t('services.actionRestart')}
                      </Button>
                      <Button
                        size="sm"
                        variant="flat"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleEditClick(unit)
                        }}
                      >
                        {t('services.actionEdit')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <Modal isOpen={detailsOpen} onClose={handleCloseDetails} size="5xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <span className="text-sm text-default-500">{t('services.detailsTitle')}</span>
            <span className="text-lg font-semibold">{selectedUnit?.name}</span>
          </ModalHeader>
          <ModalBody className="min-h-[520px]">
            <Tabs
              selectedKey={activeTab}
              onSelectionChange={(key) => setActiveTab(key as 'logs' | 'editor')}
              aria-label={t('services.detailsTitle')}
            >
              <Tab key="logs" title={t('services.tabLogs')}>
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center">
                    <Input
                      size="sm"
                      label={t('services.logsSince')}
                      value={since}
                      onValueChange={setSince}
                      className="min-w-[120px]"
                    />
                    <Input
                      size="sm"
                      type="number"
                      label={t('services.logsLimit')}
                      value={String(limit)}
                      min={1}
                      max={500}
                      onValueChange={(value) => {
                        const parsed = Number(value)
                        if (Number.isFinite(parsed)) {
                          setLimit(parsed)
                        }
                      }}
                      className="min-w-[120px]"
                    />
                    <Button size="sm" variant="flat" onPress={() => logsQuery.refetch()}>
                      {t('services.logsFetch')}
                    </Button>
                  </div>

                  {logsQuery.isLoading && <Spinner size="sm" label="Loading logs..." />}
                  {logsQuery.data && (
                    <div className="max-h-[360px] overflow-auto rounded-lg border border-default-200 bg-default-50 p-3 font-mono text-xs">
                      {logsQuery.data.length === 0 && (
                        <div className="text-default-500">{t('services.logsEmpty')}</div>
                      )}
                      {logsQuery.data.map((entry, index) => (
                        <div key={`${entry.timestamp}-${index}`} className="whitespace-pre-wrap">
                          <span className="text-default-500">{entry.timestamp}</span>{' '}
                          <span>{entry.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Tab>
              <Tab key="editor" title={t('services.tabEditor')}>
                <div className="space-y-4">
                  {unitFileQuery.isLoading && <Spinner size="sm" label="Loading file..." />}
                  {unitFileQuery.data && (
                    <div className="text-xs text-default-500">
                      {t('services.editorPath')}: {unitFileQuery.data.path}
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="text-xs text-default-500">{t('services.editorTitle')}</div>
                    <div
                      className="overflow-hidden rounded-lg border border-default-200 max-h-[65vh]"
                      style={{ height: 'calc(100vh - 360px)', minHeight: '260px' }}
                    >
                      <Editor
                        height="100%"
                        language="ini"
                        theme="vs-dark"
                        value={editorContent}
                        onChange={(value) => {
                          setEditorContent(value ?? '')
                          setEditorDirty(true)
                        }}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 13,
                          lineNumbers: 'on',
                          scrollBeyondLastLine: false,
                          wordWrap: 'on',
                          automaticLayout: true,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      color="primary"
                      isLoading={updateFileMutation.isPending}
                      isDisabled={!editorDirty || updateFileMutation.isPending}
                      onPress={() => updateFileMutation.mutate()}
                    >
                      {t('services.editorSave')}
                    </Button>
                  </div>
                </div>
              </Tab>
            </Tabs>
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} size="5xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>{t('services.newServiceTitle')}</ModalHeader>
          <ModalBody className="space-y-4">
            <Input
              label={t('services.nameLabel')}
              placeholder={t('services.namePlaceholder')}
              value={newName}
              onValueChange={setNewName}
            />
            <Textarea
              label={t('services.contentLabel')}
              placeholder={t('services.contentPlaceholder')}
              value={newContent}
              onValueChange={setNewContent}
              minRows={12}
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Switch isSelected={newEnable} onValueChange={setNewEnable}>
                {t('services.enableAfterCreate')}
              </Switch>
              <Switch isSelected={newStart} onValueChange={setNewStart}>
                {t('services.startAfterCreate')}
              </Switch>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setCreateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button color="primary" isLoading={createMutation.isPending} onPress={handleCreate}>
              {t('services.create')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
