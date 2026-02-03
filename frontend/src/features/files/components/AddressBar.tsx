import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@heroui/react'
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline'

interface AddressBarProps {
  path: string
  onNavigate: (path: string) => void
}

export function AddressBar({ path, onNavigate }: AddressBarProps) {
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState(path)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setInputValue(path)
  }, [path])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const parts = path.split('/').filter(Boolean)
  const pathSegments = parts.map((part, index) => ({
    name: part,
    path: '/' + parts.slice(0, index + 1).join('/'),
  }))

  const handleSubmit = useCallback(() => {
    const trimmed = inputValue.trim()
    if (trimmed && trimmed.startsWith('/')) {
      onNavigate(trimmed)
    }
    setIsEditing(false)
  }, [inputValue, onNavigate])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSubmit()
      } else if (e.key === 'Escape') {
        setInputValue(path)
        setIsEditing(false)
      }
    },
    [handleSubmit, path]
  )

  if (isEditing) {
    return (
      <div className="flex-1">
        <Input
          ref={inputRef}
          size="sm"
          value={inputValue}
          onValueChange={setInputValue}
          onKeyDown={handleKeyDown}
          onBlur={handleSubmit}
          classNames={{
            input: 'font-mono text-sm',
            inputWrapper: 'h-8',
          }}
        />
      </div>
    )
  }

  return (
    <div
      className="flex items-center flex-1 h-8 gap-1 px-3 overflow-x-auto rounded-lg cursor-text bg-default-100 hover:bg-default-200"
      onClick={() => setIsEditing(true)}
    >
      <button
        className="flex items-center justify-center w-5 h-5 rounded hover:bg-default-300"
        onClick={(e) => {
          e.stopPropagation()
          onNavigate('/')
        }}
      >
                <HomeIcon className="w-4 h-4 text-default-500" />
      </button>

      {pathSegments.map((segment, index) => (
        <div key={segment.path} className="flex items-center">
                    <ChevronRightIcon className="w-4 h-4 text-default-400" />
          <button
            className="px-1 text-sm rounded hover:bg-default-300 whitespace-nowrap"
            onClick={(e) => {
              e.stopPropagation()
              onNavigate(segment.path)
            }}
          >
            {segment.name}
          </button>
        </div>
      ))}

      {pathSegments.length === 0 && (
        <span className="text-sm text-default-400">/</span>
      )}
    </div>
  )
}
