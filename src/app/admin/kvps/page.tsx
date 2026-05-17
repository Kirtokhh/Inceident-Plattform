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
    return (
      <div key={k.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4 hover:border-gray-300 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-hanse-navy">{k.short_name}</span>
            <span className="text-gray-400 text-sm">{k.name}</span>
            {k.region && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{k.region}</span>}
          </div>
          <div className="text-sm text-gray-500 mt-1 truncate">
            {k.contact_email}
            {k.contact_name && <span className="text-gray-400"> · {k.contact_name}</span>}
          </div>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {PRODUCTS.map(p => {
              const active = products.includes(p);
              return (
                <button
                  key={p}
                  onClick={() => toggleProduct(k, p)}
                  className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                    active
                      ? 'border-init-green bg-init-green/10 text-init-green font-medium'
                      : 'border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300'
                  }`}
                  title={`Produkt ${p} ${active ? 'entfernen' : 'zuweisen'}`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => startEdit(k)} className="btn-secondary text-sm">Bearbeiten</button>
          <button
            onClick={() => remove(k)}
            className="text-sm px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
          >
            Löschen
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-8 bg-init-green rounded-full" />
            <h1 className="text-2xl font-bold text-hanse-navy">KVP-Verwaltung</h1>
          </div>
          <p className="text-gray-500 ml-3">
            Verkehrsunternehmen gruppiert nach Produkt. Produkt-Tags direkt am KVP klickbar zum schnellen Zuordnen.
          </p>
        </div>
        <button onClick={startNew} className="btn-primary">Neuer KVP</button>
      </div>

      <div className="card mb-4">
        <input
          type="text"
          className="input-field"
          placeholder="Suche nach Name, Kürzel, E-Mail oder Region…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Lade…</div>
      ) : kvps.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Noch keine KVPs angelegt.</div>
      ) : (
        <div className="space-y-6">
          {PRODUCTS.map(p => (
            <section key={p}>
              <div className="flex items-baseline gap-2 mb-2 px-1">
                <h2 className="text-sm font-bold tracking-wide text-hanse-navy uppercase">{p}</h2>
                <span className="text-xs text-gray-400">{grouped.groups[p]?.length || 0} KVP{grouped.groups[p]?.length === 1 ? '' : 's'}</span>
              </div>
              {grouped.groups[p]?.length > 0 ? (
                <div className="space-y-2">{grouped.groups[p].map(renderRow)}</div>
              ) : (
                <div className="text-sm text-gray-400 italic px-1 py-2 border border-dashed border-gray-200 rounded-xl text-center">
                  Keine KVPs für {p} zugewiesen.
                </div>
              )}
            </section>
          ))}

          {grouped.unassigned.length > 0 && (
            <section>
              <div className="flex items-baseline gap-2 mb-2 px-1">
                <h2 className="text-sm font-bold tracking-wide text-gray-500 uppercase">Ohne Produkt</h2>
                <span className="text-xs text-gray-400">{grouped.unassigned.length}</span>
              </div>
              <div className="space-y-2">{grouped.unassigned.map(renderRow)}</div>
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
