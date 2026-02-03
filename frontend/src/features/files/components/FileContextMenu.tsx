import { useCallback, useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  useDisclosure,
  Listbox,
  ListboxItem,
  ListboxSection,
  Card,
} from '@heroui/react'
import {
  DocumentDuplicateIcon,
  ScissorsIcon,
  TrashIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  FolderOpenIcon,
  ClipboardIcon,
  FolderPlusIcon,
  DocumentPlusIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import type { FileEntry } from '@/services/filesService'
import { filesService } from '@/services/filesService'
import { toast } from 'sonner'
import { PermissionsEditor } from './PermissionsEditor'

interface FileContextMenuProps {
  entry: FileEntry | null
  position: { x: number; y: number } | null
  currentPath: string
  onClose: () => void
  onRefresh: () => void
  onOpen: (entry: FileEntry) => void
  onCreateFolder: (name: string) => Promise<void>
  onCreateFile: (name: string) => Promise<void>
  clipboard: { action: 'copy' | 'cut'; path: string } | null
  setClipboard: (clipboard: { action: 'copy' | 'cut'; path: string } | null) => void
}

export function FileContextMenu({
  entry,
  position,
  currentPath,
  onClose,
  onRefresh,
  onOpen,
  onCreateFolder,
  onCreateFile,
  clipboard,
  setClipboard,
}: FileContextMenuProps) {
  const { t } = useTranslation()
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null)

  const { isOpen: isRenameOpen, onOpen: onRenameOpen, onClose: onRenameClose } = useDisclosure()
  const { isOpen: isPermOpen, onOpen: onPermOpen, onClose: onPermClose } = useDisclosure()
  const { isOpen: isNewFolderOpen, onOpen: onNewFolderOpen, onClose: onNewFolderClose } = useDisclosure()
  const { isOpen: isNewFileOpen, onOpen: onNewFileOpen, onClose: onNewFileClose } = useDisclosure()
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure()
  
  const [newName, setNewName] = useState('')
  const [permissions, setPermissions] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const [newFileName, setNewFileName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<FileEntry | null>(null)

  useEffect(() => {
    if (position) {
      const menuWidth = 200
      const menuHeight = entry ? 320 : 200
      const x = Math.min(position.x, window.innerWidth - menuWidth - 10)
      const y = Math.min(position.y, window.innerHeight - menuHeight - 10)
      setMenuPosition({ x: Math.max(10, x), y: Math.max(10, y) })
    } else {
      setMenuPosition(null)
    }
  }, [position, entry])

  useEffect(() => {
    if (entry) {
      setNewName(entry.name)
      // Convert symbolic permissions (rwxr-xr-x) to octal (755)
      const symbolicToOctal = (perm: string): string => {
        if (/^[0-7]{3}$/.test(perm)) return perm
        if (perm.length !== 9) return '644'
        const toDigit = (r: string, w: string, x: string) =>
          (r === 'r' ? 4 : 0) + (w === 'w' ? 2 : 0) + (x === 'x' || x === 's' || x === 't' ? 1 : 0)
        return `${toDigit(perm[0], perm[1], perm[2])}${toDigit(perm[3], perm[4], perm[5])}${toDigit(perm[6], perm[7], perm[8])}`
      }
      setPermissions(symbolicToOctal(entry.permissions))
    }
  }, [entry])

  useEffect(() => {
    if (!menuPosition) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    const handleScroll = () => onClose()

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    document.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('scroll', handleScroll, true)
    }
  }, [menuPosition, onClose])

  const getFullPath = useCallback(
    (name: string) => `${currentPath}/${name}`.replace(/\/+/g, '/'),
    [currentPath]
  )

  const handleCopy = useCallback(() => {
    if (!entry) return
    setClipboard({ action: 'copy', path: getFullPath(entry.name) })
    toast.success(t('files.copied_to_clipboard'))
    onClose()
  }, [entry, getFullPath, setClipboard, t, onClose])

  const handleCut = useCallback(() => {
    if (!entry) return
    setClipboard({ action: 'cut', path: getFullPath(entry.name) })
    toast.success(t('files.cut_to_clipboard'))
    onClose()
  }, [entry, getFullPath, setClipboard, t, onClose])

  const handlePaste = useCallback(async () => {
    if (!clipboard) return
    setIsLoading(true)
    try {
      const fileName = clipboard.path.split('/').pop() || ''
      const destPath = getFullPath(fileName)
      
      if (clipboard.action === 'copy') {
        await filesService.copy({ from: clipboard.path, to: destPath, overwrite: false })
      } else {
        await filesService.rename({ from: clipboard.path, to: destPath })
        setClipboard(null)
      }
      toast.success(t('files.paste_success'))
      onRefresh()
    } catch {
      toast.error(t('files.paste_failed'))
    } finally {
      setIsLoading(false)
      onClose()
    }
  }, [clipboard, getFullPath, setClipboard, t, onRefresh, onClose])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return

    setIsLoading(true)
    try {
      await filesService.delete({ path: getFullPath(deleteTarget.name), recursive: true })
      toast.success(t('files.delete_success'))
      onRefresh()
      onDeleteClose()
      setDeleteTarget(null)
    } catch {
      toast.error(t('files.delete_failed'))
    } finally {
      setIsLoading(false)
    }
  }, [deleteTarget, getFullPath, t, onRefresh, onDeleteClose])

  const handleRename = useCallback(async () => {
    if (!entry || !newName.trim() || newName === entry.name) {
      onRenameClose()
      return
    }

    setIsLoading(true)
    try {
      await filesService.rename({
        from: getFullPath(entry.name),
        to: getFullPath(newName.trim()),
      })
      toast.success(t('files.rename_success'))
      onRefresh()
      onRenameClose()
    } catch {
      toast.error(t('files.rename_failed'))
    } finally {
      setIsLoading(false)
    }
  }, [entry, newName, getFullPath, t, onRefresh, onRenameClose])

  const handleChangePermissions = useCallback(async () => {
    if (!entry || !permissions.trim()) {
      onPermClose()
      return
    }

    // TODO: Implement chmod API
    toast.info(t('files.chmod_not_implemented'))
    onPermClose()
  }, [entry, permissions, t, onPermClose])

  const handleDownload = useCallback(() => {
    if (!entry) return
    const url = filesService.getDownloadUrl(getFullPath(entry.name))
    window.open(url, '_blank')
    onClose()
  }, [entry, getFullPath, onClose])

  const handleOpenAction = useCallback(() => {
    if (!entry) return
    onOpen(entry)
    onClose()
  }, [entry, onOpen, onClose])

  const handleNewFolder = useCallback(async () => {
    if (!newFolderName.trim()) {
      onNewFolderClose()
      return
    }
    setIsLoading(true)
    try {
      await onCreateFolder(newFolderName.trim())
      onNewFolderClose()
      setNewFolderName('')
    } catch {
      // Error handled by parent
    } finally {
      setIsLoading(false)
    }
  }, [newFolderName, onCreateFolder, onNewFolderClose])

  const handleNewFile = useCallback(async () => {
    if (!newFileName.trim()) {
      onNewFileClose()
      return
    }
    setIsLoading(true)
    try {
      await onCreateFile(newFileName.trim())
      onNewFileClose()
      setNewFileName('')
    } catch {
      // Error handled by parent
    } finally {
      setIsLoading(false)
    }
  }, [newFileName, onCreateFile, onNewFileClose])

  const handleAction = useCallback(
    (key: React.Key) => {
      switch (key) {
        case 'open':
          handleOpenAction()
          break
        case 'download':
          handleDownload()
          break
        case 'copy':
          handleCopy()
          break
        case 'cut':
          handleCut()
          break
        case 'paste':
          handlePaste()
          break
        case 'rename':
          onClose()
          onRenameOpen()
          break
        case 'permissions':
          onClose()
          onPermOpen()
          break
        case 'delete':
          if (entry) {
            setDeleteTarget(entry)
          }
          onClose()
          onDeleteOpen()
          break
        case 'new_folder':
          onClose()
          setNewFolderName('')
          onNewFolderOpen()
          break
        case 'new_file':
          onClose()
          setNewFileName('')
          onNewFileOpen()
          break
        case 'refresh':
          onClose()
          onRefresh()
          break
      }
    },
    [handleOpenAction, handleDownload, handleCopy, handleCut, handlePaste, onClose, onRenameOpen, onPermOpen, onDeleteOpen, onNewFolderOpen, onNewFileOpen, onRefresh]
  )

  // Context menu for blank area (no entry selected)
  const blankContextMenu = menuPosition && !entry ? createPortal(
    <Card
      ref={menuRef}
      className="fixed z-50 min-w-[180px] shadow-lg"
      style={{ left: menuPosition.x, top: menuPosition.y }}
    >
      <Listbox
        aria-label={t('files.context_menu')}
        onAction={handleAction}
        variant="flat"
        className="p-1"
      >
        <ListboxSection showDivider>
          <ListboxItem
            key="new_folder"
            startContent={<FolderPlusIcon className="w-4 h-4" />}
          >
            {t('files.new_folder')}
          </ListboxItem>
          <ListboxItem
            key="new_file"
            startContent={<DocumentPlusIcon className="w-4 h-4" />}
          >
            {t('files.new_file')}
          </ListboxItem>
        </ListboxSection>

        {clipboard ? (
          <ListboxSection showDivider>
            <ListboxItem
              key="paste"
              startContent={<ClipboardIcon className="w-4 h-4" />}
              isDisabled={isLoading}
            >
              {t('files.paste')}
            </ListboxItem>
          </ListboxSection>
        ) : null}

        <ListboxSection>
          <ListboxItem
            key="refresh"
            startContent={<ArrowPathIcon className="w-4 h-4" />}
          >
            {t('files.refresh')}
          </ListboxItem>
        </ListboxSection>
      </Listbox>
    </Card>,
    document.body
  ) : null

  // Context menu for file/folder entry
  const entryContextMenu = menuPosition && entry ? createPortal(
    <Card
      ref={menuRef}
      className="fixed z-50 min-w-[180px] shadow-lg"
      style={{ left: menuPosition.x, top: menuPosition.y }}
    >
      <Listbox
        aria-label={t('files.context_menu')}
        onAction={handleAction}
        variant="flat"
        className="p-1"
      >
        <ListboxSection showDivider>
          <ListboxItem
            key="open"
            startContent={entry.type === 'directory' ? <FolderOpenIcon className="w-4 h-4" /> : <DocumentTextIcon className="w-4 h-4" />}
          >
            {entry.type === 'directory' ? t('files.open_folder') : t('files.open_file')}
          </ListboxItem>
          {entry.type !== 'directory' ? (
            <ListboxItem
              key="download"
              startContent={<ArrowDownTrayIcon className="w-4 h-4" />}
            >
              {t('files.download')}
            </ListboxItem>
          ) : null}
        </ListboxSection>

        <ListboxSection showDivider>
          <ListboxItem
            key="copy"
            startContent={<DocumentDuplicateIcon className="w-4 h-4" />}
          >
            {t('files.copy')}
          </ListboxItem>
          <ListboxItem
            key="cut"
            startContent={<ScissorsIcon className="w-4 h-4" />}
          >
            {t('files.cut')}
          </ListboxItem>
          {clipboard ? (
            <ListboxItem
              key="paste"
              startContent={<ClipboardIcon className="w-4 h-4" />}
              isDisabled={isLoading}
            >
              {t('files.paste')}
            </ListboxItem>
          ) : null}
        </ListboxSection>

        <ListboxSection showDivider>
          <ListboxItem
            key="rename"
            startContent={<PencilIcon className="w-4 h-4" />}
          >
            {t('files.rename')}
          </ListboxItem>
          <ListboxItem
            key="permissions"
            startContent={<ShieldCheckIcon className="w-4 h-4" />}
          >
            {t('files.permissions')}
          </ListboxItem>
        </ListboxSection>

        <ListboxSection>
          <ListboxItem
            key="delete"
            color="danger"
            className="text-danger"
            startContent={<TrashIcon className="w-4 h-4" />}
          >
            {t('files.delete')}
          </ListboxItem>
        </ListboxSection>
      </Listbox>
    </Card>,
    document.body
  ) : null

  return (
    <>
      {blankContextMenu}
      {entryContextMenu}

      {/* Rename Modal */}
      <Modal isOpen={isRenameOpen} onClose={onRenameClose}>
        <ModalContent>
          <ModalHeader>{t('files.rename')}</ModalHeader>
          <ModalBody>
            <Input
              label={t('files.new_name')}
              value={newName}
              onValueChange={setNewName}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              autoFocus
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onRenameClose}>
              {t('common.cancel')}
            </Button>
            <Button color="primary" onPress={handleRename} isLoading={isLoading}>
              {t('files.rename')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Permissions Modal */}
      <Modal isOpen={isPermOpen} onClose={onPermClose} size="md">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <span>{t('files.change_permissions')}</span>
            {entry && (
              <span className="text-sm font-normal text-default-500">{entry.name}</span>
            )}
          </ModalHeader>
          <ModalBody>
            <PermissionsEditor value={permissions} onChange={setPermissions} />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onPermClose}>
              {t('common.cancel')}
            </Button>
            <Button color="primary" onPress={handleChangePermissions} isLoading={isLoading}>
              {t('common.save')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* New Folder Modal */}
      <Modal isOpen={isNewFolderOpen} onClose={onNewFolderClose}>
        <ModalContent>
          <ModalHeader>{t('files.new_folder')}</ModalHeader>
          <ModalBody>
            <Input
              label={t('files.folder_name')}
              placeholder={t('files.folder_name_placeholder')}
              value={newFolderName}
              onValueChange={setNewFolderName}
              onKeyDown={(e) => e.key === 'Enter' && handleNewFolder()}
              autoFocus
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onNewFolderClose}>
              {t('common.cancel')}
            </Button>
            <Button color="primary" onPress={handleNewFolder} isLoading={isLoading}>
              {t('common.create')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* New File Modal */}
      <Modal isOpen={isNewFileOpen} onClose={onNewFileClose}>
        <ModalContent>
          <ModalHeader>{t('files.new_file')}</ModalHeader>
          <ModalBody>
            <Input
              label={t('files.file_name')}
              placeholder={t('files.file_name_placeholder')}
              value={newFileName}
              onValueChange={setNewFileName}
              onKeyDown={(e) => e.key === 'Enter' && handleNewFile()}
              autoFocus
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onNewFileClose}>
              {t('common.cancel')}
            </Button>
            <Button color="primary" onPress={handleNewFile} isLoading={isLoading}>
              {t('common.create')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalContent>
          <ModalHeader>{t('files.delete')}</ModalHeader>
          <ModalBody>
            <p>{t('files.delete_confirm', { count: 1 })}</p>
            {deleteTarget && (
              <p className="text-default-500 mt-2">
                {deleteTarget.name}
              </p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onDeleteClose}>
              {t('common.cancel')}
            </Button>
            <Button color="danger" onPress={handleDelete} isLoading={isLoading}>
              {t('files.delete')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
