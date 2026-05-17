'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KVP, Product, ProblemType, Priority } from '@/lib/types';

const PRODUCTS: Product[] = ['Deutschlandticket', 'EinzelTicket', 'Zeitkarte', 'Abo', 'Sonstiges'];
const PROBLEM_TYPES: ProblemType[] = ['Payment', 'Ticketanzeige', 'Login', 'Tarif', 'Backend', 'Reporting'];
const PRIORITIES: Priority[] = ['kritisch', 'hoch', 'mittel', 'niedrig'];
const APPS = ['MobilApp', 'WebPortal', 'Backend-API', 'Admin-Dashboard', 'Reporting-System', 'Payment-Gateway'];

export default function NewIncidentPage() {
  const router = useRouter();
  const [kvps, setKvps] = useState<KVP[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    affected_app: '',
    product: '' as Product | '',
    problem_type: '' as ProblemType | '',
    priority: '' as Priority | '',
    start_time: new Date().toISOString().slice(0, 16),
    kvp_ids: [] as number[],
  });

  useEffect(() => {
    fetch('/api/kvps').then(r => r.json()).then(setKvps);
  }, []);

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
    if (!form.title || !form.affected_app || !form.product || !form.problem_type || !form.priority) {
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
        <h1 className="text-3xl font-bold text-white mb-2">Neues Incident anlegen</h1>
        <p className="text-slate-400">Störung erfassen → Impact bewerten → Kunden auswählen → E-Mail automatisch generieren</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Titel */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Störungsinformationen</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Titel *</label>
              <input
                type="text"
                className="input-field"
                placeholder="z.B. Deutschlandticket - Zahlung fehlgeschlagen"
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
          </div>
        </div>

        {/* Betroffene App & Produkt */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Betroffene Systeme</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Betroffene App *</label>
              <select
                className="select-field"
                value={form.affected_app}
                onChange={e => setForm({ ...form, affected_app: e.target.value })}
                required
              >
                <option value="">App auswählen...</option>
                {APPS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Produkt *</label>
              <select
                className="select-field"
                value={form.product}
                onChange={e => setForm({ ...form, product: e.target.value as Product })}
                required
              >
                <option value="">Produkt auswählen...</option>
                {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Problemtyp & Priorität */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Klassifizierung</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Problemtyp *</label>
              <select
                className="select-field"
                value={form.problem_type}
                onChange={e => setForm({ ...form, problem_type: e.target.value as ProblemType })}
                required
              >
                <option value="">Typ auswählen...</option>
                {PROBLEM_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
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

        {/* KVP Auswahl */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Betroffene KVP / Verkehrsunternehmen</h2>
          <p className="text-sm text-slate-400 mb-4">
            Wählen Sie die betroffenen Verkehrsunternehmen aus. Diese werden automatisch per E-Mail benachrichtigt.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {kvps.map(kvp => (
              <label
                key={kvp.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  form.kvp_ids.includes(kvp.id)
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-700 hover:border-slate-500'
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.kvp_ids.includes(kvp.id)}
                  onChange={() => toggleKvp(kvp.id)}
                  className="rounded border-slate-600"
                />
                <div>
                  <div className="font-medium text-white">{kvp.short_name}</div>
                  <div className="text-xs text-slate-400">{kvp.name}</div>
                  {kvp.region && <div className="text-xs text-slate-500">{kvp.region}</div>}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <a href="/" className="btn-secondary">Abbrechen</a>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Wird erstellt...' : 'Incident anlegen & Erstmeldung senden'}
          </button>
        </div>
      </form>
    </div>
  );
}
