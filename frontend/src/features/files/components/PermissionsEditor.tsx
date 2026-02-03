import { useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Checkbox, Input, Divider } from '@heroui/react'
import { UserIcon, UserGroupIcon, GlobeAltIcon } from '@heroicons/react/24/outline'

interface PermissionsEditorProps {
  value: string
  onChange: (value: string) => void
}

interface PermissionSet {
  read: boolean
  write: boolean
  execute: boolean
}

function parseOctal(octal: string): { owner: PermissionSet; group: PermissionSet; others: PermissionSet } {
  const digits = octal.replace(/^0*/, '').padStart(3, '0').slice(-3)
  const parse = (digit: string): PermissionSet => {
    const n = parseInt(digit, 10) || 0
    return {
      read: (n & 4) !== 0,
      write: (n & 2) !== 0,
      execute: (n & 1) !== 0,
    }
  }
  return {
    owner: parse(digits[0]),
    group: parse(digits[1]),
    others: parse(digits[2]),
  }
}

function toOctal(perms: { owner: PermissionSet; group: PermissionSet; others: PermissionSet }): string {
  const toDigit = (p: PermissionSet): number =>
    (p.read ? 4 : 0) + (p.write ? 2 : 0) + (p.execute ? 1 : 0)
  return `${toDigit(perms.owner)}${toDigit(perms.group)}${toDigit(perms.others)}`
}

function toSymbolic(perms: { owner: PermissionSet; group: PermissionSet; others: PermissionSet }): string {
  const toStr = (p: PermissionSet): string =>
    (p.read ? 'r' : '-') + (p.write ? 'w' : '-') + (p.execute ? 'x' : '-')
  return toStr(perms.owner) + toStr(perms.group) + toStr(perms.others)
}

export function PermissionsEditor({ value, onChange }: PermissionsEditorProps) {
  const { t } = useTranslation()

  const perms = useMemo(() => parseOctal(value), [value])
  const symbolic = useMemo(() => toSymbolic(perms), [perms])

  const handleChange = useCallback(
    (target: 'owner' | 'group' | 'others', perm: 'read' | 'write' | 'execute', checked: boolean) => {
      const newPerms = {
        owner: { ...perms.owner },
        group: { ...perms.group },
        others: { ...perms.others },
      }
      newPerms[target][perm] = checked
      onChange(toOctal(newPerms))
    },
    [perms, onChange]
  )

  const handleOctalChange = useCallback(
    (val: string) => {
      const cleaned = val.replace(/[^0-7]/g, '').slice(0, 3)
      onChange(cleaned)
    },
    [onChange]
  )

  const PermRow = ({
    icon,
    label,
    target,
    permSet,
  }: {
    icon: React.ReactNode
    label: string
    target: 'owner' | 'group' | 'others'
    permSet: PermissionSet
  }) => (
    <div className="flex items-center gap-4 py-2">
      <div className="flex items-center gap-2 w-24 text-default-600">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-6">
        <Checkbox
          size="sm"
          isSelected={permSet.read}
          onValueChange={(checked) => handleChange(target, 'read', checked)}
        >
          {t('files.perm_read')}
        </Checkbox>
        <Checkbox
          size="sm"
          isSelected={permSet.write}
          onValueChange={(checked) => handleChange(target, 'write', checked)}
        >
          {t('files.perm_write')}
        </Checkbox>
        <Checkbox
          size="sm"
          isSelected={permSet.execute}
          onValueChange={(checked) => handleChange(target, 'execute', checked)}
        >
          {t('files.perm_execute')}
        </Checkbox>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <PermRow
          icon={<UserIcon className="w-4 h-4" />}
          label={t('files.perm_owner')}
          target="owner"
          permSet={perms.owner}
        />
        <Divider />
        <PermRow
          icon={<UserGroupIcon className="w-4 h-4" />}
          label={t('files.perm_group')}
          target="group"
          permSet={perms.group}
        />
        <Divider />
        <PermRow
          icon={<GlobeAltIcon className="w-4 h-4" />}
          label={t('files.perm_others')}
          target="others"
          permSet={perms.others}
        />
      </div>

      <div className="flex items-center gap-4 pt-2">
        <Input
          size="sm"
          label={t('files.perm_octal')}
          value={value}
          onValueChange={handleOctalChange}
          className="w-24"
          maxLength={3}
          classNames={{
            input: 'text-base font-mono',
          }}
        />
        <div className="flex-1">
          <span className="text-xs text-default-400">{t('files.perm_symbolic')}</span>
          <code className="block text-base font-mono text-foreground">{symbolic}</code>
        </div>
      </div>
    </div>
  )
}
