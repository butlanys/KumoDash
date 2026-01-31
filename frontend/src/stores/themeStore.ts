import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => {
        set({ theme })
        updateThemeClass(theme)
      },
    }),
    {
      name: 'kumodash-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          updateThemeClass(state.theme)
        }
      },
    }
  )
)

function updateThemeClass(theme: Theme) {
  const root = window.document.documentElement
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  
  root.classList.remove('light', 'dark')
  root.classList.add(isDark ? 'dark' : 'light')
}

// Initial check for system preference listener
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { theme } = useThemeStore.getState()
    if (theme === 'system') {
      updateThemeClass('system')
    }
  })
}
