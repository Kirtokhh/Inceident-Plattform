'use client';

import { useEffect, useMemo, useState } from 'react';
import { KVP, PRODUCTS } from '@/lib/types';
import { useAdminAuth } from '@/lib/admin-auth-context';

type Draft = {
  id?: number;
  name: string;
  short_name: string;
  contact_email: string;
  contact_name: string;
  region: string;
  products: string[];
};

const empty: Draft = { name: '', short_name: '', contact_email: '', contact_name: '', region: '', products: [] };

export default function KvpAdminPage() {
  const { admin, loading: authLoading } = useAdminAuth();
  const [kvps, setKvps] = useState<KVP[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [tokenRevealId, setTokenRevealId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => { if (!authLoading && !admin) window.location.href = '/'; }, [admin, authLoading]);

  const load = () => fetch('/api/kvps').then(r => r.json()).then(data => {
    setKvps(data);
    setLoading(false);
  });
  useEffect(() => { if (admin) load(); }, [admin]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return kvps;
    return kvps.filter(k =>
      k.name.toLowerCase().includes(q) ||
      k.short_name.toLowerCase().includes(q) ||
      k.contact_email.toLowerCase().includes(q) ||
      (k.region || '').toLowerCase().includes(q)
    );
  }, [kvps, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, KVP[]> = {};
    for (const p of PRODUCTS) groups[p] = [];
    const unassigned: KVP[] = [];
    for (const k of filtered) {
      const products = Array.isArray(k.products) ? k.products : [];
      if (products.length === 0) {
        unassigned.push(k);
        continue;
      }
      for (const p of products) {
        if (!groups[p]) groups[p] = [];
        groups[p].push(k);
      }
    }
    return { groups, unassigned };
  }, [filtered]);

  if (authLoading || !admin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-2 border-init-green/30 border-t-init-green rounded-full animate-spin" />
      </div>
    );
  }

  const startNew = () => { setError(null); setEditing({ ...empty }); };
  const startEdit = (k: KVP) => {
    setError(null);
    setEditing({
      id: k.id,
      name: k.name,
      short_name: k.short_name,
      contact_email: k.contact_email,
      contact_name: k.contact_name || '',
      region: k.region || '',
      products: Array.isArray(k.products) ? [...k.products] : [],
    });
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.name || !editing.short_name || !editing.contact_email) {
      setError('Name, Kürzel und E-Mail sind Pflichtfelder.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const url = editing.id ? `/api/kvps/${editing.id}` : '/api/kvps';
      const method = editing.id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Speichern fehlgeschlagen');
        return;
      }
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (k: KVP) => {
    if (!confirm(`KVP "${k.name}" wirklich löschen?`)) return;
    const res = await fetch(`/api/kvps/${k.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Löschen fehlgeschlagen');
      return;
    }
    load();
  };

  const regenerateToken = async (k: KVP) => {
    const verb = k.access_token ? 'neu generieren' : 'erstellen';
    if (!confirm(`Zugangstoken für "${k.short_name}" ${verb}?${k.access_token ? ' Der bisherige Token wird ungültig.' : ''}`)) return;
    const res = await fetch(`/api/kvps/${k.id}/token`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Fehler beim Generieren');
      return;
    }
    load();
  };

  const copyToken = async (k: KVP) => {
    if (!k.access_token) return;
    try {
      await navigator.clipboard.writeText(k.access_token);
      setCopiedId(k.id);
      setTimeout(() => setCopiedId(c => (c === k.id ? null : c)), 1500);
    } catch {
      // ignore
    }
  };

  // Quick-Toggle Produkt direkt aus der Liste
  const toggleProduct = async (k: KVP, product: string) => {
    const current = Array.isArray(k.products) ? k.products : [];
    const next = current.includes(product) ? current.filter(p => p !== product) : [...current, product];
    const res = await fetch(`/api/kvps/${k.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: k.name,
        short_name: k.short_name,
        contact_email: k.contact_email,
        contact_name: k.contact_name,
        region: k.region,
        products: next,
      }),
    });
    if (res.ok) load();
  };

  const renderRow = (k: KVP) => {
    const products = Array.isArray(k.products) ? k.products : [];
    const tokenOpen = tokenRevealId === k.id;
    return (
      <div key={k.id} className="bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
        <div className="px-4 py-2.5 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-hanse-navy">{k.short_name}</span>
              <span className="text-gray-400 text-sm truncate">{k.name}</span>
              {k.region && <span className="text-xs text-gray-400">· {k.region}</span>}
            </div>
            <div className="text-xs text-gray-500 mt-0.5 truncate">
              {k.contact_email}
              {k.contact_name && <span className="text-gray-400"> · {k.contact_name}</span>}
            </div>
          </div>
          <div className="hidden md:flex items-center gap-1 flex-shrink-0">
            {PRODUCTS.map(p => {
              const active = products.includes(p);
              return (
                <button
                  key={p}
                  onClick={() => toggleProduct(k, p)}
                  className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                    active
                      ? 'border-init-green bg-init-green/10 text-init-green font-medium'
                      : 'border-gray-200 text-gray-300 hover:text-gray-500'
                  }`}
                  title={`Produkt ${p} ${active ? 'entfernen' : 'zuweisen'}`}
                >
                  {p}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setTokenRevealId(tokenOpen ? null : k.id)}
              className={`text-sm px-2 py-1 transition-colors ${
                tokenOpen ? 'text-init-green' : 'text-gray-500 hover:text-hanse-navy'
              }`}
              title="Kunden-Zugangstoken"
            >
              Token
            </button>
            <button onClick={() => startEdit(k)} className="text-sm text-gray-500 hover:text-hanse-navy px-2 py-1">Bearbeiten</button>
            <button
              onClick={() => remove(k)}
              className="text-sm text-gray-400 hover:text-red-600 px-2 py-1 transition-colors"
              title="Löschen"
            >
              ✕
            </button>
          </div>
        </div>
        {tokenOpen && (
          <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-500 font-medium flex-shrink-0">Kunden-Zugangstoken:</span>
            {k.access_token ? (
              <>
                <code className="text-xs bg-white border border-gray-200 px-2 py-1 rounded font-mono text-gray-700 flex-1 min-w-0 truncate">
                  {k.access_token}
                </code>
                <button
                  onClick={() => copyToken(k)}
                  className="text-xs text-init-green hover:text-init-green-dark font-medium px-2 py-1 flex-shrink-0"
                >
                  {copiedId === k.id ? 'Kopiert' : 'Kopieren'}
                </button>
              </>
            ) : (
              <span className="text-xs text-gray-400 italic flex-1">Kein Token gesetzt</span>
            )}
            <button
              onClick={() => regenerateToken(k)}
              className="text-xs text-gray-500 hover:text-hanse-navy font-medium px-2 py-1 flex-shrink-0"
            >
              {k.access_token ? 'Neu generieren' : 'Erstellen'}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-hanse-navy">KVP-Verwaltung</h1>
          <p className="text-sm text-gray-500">Produkt-Tags klickbar zum Zuordnen.</p>
        </div>
        <button onClick={startNew} className="btn-primary text-sm">Neuer KVP</button>
      </div>

      <input
        type="text"
        className="input-field mb-4"
        placeholder="Suche…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {loading ? (
        <div className="text-center py-16 text-gray-400">Lade…</div>
      ) : kvps.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Noch keine KVPs angelegt.</div>
      ) : (
        <div className="space-y-5">
          {PRODUCTS.map(p => grouped.groups[p]?.length > 0 && (
            <section key={p}>
              <div className="flex items-baseline gap-2 mb-2 px-1">
                <h2 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{p}</h2>
                <span className="text-xs text-gray-400">· {grouped.groups[p].length}</span>
              </div>
              <div className="space-y-1.5">{grouped.groups[p].map(renderRow)}</div>
            </section>
          ))}

          {grouped.unassigned.length > 0 && (
            <section>
              <div className="flex items-baseline gap-2 mb-2 px-1">
                <h2 className="text-xs font-semibold tracking-wide text-gray-400 uppercase">Ohne Produkt</h2>
                <span className="text-xs text-gray-400">· {grouped.unassigned.length}</span>
              </div>
              <div className="space-y-1.5">{grouped.unassigned.map(renderRow)}</div>
            </section>
          )}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => !saving && setEditing(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-hanse-navy mb-4">
              {editing.id ? 'KVP bearbeiten' : 'Neuen KVP anlegen'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="label">Name *</label>
                <input className="input-field" value={editing.name}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                  placeholder="z.B. Hamburger Verkehrsverbund" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Kürzel *</label>
                  <input className="input-field" value={editing.short_name}
                    onChange={e => setEditing({ ...editing, short_name: e.target.value })}
                    placeholder="z.B. HVV" />
                </div>
                <div>
                  <label className="label">Region</label>
                  <input className="input-field" value={editing.region}
                    onChange={e => setEditing({ ...editing, region: e.target.value })}
                    placeholder="z.B. Hamburg" />
                </div>
              </div>
              <div>
                <label className="label">E-Mail(s) *</label>
                <input className="input-field" value={editing.contact_email}
                  onChange={e => setEditing({ ...editing, contact_email: e.target.value })}
                  placeholder="support@kvp.de, ops@kvp.de" />
                <p className="text-xs text-gray-400 mt-1">Mehrere E-Mails mit Komma trennen.</p>
              </div>
              <div>
                <label className="label">Ansprechpartner</label>
                <input className="input-field" value={editing.contact_name}
                  onChange={e => setEditing({ ...editing, contact_name: e.target.value })}
                  placeholder="z.B. Max Mustermann" />
              </div>
              <div>
                <label className="label">Produkte</label>
                <div className="flex flex-wrap gap-2">
                  {PRODUCTS.map(p => {
                    const active = editing.products.includes(p);
                    return (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setEditing({
                          ...editing,
                          products: active ? editing.products.filter(x => x !== p) : [...editing.products, p],
                        })}
                        className={`text-sm px-3 py-1.5 rounded-xl border transition-colors ${
                          active
                            ? 'border-init-green bg-init-green/10 text-init-green font-medium'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Ordne den KVP allen Produkten zu, die er nutzt. Ein KVP kann mehrere Produkte haben.
                </p>
              </div>
              {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{error}</div>}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button className="btn-secondary" onClick={() => setEditing(null)} disabled={saving}>Abbrechen</button>
              <button className="btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Speichert…' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
