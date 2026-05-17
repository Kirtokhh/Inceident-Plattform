'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Incident, KVP, IncidentUpdate, EmailLog, EmailType } from '@/lib/types';

const EMAIL_TYPES: EmailType[] = ['Erstmeldung', 'Zwischenupdate', 'Workaround', 'Entwarnung', 'Abschluss/RCA'];

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
  const [emailPreview, setEmailPreview] = useState<string | null>(null);

  const loadIncident = () => {
    fetch(`/api/incidents/${id}`)
      .then(r => r.json())
      .then(data => {
        setIncident(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadIncident();
  }, [id]);

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
    return <div className="text-center py-12 text-slate-400">Lade Incident...</div>;
  }

  if (!incident) {
    return <div className="text-center py-12 text-red-400">Incident nicht gefunden</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <a href="/" className="text-slate-400 hover:text-white text-sm">← Zurück zum Dashboard</a>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-mono text-slate-500">{incident.id}</span>
              <PriorityBadge priority={incident.priority} />
              <StatusBadge status={incident.status} />
            </div>
            <h1 className="text-3xl font-bold text-white">{incident.title}</h1>
          </div>
          <button
            onClick={() => setShowUpdateForm(!showUpdateForm)}
            className="btn-primary"
          >
            + Update erstellen
          </button>
        </div>
      </div>

      {/* Update Form */}
      {showUpdateForm && (
        <div className="card mb-6 border-blue-500/50">
          <h2 className="text-lg font-semibold text-white mb-4">Neues Update erstellen</h2>
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
                    className="rounded border-slate-600 w-5 h-5"
                  />
                  <span className="text-slate-300">E-Mail automatisch senden</span>
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

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="text-xs text-slate-500 uppercase mb-1">Betroffene App</div>
          <div className="text-white font-medium">{incident.affected_app}</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500 uppercase mb-1">Produkt</div>
          <div className="text-white font-medium">{incident.product}</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500 uppercase mb-1">Problemtyp</div>
          <div className="text-white font-medium">{incident.problem_type}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="text-xs text-slate-500 uppercase mb-1">Startzeit</div>
          <div className="text-white font-medium">{formatDate(incident.start_time)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500 uppercase mb-1">Gelöst am</div>
          <div className="text-white font-medium">
            {incident.resolved_time ? formatDate(incident.resolved_time) : '–'}
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500 uppercase mb-1">Betroffene KVPs</div>
          <div className="flex flex-wrap gap-1">
            {incident.kvps.map(k => (
              <span key={k.id} className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                {k.short_name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {incident.description && (
        <div className="card mb-6">
          <div className="text-xs text-slate-500 uppercase mb-2">Beschreibung</div>
          <p className="text-slate-300 whitespace-pre-wrap">{incident.description}</p>
        </div>
      )}

      {incident.workaround_description && (
        <div className="card mb-6 border-yellow-700/50">
          <div className="text-xs text-yellow-500 uppercase mb-2">🔧 Workaround</div>
          <p className="text-slate-300 whitespace-pre-wrap">{incident.workaround_description}</p>
        </div>
      )}

      {incident.root_cause && (
        <div className="card mb-6 border-green-700/50">
          <div className="text-xs text-green-500 uppercase mb-2">📋 Root Cause</div>
          <p className="text-slate-300 whitespace-pre-wrap">{incident.root_cause}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-700">
        {([
          ['updates', `Updates (${incident.updates.length})`],
          ['emails', `E-Mail-Versand (${incident.emailLogs.length})`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === key
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white'
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
            <div className="text-center py-8 text-slate-500">Noch keine Updates</div>
          ) : (
            incident.updates.map(update => (
              <div key={update.id} className="card">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`badge ${
                      update.update_type === 'Erstmeldung' ? 'badge-offen' :
                      update.update_type === 'Zwischenupdate' ? 'badge-prüfung' :
                      update.update_type === 'Workaround' ? 'badge-workaround' :
                      update.update_type === 'Entwarnung' ? 'badge-gelöst' :
                      'badge-gelöst'
                    }`}>
                      {update.update_type}
                    </span>
                    <span className="text-xs text-slate-500">von {update.created_by}</span>
                  </div>
                  <span className="text-xs text-slate-500">{formatDate(update.created_at)}</span>
                </div>
                <p className="text-slate-300 whitespace-pre-wrap">{update.message}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Emails Tab */}
      {activeTab === 'emails' && (
        <div className="space-y-3">
          {incident.emailLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">Noch keine E-Mails gesendet</div>
          ) : (
            incident.emailLogs.map(log => (
              <div key={log.id} className="card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
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
                  <span className="text-xs text-slate-500">{formatDate(log.sent_at)}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-slate-500">Betreff: </span>
                    <span className="text-slate-300">{log.subject}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Empfänger: </span>
                    <span className="text-slate-300">
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
                    <div className="text-red-400 text-xs mt-2">
                      Fehler: {log.error_message}
                    </div>
                  )}
                  <details className="mt-2">
                    <summary className="text-slate-500 cursor-pointer hover:text-slate-300 text-xs">
                      E-Mail-Inhalt anzeigen
                    </summary>
                    <pre className="mt-2 p-3 bg-slate-900 rounded-lg text-xs text-slate-400 whitespace-pre-wrap overflow-auto max-h-64">
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
