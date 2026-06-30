import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import ThemeToggle from './ThemeToggle';

export default function Sidebar() {
    const { url } = usePage();

    const isActive = (path) => url.startsWith(path);

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
                <Link
                    href="/report"
                    className={`nav-item ${isActive('/report') ? 'active' : ''}`}
                >
                    <span className="nav-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="3" width="7" height="4" rx="1" />
                            <rect x="14" y="10" width="7" height="11" rx="1" />
                            <rect x="3" y="13" width="7" height="8" rx="1" />
                        </svg>
                    </span>
                    Báo cáo
                </Link>
                <Link
                    href="/compare"
                    className={`nav-item ${isActive('/compare') ? 'active' : ''}`}
                >
                    <span className="nav-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
                        </svg>
                    </span>
                    So sánh
                </Link>
            </div>
        </nav>
    );
}
