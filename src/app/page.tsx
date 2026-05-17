'use client';

import { useAdminAuth } from '@/lib/admin-auth-context';

export default function HomePage() {
  const { admin, loading } = useAdminAuth();

  // If admin is already logged in, redirect to dashboard
  if (!loading && admin) {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
    return null;
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="max-w-2xl w-full">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-init-green/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-init-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-hanse-navy mb-2">IncidentHub</h1>
          <p className="text-gray-500">Incident-Management-Plattform für den ÖPNV</p>
        </div>

        {/* Two Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Card */}
          <a
            href="/status"
            className="card group hover:shadow-card-hover hover:border-init-green/30 transition-all duration-200 cursor-pointer text-center"
          >
            <div className="w-12 h-12 bg-init-green/10 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-init-green/20 transition-colors">
              <svg className="w-6 h-6 text-init-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-hanse-navy mb-2">Kunden-Portal</h2>
            <p className="text-sm text-gray-500 mb-4">
              Aktuelle Störungen und System-Status einsehen
            </p>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-init-green group-hover:gap-2 transition-all">
              Zum Status-Portal
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </a>

          {/* Admin Card */}
          <a
            href="/login"
            className="card group hover:shadow-card-hover hover:border-hanse-navy/20 transition-all duration-200 cursor-pointer text-center"
          >
            <div className="w-12 h-12 bg-hanse-navy/10 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-hanse-navy/15 transition-colors">
              <svg className="w-6 h-6 text-hanse-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-hanse-navy mb-2">Admin-Bereich</h2>
            <p className="text-sm text-gray-500 mb-4">
              Incidents erstellen, verwalten und bearbeiten
            </p>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-hanse-navy group-hover:gap-2 transition-all">
              Admin-Login
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
