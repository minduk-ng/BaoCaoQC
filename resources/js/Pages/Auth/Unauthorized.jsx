import React from 'react';
import { usePage, router, Head } from '@inertiajs/react';
import useTheme from '../../Hooks/useTheme';

export default function Unauthorized() {
    const { auth } = usePage().props;
    const { theme, toggleTheme } = useTheme();
    const user = auth?.user;

    const handleLogout = (e) => {
        e.preventDefault();
        router.post('/auth/logout');
    };

    return (
        <div className="unauthorized-page">
            <Head title="Không có quyền - BaoCaoQC" />
            <div className="unauthorized-card">
                <div className="unauthorized-icon">🔒</div>
                <h1 className="unauthorized-title">Không có quyền truy cập</h1>
                <p className="unauthorized-message">
                    Tài khoản của bạn chưa được cấp quyền sử dụng hệ thống.
                    Vui lòng liên hệ Admin để được cấp quyền.
                </p>
                {user && (
                    <p className="unauthorized-email">
                        Đang đăng nhập với: {user.email}
                    </p>
                )}
                <button onClick={handleLogout} className="unauthorized-logout-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Đăng xuất
                </button>
            </div>
        </div>
    );
}
