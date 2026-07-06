import React from 'react';
import useTheme from '../../Hooks/useTheme';

export default function Login({ error }) {
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-logo">
                    <div className="login-logo-icon">📊</div>
                    <span className="login-logo-text">SOHAGAME</span>
                </div>

                <h1 className="login-title">Đăng nhập để tiếp tục</h1>
                <p className="login-subtitle">
                    Sử dụng tài khoản Google để truy cập hệ thống báo cáo
                </p>

                {error && (
                    <div className="login-error">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                        {error}
                    </div>
                )}

                <a href="/auth/google/redirect" className="login-google-btn">
                    <svg className="login-google-icon" viewBox="0 0 24 24" width="20" height="20">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Đăng nhập bằng Google
                </a>

                <div className="login-footer">
                    <button className="login-theme-toggle" onClick={toggleTheme}>
                        {theme === 'dark' ? '☀️ Giao diện sáng' : '🌙 Giao diện tối'}
                    </button>
                </div>
            </div>
        </div>
    );
}
