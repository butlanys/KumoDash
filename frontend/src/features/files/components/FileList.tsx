import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Checkbox,
  Spinner,
  Chip,
} from '@heroui/react'
import {
  DocumentIcon,
  FolderIcon,
  LinkIcon,
  PhotoIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  ArchiveBoxIcon,
  FilmIcon,
  MusicalNoteIcon,
} from '@heroicons/react/24/outline'
import type { FileEntry } from '@/services/filesService'

interface FileListProps {
  entries: FileEntry[]
  selectedFiles: string[]
  isLoading?: boolean
  onSelect: (name: string) => void
  onOpen: (entry: FileEntry) => void
  onContextMenu?: (entry: FileEntry, event: React.MouseEvent) => void
  onBlankContextMenu?: (event: React.MouseEvent) => void
}

const FILE_ICONS: Record<string, React.ReactNode> = {
  directory: <FolderIcon className="w-5 h-5 text-warning" />,
  symlink: <LinkIcon className="w-5 h-5 text-secondary" />,
  image: <PhotoIcon className="w-5 h-5 text-success" />,
  video: <FilmIcon className="w-5 h-5 text-danger" />,
  audio: <MusicalNoteIcon className="w-5 h-5 text-primary" />,
  archive: <ArchiveBoxIcon className="w-5 h-5 text-warning" />,
  code: <CodeBracketIcon className="w-5 h-5 text-primary" />,
  text: <DocumentTextIcon className="w-5 h-5 text-default-500" />,
  file: <DocumentIcon className="w-5 h-5 text-default-400" />,
}

function getFileIcon(entry: FileEntry): React.ReactNode {
  if (entry.type === 'directory') return FILE_ICONS.directory
  if (entry.type === 'symlink') return FILE_ICONS.symlink

  const ext = entry.name.split('.').pop()?.toLowerCase() || ''

  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'bmp']
  const videoExts = ['mp4', 'webm', 'mkv', 'avi', 'mov']
  const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'm4a']
  const archiveExts = ['zip', 'tar', 'gz', 'bz2', 'xz', '7z', 'rar']
  const codeExts = ['js', 'ts', 'jsx', 'tsx', 'py', 'rs', 'go', 'java', 'c', 'cpp', 'h', 'css', 'scss', 'html', 'vue', 'svelte']
  const textExts = ['txt', 'md', 'json', 'yaml', 'yml', 'toml', 'xml', 'csv', 'log', 'conf', 'ini', 'sh', 'bash']

  if (imageExts.includes(ext)) return FILE_ICONS.image
  if (videoExts.includes(ext)) return FILE_ICONS.video
  if (audioExts.includes(ext)) return FILE_ICONS.audio
  if (archiveExts.includes(ext)) return FILE_ICONS.archive
  if (codeExts.includes(ext)) return FILE_ICONS.code
  if (textExts.includes(ext)) return FILE_ICONS.text

  return FILE_ICONS.file
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '-'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

function formatDate(timestamp: number): string {
  if (!timestamp) return '-'
  return new Date(timestamp * 1000).toLocaleString()
}

export const FileList = memo(function FileList({
  entries,
  selectedFiles,
  isLoading,
  onSelect,
  onOpen,
  onContextMenu,
  onBlankContextMenu,
}: FileListProps) {
  const { t } = useTranslation()

  const handleRowClick = useCallback(
    (entry: FileEntry) => {
      onOpen(entry)
    },
    [onOpen]
  )

  const handleCheckboxClick = useCallback(
    (name: string, e: React.MouseEvent) => {
      e.stopPropagation()
      onSelect(name)
    },
    [onSelect]
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div 
        className="flex flex-col items-center justify-center h-64 text-default-400"
        onContextMenu={onBlankContextMenu}
      >
        <FolderIcon className="w-16 h-16 mb-4" />
        <p>{t('files.empty_directory')}</p>
      </div>
    )
  }

  return (
    <Table
      aria-label={t('files.file_list')}
      selectionMode="none"
      classNames={{
        base: 'max-h-full',
        wrapper: 'max-h-full overflow-auto',
        tr: 'border-b border-default-100 last:border-b-0',
      }}
    >
      <TableHeader>
        <TableColumn width={40}>{''}</TableColumn>
        <TableColumn>{t('files.name')}</TableColumn>
        <TableColumn width={100}>{t('files.size')}</TableColumn>
        <TableColumn width={180}>{t('files.modified')}</TableColumn>
        <TableColumn width={80}>{t('files.permissions')}</TableColumn>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow
            key={entry.name}
            className="cursor-pointer hover:bg-default-100"
            onClick={() => handleRowClick(entry)}
            onContextMenu={(e) => onContextMenu?.(entry, e)}
          >
            <TableCell>
              <div onClick={(e) => handleCheckboxClick(entry.name, e)}>
                <Checkbox
                  isSelected={selectedFiles.includes(entry.name)}
                  onValueChange={() => onSelect(entry.name)}
                />
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {getFileIcon(entry)}
                <span className="truncate max-w-[300px]">{entry.name}</span>
                {entry.symlink_target && (
                  <Chip size="sm" variant="flat" color="secondary">
                    → {entry.symlink_target}
                  </Chip>
                )}
              </div>
            </TableCell>
            <TableCell>
              <span className="text-default-500">
                {entry.type === 'directory' ? '-' : formatFileSize(entry.size)}
              </span>
            </TableCell>
            <TableCell>
              <span className="text-default-500 text-sm">
                {formatDate(entry.modified)}
              </span>
            </TableCell>
            <TableCell>
              <code className="text-xs text-default-400">{entry.permissions}</code>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
})
