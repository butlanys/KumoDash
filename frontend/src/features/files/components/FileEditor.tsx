import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Spinner,
  Chip,
  Textarea,
} from '@heroui/react'
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { useFileContent } from '../hooks/useFileManager'
import { filesService } from '@/services/filesService'
import { toast } from 'sonner'

interface FileEditorProps {
  path: string | null
  isOpen: boolean
  onClose: () => void
  onSave?: () => void
}

const MAX_EDITABLE_SIZE = 1024 * 1024 // 1MB

export function FileEditor({ path, isOpen, onClose, onSave }: FileEditorProps) {
  const { t } = useTranslation()
  const { data: fileContent, isLoading, error } = useFileContent(path)
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (fileContent?.content) {
      if (fileContent.encoding === 'utf-8') {
        setContent(fileContent.content)
      } else {
        setContent('')
      }
      setHasChanges(false)
    }
  }, [fileContent])

  const handleContentChange = useCallback((value: string) => {
    setContent(value)
    setHasChanges(true)
  }, [])

  const handleSave = useCallback(async () => {
    if (!path) return

    setIsSaving(true)
    try {
      await filesService.writeFile({ path, content })
      setHasChanges(false)
      toast.success(t('files.save_success'))
      onSave?.()
    } catch (err) {
      toast.error(t('files.save_failed'))
    } finally {
      setIsSaving(false)
    }
  }, [path, content, t, onSave])

  const handleDownload = useCallback(() => {
    if (!path) return
    const url = filesService.getDownloadUrl(path)
    window.open(url, '_blank')
  }, [path])

  const handleClose = useCallback(() => {
    if (hasChanges) {
      if (window.confirm(t('files.unsaved_changes'))) {
        onClose()
      }
    } else {
      onClose()
    }
  }, [hasChanges, onClose, t])

  const isEditable =
    fileContent?.encoding === 'utf-8' && fileContent.size <= MAX_EDITABLE_SIZE
  const isBinary = fileContent?.encoding === 'base64'
  const isTooLarge = fileContent && fileContent.size > MAX_EDITABLE_SIZE

  const fileName = path?.split('/').pop() || ''

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="5xl"
      scrollBehavior="inside"
      classNames={{
        base: 'max-h-[90vh]',
        body: 'p-0',
      }}
    >
      <ModalContent>
        <ModalHeader className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="truncate max-w-[400px]">{fileName}</span>
            {hasChanges && (
              <Chip size="sm" color="warning" variant="flat">
                {t('files.unsaved')}
              </Chip>
            )}
          </div>
          <div className="flex items-center gap-1">
            {fileContent && (
              <Chip size="sm" variant="flat">
                {fileContent.mime_type}
              </Chip>
            )}
          </div>
        </ModalHeader>

        <ModalBody>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-danger">
              <p>{t('files.load_failed')}</p>
            </div>
          ) : isBinary ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-default-400">
              <p>{t('files.binary_file')}</p>
              <Button
                color="primary"
                startContent={<ArrowDownTrayIcon className="w-4 h-4" />}
                onPress={handleDownload}
              >
                {t('files.download')}
              </Button>
            </div>
          ) : isTooLarge ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-default-400">
              <p>{t('files.file_too_large')}</p>
              <Button
                color="primary"
                startContent={<ArrowDownTrayIcon className="w-4 h-4" />}
                onPress={handleDownload}
              >
                {t('files.download')}
              </Button>
            </div>
          ) : (
            <Textarea
              value={content}
              onValueChange={handleContentChange}
              minRows={20}
              maxRows={40}
              classNames={{
                input: 'font-mono text-sm',
                inputWrapper: 'rounded-none',
              }}
            />
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="flat" onPress={handleClose}>
            {t('common.close')}
          </Button>
          <Button
            color="primary"
            startContent={<ArrowDownTrayIcon className="w-4 h-4" />}
            onPress={handleDownload}
          >
            {t('files.download')}
          </Button>
          {isEditable && (
            <Button
              color="success"
              startContent={<ArrowDownTrayIcon className="w-4 h-4" />}
              onPress={handleSave}
              isLoading={isSaving}
              isDisabled={!hasChanges}
            >
              {t('common.save')}
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
