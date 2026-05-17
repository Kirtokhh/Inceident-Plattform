'use client';

import { useState } from 'react';
import { useAdminAuth } from '@/lib/admin-auth-context';

export default function AdminLoginPage() {
  const { login, admin, loading } = useAdminAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If already authenticated, redirect
  if (!loading && admin) {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const err = await login(username, password);
    if (err) {
      setError(err);
      setSubmitting(false);
    } else {
      window.location.href = '/dashboard';
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-2 border-init-green/30 border-t-init-green rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-hanse-navy/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-hanse-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-hanse-navy">Admin-Login</h1>
          <p className="text-gray-500 mt-1 text-sm">IncidentHub Verwaltung</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Benutzername</label>
              <input
                type="text"
                className="input-field"
                placeholder="Benutzername"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
              />
            </div>
            <div>
              <label className="label">Passwort</label>
              <input
                type="password"
                className="input-field"
                placeholder="Passwort"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <div className="text-brand-red text-sm bg-red-50 border border-red-200 rounded-xl p-3">
                {error}
              </div>
            )}
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? 'Anmelden...' : 'Anmelden'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
