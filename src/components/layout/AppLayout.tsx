'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const isPublicPage = pathname === '/login' || pathname === '/unauthorized';

  if (isPublicPage) {
    return <div className="auth-container-wrapper" style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>{children}</div>;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header />
        <main style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px 0' }}>
          <div className="glass-panel" style={{ height: '100%', padding: '24px', overflowY: 'auto' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
