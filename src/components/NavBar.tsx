'use client';

import { useAdminAuth } from '@/lib/admin-auth-context';
import { usePathname } from 'next/navigation';

export default function NavBar() {
  const { admin, loading, logout } = useAdminAuth();
  const pathname = usePathname();

  // Public pages: don't show admin nav
  const isAdminArea = pathname.startsWith('/dashboard') || pathname.startsWith('/incidents');

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
