'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface AdminUser {
  id: number;
  username: string;
  display_name: string;
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  admin: null,
  loading: true,
  login: async () => null,
  logout: async () => {},
});

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth/admin');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setAdmin(data.admin);
        }
      }
    } catch {
      // Not authenticated
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<string | null> => {
    try {
      const res = await fetch('/api/auth/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setAdmin(data.admin);
        return null; // no error
      }
      return data.error || 'Anmeldung fehlgeschlagen';
    } catch {
      return 'Verbindungsfehler';
    }
  };

  const logout = async () => {
    await fetch('/api/auth/admin', { method: 'DELETE' });
    setAdmin(null);
  };

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}
