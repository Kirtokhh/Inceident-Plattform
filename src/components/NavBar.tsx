'use client';

import { useAdminAuth } from '@/lib/admin-auth-context';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const VERWALTUNG_ITEMS = [
  { href: '/admin/kvps', label: 'KVPs' },
  { href: '/admin/users', label: 'Administratoren' },
];

export default function NavBar() {
  const { admin, loading, logout } = useAdminAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Public pages: don't show admin nav
  const isAdminArea = pathname.startsWith('/dashboard') || pathname.startsWith('/incidents') || pathname.startsWith('/admin');
  const isInVerwaltung = VERWALTUNG_ITEMS.some(i => pathname.startsWith(i.href));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold text-hanse-navy tracking-tight">IncidentHub</span>
          </a>
          <div className="flex items-center gap-1">
            {!loading && admin && isAdminArea ? (
              <>
                <a href="/dashboard" className={`px-4 py-2 rounded-xl transition-all text-sm font-medium ${
                  pathname === '/dashboard' ? 'bg-init-green/10 text-init-green' : 'text-hanse-navy hover:bg-init-green/5 hover:text-init-green'
                }`}>
                  Dashboard
                </a>

                {/* Verwaltung Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setOpen(o => !o)}
                    className={`px-4 py-2 rounded-xl transition-all text-sm font-medium flex items-center gap-1 ${
                      isInVerwaltung ? 'bg-init-green/10 text-init-green' : 'text-hanse-navy hover:bg-init-green/5 hover:text-init-green'
                    }`}
                  >
                    Verwaltung
                    <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {open && (
                    <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
                      {VERWALTUNG_ITEMS.map(item => (
                        <a
                          key={item.href}
                          href={item.href}
                          className={`block px-4 py-2 text-sm transition-colors ${
                            pathname.startsWith(item.href)
                              ? 'bg-init-green/10 text-init-green font-medium'
                              : 'text-hanse-navy hover:bg-gray-50'
                          }`}
                        >
                          {item.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <a href="/admin/maintenance" className={`px-4 py-2 rounded-xl transition-all text-sm font-medium ml-2 ${
                  pathname.startsWith('/admin/maintenance') ? 'bg-init-green/10 text-init-green' : 'text-hanse-navy hover:bg-init-green/5 hover:text-init-green'
                }`}>
                  Wartungen
                </a>
                <a href="/incidents/new" className="btn-primary text-sm ml-2">
                  + Neues Incident
                </a>
                <div className="ml-4 pl-4 border-l border-gray-200 flex items-center gap-2">
                  <span className="text-xs text-gray-500">{admin.display_name}</span>
                  <button
                    onClick={async () => { await logout(); window.location.href = '/'; }}
                    className="text-xs text-gray-400 hover:text-hanse-navy transition-colors px-2 py-1"
                  >
                    Abmelden
                  </button>
                </div>
              </>
            ) : (
              <>
                <a href="/status" className={`px-4 py-2 rounded-xl transition-all text-sm font-medium ${
                  pathname === '/status' ? 'bg-init-green/10 text-init-green' : 'text-hanse-navy hover:bg-init-green/5 hover:text-init-green'
                }`}>
                  Kunden-Portal
                </a>
                <a href="/login" className={`px-4 py-2 rounded-xl transition-all text-sm font-medium ${
                  pathname === '/login' ? 'bg-init-green/10 text-init-green' : 'text-hanse-navy hover:bg-init-green/5 hover:text-init-green'
                }`}>
                  Admin
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
