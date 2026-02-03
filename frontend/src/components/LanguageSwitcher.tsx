import { useTranslation } from 'react-i18next'
import { Button } from '@heroui/react'
import { LanguageIcon } from '@heroicons/react/24/outline'

const LANGUAGES = [
  { code: 'zh', label: '简体中文' },
  { code: 'en', label: 'English' },
] as const

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation()

  const currentLang = i18n.language?.startsWith('zh') ? 'zh' : 'en'

  const toggleLanguage = () => {
    const nextLang = currentLang === 'zh' ? 'en' : 'zh'
    i18n.changeLanguage(nextLang)
  }

  const nextLang = LANGUAGES.find((l) => l.code !== currentLang)

  return (
    <Button
      variant="light"
      size="sm"
      onPress={toggleLanguage}
      startContent={<LanguageIcon className="h-4 w-4" />}
      className="text-default-500 hover:text-foreground"
    >
      {nextLang?.label}
    </Button>
  )
}

export default LanguageSwitcher
