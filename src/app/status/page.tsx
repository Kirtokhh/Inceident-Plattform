'use client';

import { useEffect, useState } from 'react';

interface KVPInfo {
  id: number;
  name: string;
  short_name: string;
}

interface StatusMaintenance {
  id: string;
  title: string;
  description: string | null;
  affected_systems: string[];
  affected_processes: string[];
  expected_impact: string | null;
  start_time: string;
  end_time: string;
  status: string;
}

interface StatusIncident {
  id: number;
  title: string;
  description: string;
  affected_systems: string[];
  affected_processes: string[];
  is_warning: boolean;
  status: string;
  priority: string;
  start_time: string;
  resolved_time: string | null;
  workaround_description: string | null;
  created_at: string;
  updated_at: string;
  latest_update: {
    update_type: string;
    message: string;
    created_at: string;
  } | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} Tag${days === 1 ? '' : 'e'}`);
  if (hours > 0) parts.push(`${hours} Std`);
  if (minutes > 0 && days === 0) parts.push(`${minutes} Min`);
  return parts.length > 0 ? parts.join(' ') : '<1 Min';
}

export default function StatusPage() {
  const [token, setToken] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [kvp, setKvp] = useState<KVPInfo | null>(null);
  const [incidents, setIncidents] = useState<StatusIncident[]>([]);
  const [maintenances, setMaintenances] = useState<StatusMaintenance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = sessionStorage.getItem('kvp_access_token');
    if (savedToken) {
      setToken(savedToken);
      loadStatus(savedToken);
    }
  }, []);

  const loadStatus = async (accessToken: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/status', {
        headers: { 'x-access-token': accessToken },
      });
      if (res.ok) {
        const data = await res.json();
        setKvp(data.kvp);
        setIncidents(data.incidents);
        setMaintenances(data.maintenances || []);
        setAuthenticated(true);
        sessionStorage.setItem('kvp_access_token', accessToken);
      } else {
        const err = await res.json();
        setError(err.error || 'Authentifizierung fehlgeschlagen');
        setAuthenticated(false);
        sessionStorage.removeItem('kvp_access_token');
      }
    } catch {
      setError('Verbindungsfehler');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      loadStatus(token.trim());
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setKvp(null);
    setIncidents([]);
    setMaintenances([]);
    setToken('');
    setExpandedId(null);
    sessionStorage.removeItem('kvp_access_token');
  };

  // ─── Login Screen ───
  if (!authenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-init-green/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-init-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-hanse-navy">IncidentHub</h1>
            <p className="text-gray-500 mt-1 text-sm">Kunden-Statusportal</p>
          </div>

          <div className="card">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label">Access-Token</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Ihr Zugangstoken eingeben..."
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              {error && (
                <div className="text-brand-red text-sm bg-red-50 border border-red-200 rounded-xl p-3">
                  {error}
                </div>
              )}
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Prüfe...' : 'Anmelden'}
              </button>
            </form>
          </div>
          <p className="text-xs text-gray-400 text-center mt-4">
            Ihren Zugangstoken erhalten Sie von Ihrem Ansprechpartner.
          </p>
        </div>
      </div>
    );
  }

  const activeIncidents = incidents.filter(i => i.status !== 'gelöst');
  const resolvedIncidents = incidents.filter(i => i.status === 'gelöst');

  // ─── Status Page ───
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-hanse-navy">System-Status</h1>
          <p className="text-sm text-gray-500">{kvp?.name} ({kvp?.short_name})</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => loadStatus(token)} className="text-sm text-gray-500 hover:text-hanse-navy px-3 py-1.5">
            Aktualisieren
          </button>
          <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-hanse-navy px-3 py-1.5">
            Abmelden
          </button>
        </div>
      </div>

      {/* Overall Status Banner — schlanker */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-6 border ${
        activeIncidents.length === 0
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-red-50 border-red-200'
      }`}>
        <div className={`w-2.5 h-2.5 rounded-full ${activeIncidents.length === 0 ? 'bg-init-green' : 'bg-brand-red'}`} />
        <span className={`font-medium ${activeIncidents.length === 0 ? 'text-init-green' : 'text-brand-red'}`}>
          {activeIncidents.length === 0
            ? 'Alle Systeme betriebsbereit'
            : `${activeIncidents.length} aktive Störung${activeIncidents.length > 1 ? 'en' : ''}`}
        </span>
      </div>

      {/* Geplante Wartungen */}
      {maintenances.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Geplante Wartungen</h2>
          <div className="space-y-2">
            {maintenances.map(m => {
              const open = expandedId === ('m-' + m.id);
              return (
                <div
                  key={m.id}
                  className="border border-gray-200 rounded-xl bg-white cursor-pointer hover:border-gray-300 transition-colors"
                  onClick={() => setExpandedId(open ? null : ('m-' + m.id))}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${m.status === 'läuft' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-hanse-navy truncate">{m.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {formatDate(m.start_time)} – {formatDate(m.end_time)}
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-md flex-shrink-0 ${
                      m.status === 'läuft' ? 'text-amber-700 bg-amber-50' : 'text-blue-700 bg-blue-50'
                    }`}>
                      {m.status === 'läuft' ? 'läuft' : 'geplant'}
                    </span>
                    <svg className={`w-4 h-4 text-gray-300 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {open && (
                    <div className="border-t border-gray-100 px-4 py-3 space-y-2 text-sm">
                      {m.expected_impact && (
                        <div><span className="text-gray-500">Auswirkung:</span> <span className="text-gray-700">{m.expected_impact}</span></div>
                      )}
                      {m.description && <div className="text-gray-600 whitespace-pre-wrap">{m.description}</div>}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(m.affected_systems || []).map(s => (
                          <span key={s} className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{s}</span>
                        ))}
                        {(m.affected_processes || []).map(p => (
                          <span key={p} className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Incidents */}
      {activeIncidents.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Aktuelle Störungen</h2>
          <div className="space-y-2">
            {activeIncidents.map(incident => {
              const key = 'i-' + incident.id;
              const open = expandedId === key;
              return (
                <div
                  key={incident.id}
                  className="border border-gray-200 rounded-xl bg-white cursor-pointer hover:border-gray-300 transition-colors"
                  onClick={() => setExpandedId(open ? null : key)}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${incident.is_warning ? 'bg-amber-500' : 'bg-red-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-hanse-navy truncate">{incident.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">
                        {incident.status} · seit {formatDate(incident.start_time)}
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-md flex-shrink-0 ${
                      incident.is_warning ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50'
                    }`}>
                      {incident.is_warning ? 'Einschränkung' : 'Störung'}
                    </span>
                    <svg className={`w-4 h-4 text-gray-300 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {open && (
                    <div className="border-t border-gray-100 px-4 py-3 space-y-3 text-sm">
                      <div className="flex flex-wrap gap-1.5">
                        {(incident.affected_systems || []).map(s => (
                          <span key={s} className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{s}</span>
                        ))}
                        {(incident.affected_processes || []).map(p => (
                          <span key={p} className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">{p}</span>
                        ))}
                      </div>
                      {incident.description && (
                        <p className="text-gray-700 leading-relaxed">{incident.description}</p>
                      )}
                      {incident.workaround_description && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <div className="text-xs font-semibold text-amber-700 mb-1">Workaround</div>
                          <p className="text-gray-700">{incident.workaround_description}</p>
                        </div>
                      )}
                      {incident.latest_update && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-1">
                            Letztes Update ({incident.latest_update.update_type}) · {formatDate(incident.latest_update.created_at)}
                          </div>
                          <p className="text-gray-700">{incident.latest_update.message}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Resolved Incidents */}
      {resolvedIncidents.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Kürzlich gelöste Störungen</h2>
          <div className="space-y-1.5">
            {resolvedIncidents.slice(0, 10).map(incident => {
              const resolved = incident.resolved_time || incident.updated_at;
              const durationMs = new Date(resolved).getTime() - new Date(incident.start_time).getTime();
              const durationStr = durationMs > 0 ? formatDuration(durationMs) : null;
              return (
                <div key={incident.id} className="flex items-center gap-3 px-4 py-2.5 border border-gray-100 rounded-xl bg-gray-50/50">
                  <div className="w-1.5 h-1.5 rounded-full bg-init-green flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-700 truncate">{incident.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5 truncate">
                      Gelöst {formatDate(resolved)}{durationStr ? ` · Dauer ${durationStr}` : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
