'use client';

import { useEffect, useState } from 'react';
import { useAdminAuth } from '@/lib/admin-auth-context';

interface AdminUser {
  id: number;
  username: string;
  display_name: string;
  created_at: string;
}

export default function AdminUsersPage() {
  const { admin, loading: authLoading } = useAdminAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', display_name: '', password: '' });
  const [createError, setCreateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit (password / display_name) modal
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [editDraft, setEditDraft] = useState({ display_name: '', password: '' });
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => { if (!authLoading && !admin) window.location.href = '/'; }, [admin, authLoading]);

  const load = () => fetch('/api/admins').then(r => r.json()).then(data => {
    setUsers(data);
    setLoading(false);
  });
  useEffect(() => { if (admin) load(); }, [admin]);

  if (authLoading || !admin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-2 border-init-green/30 border-t-init-green rounded-full animate-spin" />
      </div>
    );
  }

  const create = async () => {
    setCreateError(null);
    if (!newUser.username || !newUser.display_name || !newUser.password) {
      setCreateError('Alle Felder sind Pflicht.');
      return;
    }
    if (newUser.password.length < 8) {
      setCreateError('Passwort muss mindestens 8 Zeichen lang sein.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setCreateError(err.error || 'Anlegen fehlgeschlagen');
        return;
      }
      setNewUser({ username: '', display_name: '', password: '' });
      setCreating(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (u: AdminUser) => {
    setEditError(null);
    setEditing(u);
    setEditDraft({ display_name: u.display_name, password: '' });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setEditError(null);
    const body: Record<string, string> = {};
    if (editDraft.display_name && editDraft.display_name !== editing.display_name) {
      body.display_name = editDraft.display_name;
    }
    if (editDraft.password) {
      if (editDraft.password.length < 8) {
        setEditError('Passwort muss mindestens 8 Zeichen lang sein.');
        return;
      }
      body.password = editDraft.password;
    }
    if (Object.keys(body).length === 0) {
      setEditing(null);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admins/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setEditError(err.error || 'Speichern fehlgeschlagen');
        return;
      }
      // Wenn das eigene Passwort geändert wurde → Logout (Session wurde serverseitig invalidiert)
      if (editing.id === admin.id && editDraft.password) {
        window.location.href = '/login';
        return;
      }
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (u: AdminUser) => {
    if (u.id === admin.id) {
      alert('Der eigene Account kann nicht gelöscht werden.');
      return;
    }
    if (!confirm(`Admin "${u.username}" wirklich löschen?`)) return;
    const res = await fetch(`/api/admins/${u.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Löschen fehlgeschlagen');
      return;
    }
    load();
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-hanse-navy">Administratoren</h1>
          <p className="text-sm text-gray-500">Zugänge fürs Operations-Team verwalten.</p>
        </div>
        <button onClick={() => { setCreating(true); setCreateError(null); }} className="btn-primary text-sm">
          Neuer Admin
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Lade…</div>
      ) : (
        <div className="space-y-1.5">
          {users.map(u => (
            <div key={u.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-4 hover:border-gray-300 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-hanse-navy">{u.display_name}</span>
                  <span className="text-xs text-gray-400 font-mono">@{u.username}</span>
                  {u.id === admin.id && (
                    <span className="text-xs text-init-green bg-init-green/10 px-2 py-0.5 rounded">Du</span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  Angelegt am {new Date(u.created_at).toLocaleDateString('de-DE')}
                </div>
              </div>
              <button onClick={() => startEdit(u)} className="text-sm text-gray-500 hover:text-hanse-navy px-2 py-1">Bearbeiten</button>
              <button
                onClick={() => remove(u)}
                disabled={u.id === admin.id}
                className="text-sm text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed px-2 py-1"
                title={u.id === admin.id ? 'Eigener Account kann nicht gelöscht werden' : 'Löschen'}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {creating && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => !saving && setCreating(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-hanse-navy mb-4">Neuen Admin anlegen</h2>
            <div className="space-y-3">
              <div>
                <label className="label">Anzeigename *</label>
                <input className="input-field" value={newUser.display_name}
                  onChange={e => setNewUser({ ...newUser, display_name: e.target.value })}
                  placeholder="z.B. Max Mustermann" />
              </div>
              <div>
                <label className="label">Benutzername *</label>
                <input className="input-field" value={newUser.username}
                  onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="z.B. mmustermann" autoComplete="off" />
              </div>
              <div>
                <label className="label">Passwort *</label>
                <input type="password" className="input-field" value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Mindestens 8 Zeichen" autoComplete="new-password" />
              </div>
              {createError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{createError}</div>}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button className="btn-secondary" onClick={() => setCreating(false)} disabled={saving}>Abbrechen</button>
              <button className="btn-primary" onClick={create} disabled={saving}>
                {saving ? 'Speichert…' : 'Anlegen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => !saving && setEditing(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-hanse-navy mb-1">{editing.display_name} bearbeiten</h2>
            <p className="text-xs text-gray-400 mb-4">@{editing.username}</p>
            <div className="space-y-3">
              <div>
                <label className="label">Anzeigename</label>
                <input className="input-field" value={editDraft.display_name}
                  onChange={e => setEditDraft({ ...editDraft, display_name: e.target.value })} />
              </div>
              <div>
                <label className="label">Neues Passwort</label>
                <input type="password" className="input-field" value={editDraft.password}
                  onChange={e => setEditDraft({ ...editDraft, password: e.target.value })}
                  placeholder="Leer lassen zum Beibehalten" autoComplete="new-password" />
                {editing.id === admin.id && (
                  <p className="text-xs text-amber-600 mt-1">Bei Passwortänderung wirst du abgemeldet.</p>
                )}
              </div>
              {editError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{editError}</div>}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button className="btn-secondary" onClick={() => setEditing(null)} disabled={saving}>Abbrechen</button>
              <button className="btn-primary" onClick={saveEdit} disabled={saving}>
                {saving ? 'Speichert…' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
