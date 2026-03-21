import { createContext, useLayoutEffect, useState } from 'react'

type Theme = 'dark' | 'light'

export interface ThemeContextValue {
    theme: Theme
    toggle: () => void
}

export const ThemeContext = createContext<ThemeContextValue>({ theme: 'dark', toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) ?? 'dark')

    // useLayoutEffect: 페인트 전에 동기 실행 → FOUC 없음. [theme] 의존으로 변경 시 즉시 적용.
    useLayoutEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark')
        localStorage.setItem('theme', theme)
    }, [theme])

    return (
        <ThemeContext.Provider value={{ theme, toggle: () => setTheme(t => t === 'dark' ? 'light' : 'dark') }}>
            {children}
        </ThemeContext.Provider>
    )
}
