import React from 'react';
import useTheme from '../../Hooks/useTheme';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="theme-toggle-wrapper">
            <div className="theme-toggle" onClick={toggleTheme}>
                <span className="theme-toggle-icon">
                    {theme === 'dark' ? '🌙' : '☀️'}
                </span>
                <span className="theme-toggle-label">
                    {theme === 'dark' ? 'Giao diện tối' : 'Giao diện sáng'}
                </span>
                <div className="theme-switch"></div>
            </div>
        </div>
    );
}
