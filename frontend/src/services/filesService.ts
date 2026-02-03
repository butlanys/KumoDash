import api from '@/lib/api'

// Types
export type FileType = 'file' | 'directory' | 'symlink'

export interface FileEntry {
  name: string
  type: FileType
  size: number
  modified: number
  permissions: string
  symlink_target?: string
}

export interface DirectoryListing {
  path: string
  entries: FileEntry[]
  parent: string | null
}

export interface FileContent {
  path: string
  content: string
  size: number
  encoding: 'utf-8' | 'base64'
  mime_type: string
}

export interface FileInfo {
  path: string
  name: string
  type: FileType
  size: number
  modified: number
  created: number
  accessed: number
  permissions: string
  owner: string
  group: string
  symlink_target?: string
}

export interface FileOperationResult {
  path: string
}

export interface SearchResult {
  matches: FileEntry[]
  total: number
  truncated: boolean
}

export interface WriteFileRequest {
  path: string
  content: string
  create_dirs?: boolean
}

export interface CreateDirRequest {
  path: string
  recursive?: boolean
}

export interface RenameRequest {
  from: string
  to: string
}

export interface CopyRequest {
  from: string
  to: string
  overwrite?: boolean
}

export interface DeleteRequest {
  path: string
  recursive?: boolean
}

export interface SearchRequest {
  path: string
  pattern: string
  max_depth?: number
  max_results?: number
}

export const filesService = {
  /**
   * List directory contents
   */
  listDir: async (path: string, showHidden = false): Promise<DirectoryListing> => {
    const response = await api.get('/files', {
      params: { path, show_hidden: showHidden },
    })
    return response.data.data
  },

  /**
   * Read file content
   */
  readFile: async (path: string, maxSize?: number): Promise<FileContent> => {
    const response = await api.get('/files/read', {
      params: { path, max_size: maxSize },
    })
    return response.data.data
  },

  /**
   * Write file content
   */
  writeFile: async (request: WriteFileRequest): Promise<FileOperationResult> => {
    const response = await api.put('/files/write', request)
    return response.data.data
  },

  /**
   * Create directory
   */
  createDir: async (request: CreateDirRequest): Promise<FileOperationResult> => {
    const response = await api.post('/files/mkdir', request)
    return response.data.data
  },

  /**
   * Rename/move file or directory
   */
  rename: async (request: RenameRequest): Promise<FileOperationResult> => {
    const response = await api.put('/files/rename', request)
    return response.data.data
  },

  /**
   * Copy file or directory
   */
  copy: async (request: CopyRequest): Promise<FileOperationResult> => {
    const response = await api.post('/files/copy', request)
    return response.data.data
  },

  /**
   * Delete file or directory
   */
  delete: async (request: DeleteRequest): Promise<FileOperationResult> => {
    const response = await api.delete('/files/delete', { data: request })
    return response.data.data
  },

  /**
   * Get file info (stat)
   */
  stat: async (path: string): Promise<FileInfo> => {
    const response = await api.get('/files/stat', { params: { path } })
    return response.data.data
  },

  /**
   * Search files
   */
  search: async (request: SearchRequest): Promise<SearchResult> => {
    const response = await api.post('/files/search', request)
    return response.data.data
  },

  /**
   * Get download URL
   */
  getDownloadUrl: (path: string): string => {
    const token = localStorage.getItem('access_token')
    return `/api/v1/files/download?path=${encodeURIComponent(path)}&token=${token}`
  },

  /**
   * Upload files
   */
  upload: async (
    targetPath: string,
    files: File[],
    onProgress?: (percent: number) => void
  ): Promise<FileOperationResult[]> => {
    const formData = new FormData()
    formData.append('path', targetPath)
    files.forEach((file) => {
      formData.append('file', file)
    })

    const response = await api.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(percent)
        }
      },
    })
    return response.data.data
  },
}
