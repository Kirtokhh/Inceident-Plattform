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
  const [expandedId, setExpandedId] = useState<number | null>(null);

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
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-8 bg-init-green rounded-full" />
            <h1 className="text-2xl font-bold text-hanse-navy">System-Status</h1>
          </div>
          <p className="text-gray-500 ml-3">
            {kvp?.name} ({kvp?.short_name})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => loadStatus(token)} className="btn-secondary text-sm">
            🔄 Aktualisieren
          </button>
          <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-hanse-navy transition-colors px-3 py-2">
            Abmelden
          </button>
        </div>
      </div>

      {/* Overall Status Banner */}
      {activeIncidents.length === 0 ? (
        <div className="card border-l-4 border-l-init-green mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-init-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-init-green">Alle Systeme betriebsbereit</h2>
              <p className="text-sm text-gray-500">Aktuell liegen keine Störungen vor.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card border-l-4 border-l-brand-red mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-brand-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-brand-red">
                {activeIncidents.length} aktive Störung{activeIncidents.length > 1 ? 'en' : ''}
              </h2>
              <p className="text-sm text-gray-500">Bitte beachten Sie die folgenden Einschränkungen.</p>
            </div>
          </div>
        </div>
      )}

      {/* Geplante Wartungen */}
      {maintenances.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-semibold text-hanse-navy mb-4">Geplante Wartungen</h2>
          <div className="space-y-3">
            {maintenances.map(m => (
              <div key={m.id} className="card border-l-4 border-l-blue-400">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{m.id}</span>
                      <span className={`text-xs font-semibold border px-2 py-0.5 rounded-lg ${
                        m.status === 'läuft'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {m.status === 'läuft' ? 'LÄUFT' : 'GEPLANT'}
                      </span>
                    </div>
                    <h3 className="font-semibold text-hanse-navy">{m.title}</h3>
                    <div className="text-sm text-gray-600 mt-1">
                      Zeitraum: {formatDate(m.start_time)} – {formatDate(m.end_time)}
                    </div>
                    {m.expected_impact && (
                      <div className="text-sm text-gray-600 mt-2">
                        <b>Auswirkung:</b> {m.expected_impact}
                      </div>
                    )}
                    {m.description && (
                      <div className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">{m.description}</div>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(m.affected_systems || []).map(s => (
                        <span key={s} className="text-xs bg-init-green/10 text-init-green px-2 py-0.5 rounded-lg">{s}</span>
                      ))}
                      {(m.affected_processes || []).map(p => (
                        <span key={p} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">{p}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Incidents */}
      {activeIncidents.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-semibold text-hanse-navy mb-4">Aktuelle Störungen</h2>
          <div className="space-y-3">
            {activeIncidents.map(incident => (
              <div
                key={incident.id}
                className="card cursor-pointer hover:shadow-card-hover transition-all duration-200"
                onClick={() => setExpandedId(expandedId === incident.id ? null : incident.id)}
              >
                <div className="flex items-start gap-3">
                  {/* Status Indicator */}
                  <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                    incident.is_warning ? 'bg-brand-gold' : 'bg-brand-red'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-hanse-navy">{incident.title}</h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {incident.is_warning ? (
                          <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">Einschränkung</span>
                        ) : (
                          <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg">Störung</span>
                        )}
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedId === incident.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(incident.affected_systems || []).map(s => (
                        <span key={s} className="text-xs bg-init-green/10 text-init-green px-2 py-0.5 rounded-lg font-medium">
                          {s}
                        </span>
                      ))}
                      {(incident.affected_processes || []).map(p => (
                        <span key={p} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">
                          {p}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                      <span className="text-gray-500 font-medium">{incident.status}</span>
                      <span>•</span>
                      <span>Seit {formatDate(incident.start_time)}</span>
                      {incident.resolved_time && (
                        <>
                          <span>•</span>
                          <span className="text-init-green font-medium">Gelöst: {formatDate(incident.resolved_time)}</span>
                        </>
                      )}
                    </div>

                    {/* Expanded Detail */}
                    {expandedId === incident.id && (
                      <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                        {incident.description && (
                          <div>
                            <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Beschreibung</div>
                            <p className="text-sm text-gray-700 leading-relaxed">{incident.description}</p>
                          </div>
                        )}
                        {incident.workaround_description && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <div className="text-xs text-amber-700 uppercase tracking-wider font-semibold mb-1">🔧 Workaround</div>
                            <p className="text-sm text-gray-700">{incident.workaround_description}</p>
                          </div>
                        )}
                        {incident.latest_update && (
                          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                            <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
                              Letztes Update ({incident.latest_update.update_type}) – {formatDate(incident.latest_update.created_at)}
                            </div>
                            <p className="text-sm text-gray-700">{incident.latest_update.message}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resolved Incidents */}
      {resolvedIncidents.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-hanse-navy mb-4">Kürzlich gelöste Störungen</h2>
          <div className="space-y-2">
            {resolvedIncidents.slice(0, 10).map(incident => {
              const resolved = incident.resolved_time || incident.updated_at;
              const durationMs = new Date(resolved).getTime() - new Date(incident.start_time).getTime();
              const durationStr = durationMs > 0 ? formatDuration(durationMs) : null;
              return (
                <div key={incident.id} className="card py-4 opacity-80">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-init-green flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-hanse-navy text-sm">{incident.title}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                        <span>{(incident.affected_systems || []).join(', ')}</span>
                        <span>•</span>
                        <span>Beginn: {formatDate(incident.start_time)}</span>
                        <span>•</span>
                        <span className="text-init-green font-medium">Gelöst: {formatDate(resolved)}</span>
                        {durationStr && (
                          <>
                            <span>•</span>
                            <span>Dauer: {durationStr}</span>
                          </>
                        )}
                      </div>
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
