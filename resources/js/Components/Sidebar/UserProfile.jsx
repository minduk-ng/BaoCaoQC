import React from 'react';
import { usePage, router } from '@inertiajs/react';

export default function UserProfile() {
    const { auth } = usePage().props;
    const user = auth?.user;

    if (!user) return null;

    const handleLogout = (e) => {
        e.preventDefault();
        router.post('/auth/logout');
    };

    const initials = user.name
        ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
        : '?';

    return (
        <div className="user-profile">
            {user.avatar ? (
                <img
                    src={user.avatar}
                    alt={user.name}
                    className="user-avatar"
                    referrerPolicy="no-referrer"
                />
            ) : (
                <div className="user-avatar-placeholder">{initials}</div>
            )}
            <div className="user-info">
                <div className="user-name" title={user.name}>{user.name}</div>
                <div className="user-email" title={user.email}>{user.email}</div>
            </div>
            <button
                onClick={handleLogout}
                className="user-logout-btn"
                title="Đăng xuất"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
            </button>
        </div>
    );
}
