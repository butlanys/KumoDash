import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback } from 'react'
import { filesService, type DirectoryListing } from '@/services/filesService'

export function useFileManager(initialPath = '/') {
  const queryClient = useQueryClient()
  const [currentPath, setCurrentPath] = useState(initialPath)
  const [showHidden, setShowHidden] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])

  // Fetch directory listing
  const listing = useQuery({
    queryKey: ['files', 'list', currentPath, showHidden],
    queryFn: () => filesService.listDir(currentPath, showHidden),
  })

  // Navigate to path
  const navigateTo = useCallback((path: string) => {
    setCurrentPath(path)
    setSelectedFiles([])
  }, [])

  // Navigate to parent
  const navigateUp = useCallback(() => {
    if (listing.data?.parent) {
      navigateTo(listing.data.parent)
    }
  }, [listing.data?.parent, navigateTo])

  // Refresh current directory
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['files', 'list', currentPath] })
  }, [queryClient, currentPath])

  // Create directory mutation
  const createDir = useMutation({
    mutationFn: (name: string) =>
      filesService.createDir({
        path: `${currentPath}/${name}`.replace(/\/+/g, '/'),
        recursive: true,
      }),
    onSuccess: () => refresh(),
  })

  // Delete mutation
  const deleteFiles = useMutation({
    mutationFn: async (paths: string[]) => {
      for (const path of paths) {
        await filesService.delete({ path, recursive: true })
      }
    },
    onSuccess: () => {
      setSelectedFiles([])
      refresh()
    },
  })

  // Rename mutation
  const rename = useMutation({
    mutationFn: ({ from, to }: { from: string; to: string }) =>
      filesService.rename({ from, to }),
    onSuccess: () => refresh(),
  })

  // Copy mutation
  const copy = useMutation({
    mutationFn: ({ from, to }: { from: string; to: string }) =>
      filesService.copy({ from, to, overwrite: false }),
    onSuccess: () => refresh(),
  })

  // Upload mutation
  const upload = useMutation({
    mutationFn: (files: File[]) => filesService.upload(currentPath, files),
    onSuccess: () => refresh(),
  })

  // Create empty file mutation
  const createFile = useMutation({
    mutationFn: (name: string) =>
      filesService.writeFile({
        path: `${currentPath}/${name}`.replace(/\/+/g, '/'),
        content: '',
        create_dirs: false,
      }),
    onSuccess: () => refresh(),
  })

  // Toggle file selection
  const toggleSelect = useCallback((name: string) => {
    setSelectedFiles((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    )
  }, [])

  // Select all
  const selectAll = useCallback(() => {
    if (listing.data) {
      setSelectedFiles(listing.data.entries.map((e) => e.name))
    }
  }, [listing.data])

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedFiles([])
  }, [])

  // Get full path for a file name
  const getFullPath = useCallback(
    (name: string) => `${currentPath}/${name}`.replace(/\/+/g, '/'),
    [currentPath]
  )

  return {
    // State
    currentPath,
    showHidden,
    selectedFiles,
    listing,

    // Navigation
    navigateTo,
    navigateUp,
    refresh,

    // Settings
    setShowHidden,

    // Selection
    toggleSelect,
    selectAll,
    clearSelection,

    // Mutations
    createDir,
    createFile,
    deleteFiles,
    rename,
    copy,
    upload,

    // Utils
    getFullPath,
  }
}

export function useFileContent(path: string | null) {
  return useQuery({
    queryKey: ['files', 'content', path],
    queryFn: () => (path ? filesService.readFile(path) : null),
    enabled: !!path,
  })
}

export function useFileInfo(path: string | null) {
  return useQuery({
    queryKey: ['files', 'stat', path],
    queryFn: () => (path ? filesService.stat(path) : null),
    enabled: !!path,
  })
}

export function useFileSearch() {
  const [results, setResults] = useState<DirectoryListing | null>(null)

  const search = useMutation({
    mutationFn: (params: { path: string; pattern: string }) =>
      filesService.search({
        path: params.path,
        pattern: params.pattern,
        max_depth: 10,
        max_results: 100,
      }),
    onSuccess: (data) => {
      setResults({
        path: '',
        entries: data.matches,
        parent: null,
      })
    },
  })

  const clearResults = useCallback(() => {
    setResults(null)
  }, [])

  return {
    results,
    search,
    clearResults,
    isSearching: search.isPending,
  }
}
