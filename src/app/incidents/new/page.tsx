'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KVP, AFFECTED_SYSTEMS, AFFECTED_PROCESSES, PRODUCTS } from '@/lib/types';
import { useAdminAuth } from '@/lib/admin-auth-context';

export default function NewIncidentPage() {
  const router = useRouter();
  const { admin, loading: authLoading } = useAdminAuth();
  const [kvps, setKvps] = useState<KVP[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [emailEditId, setEmailEditId] = useState<number | null>(null);
  const [emailEditValue, setEmailEditValue] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    affected_systems: [] as string[],
    affected_processes: [] as string[],
    is_warning: false,
    start_time: new Date().toISOString().slice(0, 16),
    kvp_ids: [] as number[],
  });

  useEffect(() => {
    if (!authLoading && !admin) window.location.href = '/';
  }, [admin, authLoading]);

  const loadKvps = () => fetch('/api/kvps').then(r => r.json()).then(setKvps);

  useEffect(() => { if (admin) loadKvps(); }, [admin]);

  if (authLoading || !admin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-2 border-init-green/30 border-t-init-green rounded-full animate-spin" />
      </div>
    );
  }

  const toggleSystem = (system: string) => setForm(p => ({
    ...p,
    affected_systems: p.affected_systems.includes(system)
      ? p.affected_systems.filter(s => s !== system)
      : [...p.affected_systems, system],
  }));

  const toggleProcess = (process: string) => setForm(p => ({
    ...p,
    affected_processes: p.affected_processes.includes(process)
      ? p.affected_processes.filter(s => s !== process)
      : [...p.affected_processes, process],
  }));

  const toggleKvp = (id: number) => setForm(p => ({
    ...p,
    kvp_ids: p.kvp_ids.includes(id) ? p.kvp_ids.filter(k => k !== id) : [...p.kvp_ids, id],
  }));

  const selectAllKvps = () => setForm(p => ({ ...p, kvp_ids: kvps.map(k => k.id) }));
  const clearKvps = () => setForm(p => ({ ...p, kvp_ids: [] }));

  const startEmailEdit = (k: KVP) => {
    setEmailEditId(k.id);
    setEmailEditValue(k.contact_email);
  };

  const saveEmailEdit = async (k: KVP) => {
    if (!emailEditValue.trim()) return;
    setEmailSaving(true);
    try {
      const res = await fetch(`/api/kvps/${k.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: k.name,
          short_name: k.short_name,
          contact_email: emailEditValue.trim(),
          contact_name: k.contact_name,
          region: k.region,
        }),
      });
      if (res.ok) {
        setEmailEditId(null);
        await loadKvps();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Speichern fehlgeschlagen');
      }
    } finally {
      setEmailSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.affected_systems.length || !form.affected_processes.length) {
      alert('Bitte alle Pflichtfelder ausfüllen');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...form, priority: form.is_warning ? 'mittel' : 'hoch' };
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/incidents/${data.id}`);
      } else {
        const err = await res.json();
        alert(`Fehler: ${err.error}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectedKvps = kvps.filter(k => form.kvp_ids.includes(k.id));
  const recipientPreview = Array.from(new Set(
    selectedKvps.flatMap(k => k.contact_email.split(/[,;]/).map(e => e.trim()).filter(Boolean))
  ));

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-8 bg-init-green rounded-full" />
          <h1 className="text-2xl font-bold text-hanse-navy">Neues Incident anlegen</h1>
        </div>
        <p className="text-gray-500 ml-3">Störung erfassen → Betroffene Systeme/Prozesse auswählen → KVPs benachrichtigen</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Titel */}
        <div className="card">
          <h2 className="text-base font-semibold text-hanse-navy mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-init-green/10 text-init-green rounded-lg flex items-center justify-center text-xs font-bold">1</span>
            Störungsinformationen
          </h2>
          <div className="space-y-4">
            <div>
              <label className="label">Titel *</label>
              <input
                type="text"
                className="input-field"
                placeholder="z.B. Payment-System nicht erreichbar"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Beschreibung</label>
              <textarea
                className="input-field min-h-[100px]"
                placeholder="Detaillierte Beschreibung der Störung..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Startzeit *</label>
              <input
                type="datetime-local"
                className="input-field"
                value={form.start_time}
                onChange={e => setForm({ ...form, start_time: e.target.value })}
                required
              />
            </div>
          </div>
        </div>

        {/* Betroffene Systeme */}
        <div className="card">
          <h2 className="text-base font-semibold text-hanse-navy mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-init-green/10 text-init-green rounded-lg flex items-center justify-center text-xs font-bold">2</span>
            Betroffene Systeme *
          </h2>
          <div className="space-y-2">
            {AFFECTED_SYSTEMS.map(system => (
              <label
                key={system}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                  form.affected_systems.includes(system)
                    ? 'border-init-green bg-init-green/5 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.affected_systems.includes(system)}
                  onChange={() => toggleSystem(system)}
                  className="rounded w-5 h-5"
                />
                <span className="text-hanse-navy font-medium">{system}</span>
              </label>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
              form.is_warning
                ? 'border-brand-gold bg-brand-gold-light shadow-sm'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}>
              <input
                type="checkbox"
                checked={form.is_warning}
                onChange={e => setForm({ ...form, is_warning: e.target.checked })}
                className="rounded w-5 h-5"
              />
              <span className="text-amber-700 font-medium">Einschränkung – kein Totalausfall, Funktionalität nur teilweise betroffen</span>
            </label>
          </div>
        </div>

        {/* Betroffene Prozesse */}
        <div className="card">
          <h2 className="text-base font-semibold text-hanse-navy mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-init-green/10 text-init-green rounded-lg flex items-center justify-center text-xs font-bold">3</span>
            Betroffene Prozesse *
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {AFFECTED_PROCESSES.map(process => (
              <label
                key={process}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                  form.affected_processes.includes(process)
                    ? 'border-brand-red bg-brand-red-light shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.affected_processes.includes(process)}
                  onChange={() => toggleProcess(process)}
                  className="rounded w-5 h-5"
                />
                <span className="text-gray-700 text-sm">{process}</span>
              </label>
            ))}
          </div>
        </div>

        {/* KVP Auswahl */}
        <div className="card">
          <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
            <h2 className="text-base font-semibold text-hanse-navy flex items-center gap-2">
              <span className="w-6 h-6 bg-init-green/10 text-init-green rounded-lg flex items-center justify-center text-xs font-bold">4</span>
              Wer ist betroffen? (KVPs)
            </h2>
            <div className="flex items-center gap-2 text-xs">
              <button type="button" onClick={selectAllKvps} className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium">Alle</button>
              <button type="button" onClick={clearKvps} className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium">Keine</button>
              <a href="/admin/kvps" target="_blank" rel="noopener" className="px-2.5 py-1 rounded-lg text-init-green hover:bg-init-green/10 font-medium">Verwalten</a>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4 ml-8">
            KVPs sind nach Produkt gruppiert. E-Mails sind bereits hinterlegt — Bleistift-Symbol zum dauerhaften Ändern.
          </p>

          {kvps.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Noch keine KVPs angelegt. <a href="/admin/kvps" className="text-init-green hover:underline">Jetzt anlegen</a>
            </div>
          ) : (() => {
            const groups: { product: string; items: KVP[] }[] = PRODUCTS.map(p => ({
              product: p,
              items: kvps.filter(k => Array.isArray(k.products) && k.products.includes(p)),
            }));
            const unassigned = kvps.filter(k => !Array.isArray(k.products) || k.products.length === 0);

            const renderRow = (kvp: KVP) => {
              const checked = form.kvp_ids.includes(kvp.id);
              const isEditing = emailEditId === kvp.id;
              return (
                <div
                  key={kvp.id}
                  className={`rounded-xl border transition-colors ${
                    checked ? 'border-hanse-navy bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3 p-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleKvp(kvp.id)}
                      className="rounded w-5 h-5 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-hanse-navy">{kvp.short_name}</span>
                        <span className="text-gray-400 text-xs">{kvp.name}</span>
                      </div>
                      {isEditing ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="text"
                            value={emailEditValue}
                            onChange={e => setEmailEditValue(e.target.value)}
                            className="input-field text-xs py-1"
                            placeholder="email1@..., email2@..."
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => saveEmailEdit(kvp)}
                            disabled={emailSaving}
                            className="text-xs px-2 py-1 rounded-lg bg-init-green text-white hover:bg-init-green-dark"
                          >
                            {emailSaving ? '…' : 'OK'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEmailEditId(null)}
                            className="text-xs px-2 py-1 rounded-lg text-gray-500 hover:bg-gray-100"
                          >
                            Abbrechen
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                          <span className="truncate">{kvp.contact_email}</span>
                          <button
                            type="button"
                            onClick={() => startEmailEdit(kvp)}
                            className="text-gray-400 hover:text-init-green flex-shrink-0"
                            title="E-Mail bearbeiten"
                            aria-label="E-Mail bearbeiten"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            };

            const selectGroup = (items: KVP[]) => setForm(p => ({
              ...p,
              kvp_ids: Array.from(new Set([...p.kvp_ids, ...items.map(i => i.id)])),
            }));

            return (
              <div className="space-y-5">
                {groups.map(g => (
                  <div key={g.product}>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <h3 className="text-sm font-bold tracking-wide text-hanse-navy uppercase">{g.product}</h3>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-gray-400">{g.items.length}</span>
                        {g.items.length > 0 && (
                          <button
                            type="button"
                            onClick={() => selectGroup(g.items)}
                            className="text-init-green hover:underline font-medium"
                          >
                            Alle in {g.product} wählen
                          </button>
                        )}
                      </div>
                    </div>
                    {g.items.length > 0 ? (
                      <div className="space-y-2">{g.items.map(renderRow)}</div>
                    ) : (
                      <div className="text-xs text-gray-400 italic px-3 py-2 border border-dashed border-gray-200 rounded-xl">
                        Keine KVPs zugewiesen.
                      </div>
                    )}
                  </div>
                ))}
                {unassigned.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold tracking-wide text-gray-500 uppercase mb-2 px-1">Ohne Produkt</h3>
                    <div className="space-y-2">{unassigned.map(renderRow)}</div>
                  </div>
                )}
              </div>
            );
          })()}

          {recipientPreview.length > 0 && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <div className="text-xs font-semibold text-hanse-navy mb-1.5">Empfänger-Vorschau ({recipientPreview.length})</div>
              <div className="flex flex-wrap gap-1.5">
                {recipientPreview.map(e => (
                  <span key={e} className="text-xs bg-init-green/10 text-init-green px-2 py-0.5 rounded-lg">{e}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <a href="/" className="btn-secondary">Abbrechen</a>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Wird erstellt...' : 'Incident anlegen & Kunden benachrichtigen'}
          </button>
        </div>
      </form>
    </div>
  );
}
