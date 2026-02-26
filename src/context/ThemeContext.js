'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
    theme: 'dark',
    toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('dark');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Baca dari localStorage saat pertama kali mount
        const saved = localStorage.getItem('dashboard-theme');
        const initial = saved ? saved : 'dark';
        setTheme(initial);
        applyTheme(initial);
        setMounted(true);
    }, []);

    const applyTheme = (t) => {
        const root = document.documentElement;
        if (t === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    };

    const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        applyTheme(next);
        localStorage.setItem('dashboard-theme', next);
    };

    // Hindari flash saat SSR → tampilkan setelah mounted
    if (!mounted) {
        return <>{children}</>;
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
