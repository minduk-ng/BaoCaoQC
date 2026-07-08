import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import ThemeToggle from './ThemeToggle';
import UserProfile from './UserProfile';

export default function Sidebar() {
    const { url, props } = usePage();
    const user = props.auth?.user;
    const allowedPages = user?.allowed_pages || [];

    const isActive = (path) => url.startsWith(path);

    // Define menu items mapped to page slugs
    const menuItems = [
        {
            href: '/report',
            label: 'Báo cáo',
            slug: 'report',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="4" rx="1" />
                    <rect x="14" y="10" width="7" height="11" rx="1" />
                    <rect x="3" y="13" width="7" height="8" rx="1" />
                </svg>
            ),
        },
        {
            href: '/top-campaign',
            label: 'Top QC',
            slug: 'top-campaign',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 21h8M12 17v4M7 4h10l2 7H5L7 4zM12 11l-3 4h6l-3-4z" />
                </svg>
            ),
        },
        {
            href: '/compare',
            label: 'So sánh',
            slug: 'compare',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
                </svg>
            ),
        },
        {
            href: '/admin',
            label: 'Phân quyền',
            slug: 'admin-panel',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 11c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z" />
                </svg>
            ),
        },
    ];

    // Filter menu items based on allowed pages from DB
    const visibleItems = menuItems.filter(item => allowedPages.includes(item.slug));

    return (
        <nav className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">📊</div>
                    <span className="sidebar-logo-text">SOHAGAME</span>
                </div>
            </div>

            <ThemeToggle />

            <div className="sidebar-nav">
                <div className="sidebar-nav-label">Menu</div>
                {visibleItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        {item.label}
                    </Link>
                ))}
            </div>

            <UserProfile />
        </nav>
    );
}
