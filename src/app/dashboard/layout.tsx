'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
        <p>Loading session...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="nav-logo">
          <div className="nav-logo-icon" style={{ background: 'linear-gradient(135deg, var(--color-success), #34d399)' }} />
          <span>Dashboard Portal</span>
        </div>

        <nav>
          <ul className="nav-links">
            <li>
              <Link href="/dashboard" className={`nav-link ${pathname === '/dashboard' ? 'active' : ''}`}>
                Catalog & Ordering
              </Link>
            </li>
            <li>
              <Link href="/dashboard/orders" className={`nav-link ${pathname === '/dashboard/orders' ? 'active' : ''}`}>
                My Orders
              </Link>
            </li>
          </ul>
        </nav>

        <div className="nav-footer">
          <div className="user-badge">
            <span className="user-name">{user.name}</span>
            <span className="user-role">Customer</span>
          </div>
          <button id="dashboard-signout-btn" onClick={logout} className="btn-secondary" style={{ width: '100%', fontSize: '0.85rem' }}>
            Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
