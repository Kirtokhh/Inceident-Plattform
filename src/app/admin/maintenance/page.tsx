'use client';

import { useEffect, useState } from 'react';
import { KVP, MaintenanceWithKVPs, AFFECTED_SYSTEMS, AFFECTED_PROCESSES, MAINTENANCE_MIN_LEAD_DAYS, PRODUCTS } from '@/lib/types';
import { useAdminAuth } from '@/lib/admin-auth-context';

type Draft = {
  title: string;
  description: string;
  affected_systems: string[];
  affected_processes: string[];
  expected_impact: string;
  start_time: string;
  end_time: string;
  kvp_ids: number[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function earliestStart(): Date {
  return new Date(Date.now() + MAINTENANCE_MIN_LEAD_DAYS * 24 * 60 * 60 * 1000);
}

function defaultDraft(): Draft {
  const start = earliestStart();
  // round to next full hour
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // +2h
  return {
    title: '',
    description: '',
    affected_systems: [],
    affected_processes: [],
    expected_impact: '',
    start_time: toLocal(start),
    end_time: toLocal(end),
    kvp_ids: [],
  };
}

function toLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function statusBadge(s: string) {
  const cls: Record<string, string> = {
    'geplant': 'bg-blue-50 text-blue-700 border-blue-200',
    'läuft': 'bg-amber-50 text-amber-700 border-amber-200',
    'abgeschlossen': 'bg-green-50 text-green-700 border-green-200',
    'abgesagt': 'bg-gray-100 text-gray-500 border-gray-200',
  };
  return <span className={`text-xs font-semibold border px-2 py-0.5 rounded-lg ${cls[s] || ''}`}>{s.toUpperCase()}</span>;
}

export default function MaintenancePage() {
  const { admin, loading: authLoading } = useAdminAuth();
  const [list, setList] = useState<MaintenanceWithKVPs[]>([]);
  const [kvps, setKvps] = useState<KVP[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(defaultDraft());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Email modal state
  const [emailFor, setEmailFor] = useState<MaintenanceWithKVPs | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailAllKvps, setEmailAllKvps] = useState<KVP[]>([]);
  const [emailSelectedKvpIds, setEmailSelectedKvpIds] = useState<number[]>([]);
  const [emailExtra, setEmailExtra] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  useEffect(() => { if (!authLoading && !admin) window.location.href = '/'; }, [admin, authLoading]);

  const load = () => {
    Promise.all([
      fetch('/api/maintenances').then(r => r.json()),
      fetch('/api/kvps').then(r => r.json()),
    ]).then(([m, k]) => {
      setList(m);
      setKvps(k);
      setLoading(false);
    });
  };
  useEffect(() => { if (admin) load(); }, [admin]);

  if (authLoading || !admin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-2 border-init-green/30 border-t-init-green rounded-full animate-spin" />
      </div>
    );
  }

  const earliest = earliestStart();
  const earliestStr = formatDate(earliest.toISOString());

  const toggle = (key: 'affected_systems' | 'affected_processes', value: string) => {
    setDraft(d => ({
      ...d,
      [key]: d[key].includes(value) ? d[key].filter(v => v !== value) : [...d[key], value],
    }));
  };

  const toggleKvp = (id: number) => {
    setDraft(d => ({
      ...d,
      kvp_ids: d.kvp_ids.includes(id) ? d.kvp_ids.filter(k => k !== id) : [...d.kvp_ids, id],
    }));
  };

  const save = async () => {
    setError(null);
    if (!draft.title || draft.affected_systems.length === 0 || !draft.start_time || !draft.end_time) {
      setError('Titel, mindestens ein System, Start- und Endzeit sind Pflicht.');
      return;
    }
    const start = new Date(draft.start_time);
    const end = new Date(draft.end_time);
    if (end <= start) {
      setError('Endzeit muss nach der Startzeit liegen.');
      return;
    }
    if (start < earliest) {
      setError(`Wartungen müssen mind. ${MAINTENANCE_MIN_LEAD_DAYS} Tage im Voraus geplant werden. Frühestens: ${earliestStr}.`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/maintenances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          start_time: new Date(draft.start_time).toISOString(),
          end_time: new Date(draft.end_time).toISOString(),
          created_by: admin.display_name,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Speichern fehlgeschlagen');
        return;
      }
      setCreating(false);
      setDraft(defaultDraft());
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m: MaintenanceWithKVPs) => {
    if (!confirm(`Wartung "${m.title}" wirklich löschen?`)) return;
    const res = await fetch(`/api/maintenances/${m.id}`, { method: 'DELETE' });
    if (res.ok) load();
  };

  const openEmail = async (m: MaintenanceWithKVPs) => {
    setEmailStatus(null);
    setEmailFor(m);
    setEmailSubject('Lade…');
    setEmailBody('Lade…');
    setEmailAllKvps([]);
    setEmailSelectedKvpIds([]);
    setEmailExtra('');
    const res = await fetch(`/api/maintenances/${m.id}/email`);
    if (res.ok) {
      const data = await res.json();
      setEmailSubject(data.subject);
      setEmailBody(data.body);
      setEmailAllKvps(data.all_kvps || []);
      setEmailSelectedKvpIds(data.linked_kvp_ids || []);
    } else {
      setEmailSubject('');
      setEmailBody('');
      setEmailStatus('Fehler beim Laden der Vorlage');
    }
  };

  const computedRecipients = (): string[] => {
    const fromKvps = emailAllKvps
      .filter(k => emailSelectedKvpIds.includes(k.id))
      .flatMap(k => (k.contact_email || '').split(/[,;]/).map(e => e.trim()).filter(Boolean));
    const extra = emailExtra.split(/[,;\n]/).map(e => e.trim()).filter(Boolean);
    return Array.from(new Set([...fromKvps, ...extra]));
  };

  const sendEmail = async () => {
    if (!emailFor) return;
    const recipients = computedRecipients();
    if (recipients.length === 0) {
      setEmailStatus('Mindestens ein Empfänger nötig.');
      return;
    }
    setEmailSending(true);
    setEmailStatus(null);
    try {
      const res = await fetch(`/api/maintenances/${emailFor.id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: emailSubject, body: emailBody, recipients }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailStatus('E-Mail erfolgreich versendet.');
      } else {
        setEmailStatus(`Fehler: ${data.error || 'Unbekannt'}`);
      }
    } finally {
      setEmailSending(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(`Betreff: ${emailSubject}\n\n${emailBody}`);
    setEmailStatus('In Zwischenablage kopiert.');
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-8 bg-init-green rounded-full" />
            <h1 className="text-2xl font-bold text-hanse-navy">Geplante Wartungen</h1>
          </div>
          <p className="text-gray-500 ml-3">
            Entwicklung legt Wartungsfenster an (mind. {MAINTENANCE_MIN_LEAD_DAYS} Tage im Voraus).
            Admin wählt eine Wartung und versendet die Kunden-Ankündigung.
          </p>
        </div>
        <button onClick={() => { setDraft(defaultDraft()); setCreating(true); setError(null); }} className="btn-primary">
          + Neue Wartung
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Lade…</div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          Noch keine Wartungen geplant.
        </div>
      ) : (
        <div className="space-y-2">
          {list.map(m => (
            <div key={m.id} className="card flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{m.id}</span>
                  {statusBadge(m.status)}
                </div>
                <h3 className="font-semibold text-hanse-navy">{m.title}</h3>
                <div className="text-sm text-gray-500 mt-1">
                  Zeitraum: {formatDate(m.start_time)} – {formatDate(m.end_time)}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(Array.isArray(m.affected_systems) ? m.affected_systems : []).map(s => (
                    <span key={s} className="text-xs bg-init-green/10 text-init-green px-2 py-0.5 rounded-lg">{s}</span>
                  ))}
                  {m.kvps.map(k => (
                    <span key={k.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg">{k.short_name}</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button onClick={() => openEmail(m)} className="btn-primary text-sm">E-Mail-Vorlage</button>
                <button onClick={() => remove(m)} className="text-xs px-3 py-1.5 rounded-xl text-red-600 hover:bg-red-50">Löschen</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {creating && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => !saving && setCreating(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 my-8" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-hanse-navy mb-1">Neue Wartung anlegen</h2>
            <p className="text-xs text-gray-500 mb-4">Frühestmöglicher Start: <b>{earliestStr}</b> (mind. {MAINTENANCE_MIN_LEAD_DAYS} Tage im Voraus)</p>

            <div className="space-y-3">
              <div>
                <label className="label">Titel *</label>
                <input className="input-field" value={draft.title}
                  onChange={e => setDraft({ ...draft, title: e.target.value })}
                  placeholder="z.B. Datenbank-Upgrade Payment-System" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Beginn *</label>
                  <input type="datetime-local" className="input-field" value={draft.start_time}
                    min={toLocal(earliest)}
                    onChange={e => setDraft({ ...draft, start_time: e.target.value })} />
                </div>
                <div>
                  <label className="label">Ende *</label>
                  <input type="datetime-local" className="input-field" value={draft.end_time}
                    min={draft.start_time}
                    onChange={e => setDraft({ ...draft, end_time: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="label">Betroffene Systeme *</label>
                <div className="flex flex-wrap gap-2">
                  {AFFECTED_SYSTEMS.map(s => (
                    <button type="button" key={s} onClick={() => toggle('affected_systems', s)}
                      className={`text-sm px-3 py-1.5 rounded-xl border transition-all ${
                        draft.affected_systems.includes(s)
                          ? 'border-init-green bg-init-green/10 text-init-green font-medium'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}>{s}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Betroffene Prozesse</label>
                <div className="flex flex-wrap gap-2">
                  {AFFECTED_PROCESSES.map(p => (
                    <button type="button" key={p} onClick={() => toggle('affected_processes', p)}
                      className={`text-xs px-2.5 py-1 rounded-xl border transition-all ${
                        draft.affected_processes.includes(p)
                          ? 'border-brand-red bg-brand-red-light text-red-700 font-medium'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}>{p}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Erwartete Auswirkung</label>
                <input className="input-field" value={draft.expected_impact}
                  onChange={e => setDraft({ ...draft, expected_impact: e.target.value })}
                  placeholder="z.B. Ticketkauf während des Fensters nicht möglich" />
              </div>

              <div>
                <label className="label">Beschreibung</label>
                <textarea className="input-field min-h-[80px]" value={draft.description}
                  onChange={e => setDraft({ ...draft, description: e.target.value })} />
              </div>

              <div>
                <label className="label">Betroffene KVPs</label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {kvps.map(k => (
                    <button type="button" key={k.id} onClick={() => toggleKvp(k.id)}
                      className={`text-xs px-2.5 py-1 rounded-xl border ${
                        draft.kvp_ids.includes(k.id)
                          ? 'border-hanse-navy bg-blue-50 text-blue-700 font-medium'
                          : 'border-gray-200 text-gray-600'
                      }`}>{k.short_name}</button>
                  ))}
                </div>
              </div>

              {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{error}</div>}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button className="btn-secondary" onClick={() => setCreating(false)} disabled={saving}>Abbrechen</button>
              <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Speichert…' : 'Wartung anlegen'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Email modal */}
      {emailFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => !emailSending && setEmailFor(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full p-6 my-8" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-hanse-navy mb-1">Wartungs-E-Mail</h2>
            <p className="text-xs text-gray-500 mb-4">
              Vorlage für <b>{emailFor.id} – {emailFor.title}</b> · alle Empfänger werden per BCC angeschrieben.
            </p>

            <div className="space-y-4">
              {/* KVP-Auswahl gruppiert nach Produkt */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Empfänger-KVPs</label>
                  <div className="flex gap-2 text-xs">
                    <button type="button" onClick={() => setEmailSelectedKvpIds(emailAllKvps.map(k => k.id))}
                      className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium">Alle</button>
                    <button type="button" onClick={() => setEmailSelectedKvpIds([])}
                      className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium">Keine</button>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-xl p-3 max-h-64 overflow-y-auto space-y-4">
                  {(() => {
                    const renderKvpButton = (k: KVP) => {
                      const active = emailSelectedKvpIds.includes(k.id);
                      return (
                        <button
                          type="button"
                          key={k.id}
                          onClick={() => setEmailSelectedKvpIds(prev =>
                            prev.includes(k.id) ? prev.filter(id => id !== k.id) : [...prev, k.id]
                          )}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                            active
                              ? 'border-init-green bg-init-green/10 text-init-green font-medium'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                          title={k.contact_email}
                        >
                          {k.short_name}
                        </button>
                      );
                    };
                    const groups = PRODUCTS.map(p => ({
                      product: p,
                      items: emailAllKvps.filter(k => Array.isArray(k.products) && k.products.includes(p)),
                    }));
                    const unassigned = emailAllKvps.filter(k => !Array.isArray(k.products) || k.products.length === 0);

                    const selectGroup = (items: KVP[]) => setEmailSelectedKvpIds(prev =>
                      Array.from(new Set([...prev, ...items.map(i => i.id)]))
                    );

                    return (
                      <>
                        {groups.map(g => g.items.length > 0 && (
                          <div key={g.product}>
                            <div className="flex items-center justify-between mb-1.5">
                              <h4 className="text-xs font-bold tracking-wide text-hanse-navy uppercase">{g.product}</h4>
                              <button type="button" onClick={() => selectGroup(g.items)}
                                className="text-xs text-init-green hover:underline">Alle in {g.product}</button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">{g.items.map(renderKvpButton)}</div>
                          </div>
                        ))}
                        {unassigned.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold tracking-wide text-gray-500 uppercase mb-1.5">Ohne Produkt</h4>
                            <div className="flex flex-wrap gap-1.5">{unassigned.map(renderKvpButton)}</div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              <div>
                <label className="label">Zusätzliche Empfänger (optional)</label>
                <input className="input-field" value={emailExtra}
                  onChange={e => setEmailExtra(e.target.value)}
                  placeholder="weitere@empfaenger.de, …" />
                <p className="text-xs text-gray-400 mt-1">Komma-getrennt. Werden zusätzlich zu den ausgewählten KVPs in BCC aufgenommen.</p>
              </div>

              <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-2">
                Versand an <b>{computedRecipients().length}</b> Empfänger via BCC · keine Adressen für Kunden sichtbar.
              </div>

              <div>
                <label className="label">Betreff</label>
                <input className="input-field" value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)} />
              </div>
              <div>
                <label className="label">Inhalt</label>
                <textarea className="input-field font-mono text-xs min-h-[280px]" value={emailBody}
                  onChange={e => setEmailBody(e.target.value)} />
              </div>
              {emailStatus && (
                <div className={`text-sm rounded-lg p-2 ${
                  /Fehler/i.test(emailStatus) ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
                }`}>{emailStatus}</div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button className="btn-secondary" onClick={() => setEmailFor(null)} disabled={emailSending}>Schließen</button>
              <button className="btn-secondary" onClick={copyToClipboard} disabled={emailSending}>Kopieren</button>
              <button className="btn-primary" onClick={sendEmail} disabled={emailSending}>
                {emailSending ? 'Sendet…' : 'Jetzt versenden'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
