import React from 'react';
import Sidebar from '../Components/Sidebar/Sidebar';

export default function MainLayout({ children }) {
    return (
        <>
            <Sidebar />
            <main className="main-content">
                {children}
            </main>
        </>
    );
}
