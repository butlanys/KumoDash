import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Switch,
  Divider,
} from '@heroui/react'
import {
  FolderPlusIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'

interface FileToolbarProps {
  currentPath: string
  selectedCount: number
  showHidden: boolean
  onRefresh: () => void
  onShowHiddenChange: (show: boolean) => void
  onCreateFolder: (name: string) => void
  onUpload: (files: File[]) => void
  onDelete: () => void
  onSearch: (pattern: string) => void
  isCreating?: boolean
  isDeleting?: boolean
  isUploading?: boolean
}

export function FileToolbar({
  currentPath,
  selectedCount,
  showHidden,
  onRefresh,
  onShowHiddenChange,
  onCreateFolder,
  onUpload,
  onDelete,
  onSearch,
  isCreating,
  isDeleting,
  isUploading,
}: FileToolbarProps) {
  const { t } = useTranslation()
  const [searchPattern, setSearchPattern] = useState('')
  const [newFolderName, setNewFolderName] = useState('')

  const {
    isOpen: isNewFolderOpen,
    onOpen: onNewFolderOpen,
    onClose: onNewFolderClose,
  } = useDisclosure()

  const {
    isOpen: isSearchOpen,
    onOpen: onSearchOpen,
    onClose: onSearchClose,
  } = useDisclosure()

  const handleCreateFolder = useCallback(() => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim())
      setNewFolderName('')
      onNewFolderClose()
    }
  }, [newFolderName, onCreateFolder, onNewFolderClose])

  const handleSearch = useCallback(() => {
    if (searchPattern.trim()) {
      onSearch(searchPattern.trim())
      onSearchClose()
    }
  }, [searchPattern, onSearch, onSearchClose])

  const handleFileUpload = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || [])
      if (files.length > 0) {
        onUpload(files)
      }
    }
    input.click()
  }, [onUpload])

  return (
    <>
      <div className="flex items-center justify-between gap-2 p-2 border-b border-default-200">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="flat"
            startContent={<FolderPlusIcon className="w-4 h-4" />}
            onPress={onNewFolderOpen}
          >
            {t('files.new_folder')}
          </Button>

          <Button
            size="sm"
            variant="flat"
            startContent={<ArrowUpTrayIcon className="w-4 h-4" />}
            onPress={handleFileUpload}
            isLoading={isUploading}
          >
            {t('files.upload')}
          </Button>

          <Divider orientation="vertical" className="h-6" />

          <Button
            size="sm"
            variant="flat"
            isIconOnly
            onPress={onRefresh}
          >
                        <ArrowPathIcon className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant="flat"
            isIconOnly
            onPress={onSearchOpen}
          >
                        <MagnifyingGlassIcon className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <>
              <span className="text-sm text-default-500">
                {t('files.selected_count', { count: selectedCount })}
              </span>
              <Button
                size="sm"
                color="danger"
                variant="flat"
                startContent={<TrashIcon className="w-4 h-4" />}
                onPress={onDelete}
                isLoading={isDeleting}
              >
                {t('files.delete')}
              </Button>
            </>
          )}

          <Switch
            size="sm"
            isSelected={showHidden}
            onValueChange={onShowHiddenChange}
          >
            <span className="text-sm">{t('files.show_hidden')}</span>
          </Switch>
        </div>
      </div>

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
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onNewFolderClose}>
              {t('common.cancel')}
            </Button>
            <Button
              color="primary"
              onPress={handleCreateFolder}
              isLoading={isCreating}
              isDisabled={!newFolderName.trim()}
            >
              {t('common.create')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Search Modal */}
      <Modal isOpen={isSearchOpen} onClose={onSearchClose}>
        <ModalContent>
          <ModalHeader>{t('files.search')}</ModalHeader>
          <ModalBody>
            <Input
              label={t('files.search_pattern')}
              placeholder={t('files.search_placeholder')}
              value={searchPattern}
              onValueChange={setSearchPattern}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              startContent={<MagnifyingGlassIcon className="w-4 h-4 text-default-400" />}
              autoFocus
            />
            <p className="text-sm text-default-400">
              {t('files.search_in', { path: currentPath })}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onSearchClose}>
              {t('common.cancel')}
            </Button>
            <Button
              color="primary"
              onPress={handleSearch}
              isDisabled={!searchPattern.trim()}
            >
              {t('files.search')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
