'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KVP, Priority, AFFECTED_SYSTEMS, AFFECTED_PROCESSES } from '@/lib/types';
import { useAdminAuth } from '@/lib/admin-auth-context';

const PRIORITIES: Priority[] = ['kritisch', 'hoch', 'mittel', 'niedrig'];

export default function NewIncidentPage() {
  const router = useRouter();
  const { admin, loading: authLoading } = useAdminAuth();
  const [kvps, setKvps] = useState<KVP[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    affected_systems: [] as string[],
    affected_processes: [] as string[],
    is_warning: false,
    priority: '' as Priority | '',
    start_time: new Date().toISOString().slice(0, 16),
    kvp_ids: [] as number[],
  });

  useEffect(() => {
    if (!authLoading && !admin) {
      window.location.href = '/';
    }
  }, [admin, authLoading]);

  useEffect(() => {
    if (admin) {
      fetch('/api/kvps').then(r => r.json()).then(setKvps);
    }
  }, [admin]);

  if (authLoading || !admin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-2 border-init-green/30 border-t-init-green rounded-full animate-spin" />
      </div>
    );
  }

  const toggleSystem = (system: string) => {
    setForm(prev => ({
      ...prev,
      affected_systems: prev.affected_systems.includes(system)
        ? prev.affected_systems.filter(s => s !== system)
        : [...prev.affected_systems, system],
    }));
  };

  const toggleProcess = (process: string) => {
    setForm(prev => ({
      ...prev,
      affected_processes: prev.affected_processes.includes(process)
        ? prev.affected_processes.filter(p => p !== process)
        : [...prev.affected_processes, process],
    }));
  };

  const toggleKvp = (id: number) => {
    setForm(prev => ({
      ...prev,
      kvp_ids: prev.kvp_ids.includes(id)
        ? prev.kvp_ids.filter(k => k !== id)
        : [...prev.kvp_ids, id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.affected_systems.length || !form.affected_processes.length || !form.priority) {
      alert('Bitte alle Pflichtfelder ausfüllen');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Priorität *</label>
                <select
                  className="select-field"
                  value={form.priority}
                  onChange={e => setForm({ ...form, priority: e.target.value as Priority })}
                  required
                >
                  <option value="">Priorität wählen...</option>
                  {PRIORITIES.map(p => (
                    <option key={p} value={p}>
                      {p === 'kritisch' ? '🔴' : p === 'hoch' ? '🟠' : p === 'mittel' ? '🟡' : '🟢'} {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
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

          {/* Warning Checkbox */}
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
              <span className="text-amber-700 font-medium">⚠️ Warning – Eingeschränkte Funktionalität (kein Totalausfall)</span>
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
          <h2 className="text-base font-semibold text-hanse-navy mb-2 flex items-center gap-2">
            <span className="w-6 h-6 bg-init-green/10 text-init-green rounded-lg flex items-center justify-center text-xs font-bold">4</span>
            Betroffene KVP / Verkehrsunternehmen
          </h2>
          <p className="text-sm text-gray-500 mb-4 ml-8">
            Wählen Sie die betroffenen KVPs aus. Diese werden per E-Mail benachrichtigt und sehen das Incident auf ihrer Statusseite.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {kvps.map(kvp => (
              <label
                key={kvp.id}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                  form.kvp_ids.includes(kvp.id)
                    ? 'border-hanse-navy bg-blue-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.kvp_ids.includes(kvp.id)}
                  onChange={() => toggleKvp(kvp.id)}
                  className="rounded"
                />
                <div>
                  <div className="font-medium text-hanse-navy">{kvp.short_name}</div>
                  <div className="text-xs text-gray-500">{kvp.name}</div>
                </div>
              </label>
            ))}
          </div>
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
