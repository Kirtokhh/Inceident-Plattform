'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Incident, KVP, IncidentUpdate, EmailLog, EmailType } from '@/lib/types';
import { useAdminAuth } from '@/lib/admin-auth-context';

const EMAIL_TYPES: EmailType[] = ['Erstmeldung', 'Zwischenupdate', 'Workaround', 'Abschluss/RCA'];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function PriorityBadge({ priority }: { priority: string }) {
  const cls: Record<string, string> = {
    kritisch: 'badge-kritisch',
    hoch: 'badge-hoch',
    mittel: 'badge-mittel',
    niedrig: 'badge-niedrig',
  };
  return <span className={`badge ${cls[priority] || ''}`}>{priority.toUpperCase()}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    'offen': 'badge-offen',
    'in Prüfung': 'badge-prüfung',
    'Workaround': 'badge-workaround',
    'gelöst': 'badge-gelöst',
  };
  return <span className={`badge ${cls[status] || ''}`}>{status}</span>;
}

interface IncidentDetail extends Incident {
  kvps: KVP[];
  updates: IncidentUpdate[];
  emailLogs: EmailLog[];
}

export default function IncidentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { admin, loading: authLoading } = useAdminAuth();
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'updates' | 'emails' | 'details'>('updates');
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    update_type: 'Zwischenupdate' as EmailType,
    message: '',
    send_email: true,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !admin) {
      window.location.href = '/';
    }
  }, [admin, authLoading]);

  const loadIncident = () => {
    if (admin) {
      fetch(`/api/incidents/${id}`)
        .then(r => r.json())
        .then(data => {
          setIncident(data);
          setLoading(false);
        });
    }
  };

  useEffect(() => {
    if (admin) loadIncident();
  }, [id, admin]);

  if (authLoading || !admin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-2 border-init-green/30 border-t-init-green rounded-full animate-spin" />
      </div>
    );
  }

  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateForm.message) {
      alert('Bitte Nachricht eingeben');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/incidents/${id}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateForm),
      });
      if (res.ok) {
        setShowUpdateForm(false);
        setUpdateForm({ update_type: 'Zwischenupdate', message: '', send_email: true });
        loadIncident();
      } else {
        const err = await res.json();
        alert(`Fehler: ${err.error}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="inline-block w-8 h-8 border-2 border-init-green/30 border-t-init-green rounded-full animate-spin mb-3" />
        <div>Lade Incident...</div>
      </div>
    );
  }

  if (!incident) {
    return <div className="text-center py-16 text-brand-red font-medium">Incident nicht gefunden</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <a href="/" className="inline-flex items-center gap-1 text-gray-500 hover:text-init-green text-sm mb-4 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Zurück zum Dashboard
        </a>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{incident.id}</span>
              <PriorityBadge priority={incident.priority} />
              <StatusBadge status={incident.status} />
              {incident.is_warning && (
                <span className="badge bg-amber-50 text-amber-700 border border-amber-200">EINSCHRÄNKUNG</span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-hanse-navy">{incident.title}</h1>
          </div>
          <button
            onClick={() => setShowUpdateForm(!showUpdateForm)}
            className="btn-primary flex-shrink-0"
          >
            + Update erstellen
          </button>
        </div>
      </div>

      {/* Update Form */}
      {showUpdateForm && (
        <div className="card mb-6 border-init-green/30 border-2">
          <h2 className="text-base font-semibold text-hanse-navy mb-4">Neues Update erstellen</h2>
          <form onSubmit={handleSubmitUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Update-Typ *</label>
                <select
                  className="select-field"
                  value={updateForm.update_type}
                  onChange={e => setUpdateForm({ ...updateForm, update_type: e.target.value as EmailType })}
                >
                  {EMAIL_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateForm.send_email}
                    onChange={e => setUpdateForm({ ...updateForm, send_email: e.target.checked })}
                    className="rounded w-5 h-5"
                  />
                  <span className="text-gray-600 text-sm">E-Mail automatisch senden</span>
                </label>
              </div>
            </div>
            <div>
              <label className="label">Nachricht *</label>
              <textarea
                className="input-field min-h-[120px]"
                placeholder="Update-Nachricht eingeben..."
                value={updateForm.message}
                onChange={e => setUpdateForm({ ...updateForm, message: e.target.value })}
                required
              />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowUpdateForm(false)} className="btn-secondary">
                Abbrechen
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting
                  ? 'Wird gesendet...'
                  : updateForm.send_email
                    ? 'Update erstellen & E-Mail senden'
                    : 'Update erstellen (ohne E-Mail)'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Info Cards – Systeme/Prozesse */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="card">
          <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Betroffene Systeme</div>
          <div className="flex flex-wrap gap-2">
            {(Array.isArray(incident.affected_systems) ? incident.affected_systems : []).map(s => (
              <span key={s} className="text-sm bg-init-green/10 text-init-green border border-init-green/20 px-3 py-1 rounded-lg font-medium">
                {s}
              </span>
            ))}
          </div>
          {incident.is_warning && (
            <div className="mt-3 text-amber-700 text-sm bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
              Einschränkung – Funktionalität nur teilweise betroffen, kein Totalausfall.
            </div>
          )}
        </div>
        <div className="card">
          <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Betroffene Prozesse</div>
          <div className="flex flex-wrap gap-2">
            {(Array.isArray(incident.affected_processes) ? incident.affected_processes : []).map(p => (
              <span key={p} className="text-sm bg-red-50 text-brand-red border border-red-200 px-3 py-1 rounded-lg font-medium">
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Info Cards – Zeiten & KVPs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Startzeit</div>
          <div className="text-hanse-navy font-medium">{formatDate(incident.start_time)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Gelöst am</div>
          <div className="text-hanse-navy font-medium">
            {incident.resolved_time ? formatDate(incident.resolved_time) : '–'}
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Betroffene KVPs</div>
          <div className="flex flex-wrap gap-1">
            {incident.kvps.map(k => (
              <span key={k.id} className="text-xs bg-blue-50 text-hanse-navy border border-blue-200 px-2 py-1 rounded-lg font-medium">
                {k.short_name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {incident.description && (
        <div className="card mb-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Beschreibung</div>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{incident.description}</p>
        </div>
      )}

      {incident.workaround_description && (
        <div className="card mb-4 border-l-4 border-l-brand-gold">
          <div className="text-xs text-amber-700 uppercase tracking-wider font-semibold mb-2">🔧 Workaround</div>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{incident.workaround_description}</p>
        </div>
      )}

      {incident.root_cause && (
        <div className="card mb-4 border-l-4 border-l-init-green">
          <div className="text-xs text-init-green uppercase tracking-wider font-semibold mb-2">Root Cause</div>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{incident.root_cause}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {([
          ['updates', `Updates (${incident.updates.length})`],
          ['emails', `E-Mail-Versand (${incident.emailLogs.length})`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === key
                ? 'border-init-green text-init-green'
                : 'border-transparent text-gray-500 hover:text-hanse-navy'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Updates Tab */}
      {activeTab === 'updates' && (
        <div className="space-y-3">
          {incident.updates.length === 0 ? (
            <div className="text-center py-10 text-gray-400">Noch keine Updates</div>
          ) : (
            incident.updates.map(update => (
              <div key={update.id} className="card">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className={`badge ${
                      update.update_type === 'Erstmeldung' ? 'badge-offen' :
                      update.update_type === 'Zwischenupdate' ? 'badge-prüfung' :
                      update.update_type === 'Workaround' ? 'badge-workaround' :
                      'badge-gelöst'
                    }`}>
                      {update.update_type}
                    </span>
                    <span className="text-xs text-gray-400">von {update.created_by}</span>
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(update.created_at)}</span>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{update.message}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Emails Tab */}
      {activeTab === 'emails' && (
        <div className="space-y-3">
          {incident.emailLogs.length === 0 ? (
            <div className="text-center py-10 text-gray-400">Noch keine E-Mails gesendet</div>
          ) : (
            incident.emailLogs.map(log => (
              <div key={log.id} className="card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`badge ${
                      log.status === 'gesendet' ? 'badge-gelöst' :
                      log.status === 'fehlgeschlagen' ? 'badge-offen' :
                      'badge-prüfung'
                    }`}>
                      {log.status === 'gesendet' ? '✅ Gesendet' :
                       log.status === 'fehlgeschlagen' ? '❌ Fehlgeschlagen' :
                       '📝 Entwurf'}
                    </span>
                    <span className="badge badge-prüfung">{log.email_type}</span>
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(log.sent_at)}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Betreff: </span>
                    <span className="text-gray-700 font-medium">{log.subject}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Empfänger: </span>
                    <span className="text-gray-700">
                      {(() => {
                        try {
                          return JSON.parse(log.recipients).join(', ');
                        } catch {
                          return log.recipients;
                        }
                      })()}
                    </span>
                  </div>
                  {log.error_message && (
                    <div className="text-brand-red text-xs mt-2 bg-red-50 p-2 rounded-lg">
                      Fehler: {log.error_message}
                    </div>
                  )}
                  <details className="mt-2">
                    <summary className="text-gray-400 cursor-pointer hover:text-hanse-navy text-xs">
                      E-Mail-Inhalt anzeigen
                    </summary>
                    <pre className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 whitespace-pre-wrap overflow-auto max-h-64">
                      {log.body}
                    </pre>
                  </details>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
