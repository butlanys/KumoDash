import { useState, useCallback, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardBody } from '@heroui/react'
import { FolderOpenIcon } from '@heroicons/react/24/outline'
import { toast } from 'sonner'
import {
  FileList,
  FileToolbar,
  FileEditor,
  AddressBar,
  FileContextMenu,
} from '@/features/files/components'
import { useFileManager } from '@/features/files/hooks/useFileManager'
import type { FileEntry } from '@/services/filesService'

export default function FilesPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [editingFile, setEditingFile] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    entry: FileEntry | null
    position: { x: number; y: number } | null
  }>({ entry: null, position: null })
  const [clipboard, setClipboard] = useState<{
    action: 'copy' | 'cut'
    path: string
  } | null>(null)

  const initialPath = searchParams.get('path') || '/'

  const {
    currentPath,
    showHidden,
    selectedFiles,
    listing,
    navigateTo,
    refresh,
    setShowHidden,
    toggleSelect,
    createDir,
    createFile,
    deleteFiles,
    upload,
    getFullPath,
  } = useFileManager(initialPath)

  // Sync URL with current path
  useEffect(() => {
    const urlPath = searchParams.get('path') || '/'
    if (urlPath !== currentPath) {
      navigate(`/files?path=${currentPath}`, { replace: true })
    }
  }, [currentPath, searchParams, navigate])

  const handleOpen = useCallback(
    (entry: FileEntry) => {
      if (entry.type === 'directory') {
        navigateTo(getFullPath(entry.name))
      } else {
        setEditingFile(getFullPath(entry.name))
      }
    },
    [navigateTo, getFullPath]
  )

  const handleContextMenu = useCallback(
    (entry: FileEntry | null, event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      setContextMenu({
        entry,
        position: { x: event.clientX, y: event.clientY },
      })
    },
    []
  )

  const handleBlankContextMenu = useCallback(
    (event: React.MouseEvent) => {
      // Only trigger if clicking on the container itself, not on file items
      if (event.target === event.currentTarget || (event.target as HTMLElement).closest('table')) {
        // Check if clicked on empty area of table (not on a row)
        const row = (event.target as HTMLElement).closest('tr[data-key]')
        if (!row) {
          event.preventDefault()
          event.stopPropagation()
          setContextMenu({
            entry: null,
            position: { x: event.clientX, y: event.clientY },
          })
        }
      }
    },
    []
  )

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu({ entry: null, position: null })
  }, [])

  const handleCreateFolder = useCallback(
    async (name: string) => {
      try {
        await createDir.mutateAsync(name)
        toast.success(t('files.folder_created'))
      } catch {
        toast.error(t('files.create_failed'))
      }
    },
    [createDir, t]
  )

  const handleCreateFile = useCallback(
    async (name: string) => {
      try {
        await createFile.mutateAsync(name)
        toast.success(t('files.file_created'))
      } catch {
        toast.error(t('files.create_failed'))
      }
    },
    [createFile, t]
  )

  const handleUpload = useCallback(
    async (files: File[]) => {
      try {
        await upload.mutateAsync(files)
        toast.success(t('files.upload_success'))
      } catch {
        toast.error(t('files.upload_failed'))
      }
    },
    [upload, t]
  )

  const handleDelete = useCallback(async () => {
    if (selectedFiles.length === 0) return

    const confirmed = window.confirm(
      t('files.delete_confirm', { count: selectedFiles.length })
    )
    if (!confirmed) return

    try {
      const paths = selectedFiles.map((name) => getFullPath(name))
      await deleteFiles.mutateAsync(paths)
      toast.success(t('files.delete_success'))
    } catch {
      toast.error(t('files.delete_failed'))
    }
  }, [selectedFiles, deleteFiles, getFullPath, t])

  const handleSearch = useCallback(
    (_pattern: string) => {
      toast.info(t('files.search_not_implemented'))
    },
    [t]
  )

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FolderOpenIcon className="w-6 h-6" />
        <h1 className="text-2xl font-bold">{t('files.title')}</h1>
      </div>

      {/* Address Bar */}
      <div className="flex items-center gap-2">
        <AddressBar path={currentPath} onNavigate={navigateTo} />
      </div>

      {/* Main Content */}
      <Card className="flex-1 min-h-0">
        <CardBody className="flex flex-col h-full p-0 overflow-hidden">
          <FileToolbar
            currentPath={currentPath}
            selectedCount={selectedFiles.length}
            showHidden={showHidden}
            onRefresh={refresh}
            onShowHiddenChange={setShowHidden}
            onCreateFolder={handleCreateFolder}
            onUpload={handleUpload}
            onDelete={handleDelete}
            onSearch={handleSearch}
            isCreating={createDir.isPending}
            isDeleting={deleteFiles.isPending}
            isUploading={upload.isPending}
          />

          <div 
            className="flex-1 min-h-0 overflow-auto"
            onContextMenu={handleBlankContextMenu}
          >
            <FileList
              entries={listing.data?.entries || []}
              selectedFiles={selectedFiles}
              isLoading={listing.isLoading}
              onSelect={toggleSelect}
              onOpen={handleOpen}
              onContextMenu={handleContextMenu}
              onBlankContextMenu={handleBlankContextMenu}
            />
          </div>
        </CardBody>
      </Card>

      {/* Context Menu */}
      <FileContextMenu
        entry={contextMenu.entry}
        position={contextMenu.position}
        currentPath={currentPath}
        onClose={handleCloseContextMenu}
        onRefresh={refresh}
        onOpen={handleOpen}
        onCreateFolder={handleCreateFolder}
        onCreateFile={handleCreateFile}
        clipboard={clipboard}
        setClipboard={setClipboard}
      />

      {/* File Editor Modal */}
      <FileEditor
        path={editingFile}
        isOpen={!!editingFile}
        onClose={() => setEditingFile(null)}
        onSave={refresh}
      />
    </div>
  )
}
