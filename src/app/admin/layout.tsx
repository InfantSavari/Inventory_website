'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
        <p>Loading session...</p>
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="nav-logo">
          <div className="nav-logo-icon" />
          <span>Admin Portal</span>
        </div>

        <nav>
          <ul className="nav-links">
            <li>
              <Link href="/admin" className={`nav-link ${pathname === '/admin' ? 'active' : ''}`}>
                Dashboard
              </Link>
            </li>
            <li>
              <Link href="/admin/products" className={`nav-link ${pathname === '/admin/products' ? 'active' : ''}`}>
                Manage Products
              </Link>
            </li>
            <li>
              <Link href="/admin/orders" className={`nav-link ${pathname === '/admin/orders' ? 'active' : ''}`}>
                Review Orders
              </Link>
            </li>
          </ul>
        </nav>

        <div className="nav-footer">
          <div className="user-badge">
            <span className="user-name">{user.name}</span>
            <span className="user-role">Administrator</span>
          </div>
          <button id="admin-signout-btn" onClick={logout} className="btn-secondary" style={{ width: '100%', fontSize: '0.85rem' }}>
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
