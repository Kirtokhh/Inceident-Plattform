'use client';

import { useEffect, useState } from 'react';

interface KVPInfo {
  id: number;
  name: string;
  short_name: string;
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

function StatusIcon({ status, isWarning }: { status: string; isWarning: boolean }) {
  if (status === 'gelöst') return <span className="text-green-400 text-xl">✅</span>;
  if (isWarning) return <span className="text-yellow-400 text-xl">⚠️</span>;
  return <span className="text-red-400 text-xl">🔴</span>;
}

function PriorityLabel({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    kritisch: 'text-red-400',
    hoch: 'text-orange-400',
    mittel: 'text-yellow-400',
    niedrig: 'text-green-400',
  };
  return <span className={`text-sm font-medium ${colors[priority] || 'text-slate-400'}`}>{priority.toUpperCase()}</span>;
}

export default function StatusPage() {
  const [token, setToken] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [kvp, setKvp] = useState<KVPInfo | null>(null);
  const [incidents, setIncidents] = useState<StatusIncident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<StatusIncident | null>(null);

  // Check if there's a saved token in sessionStorage
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
    setToken('');
    setSelectedIncident(null);
    sessionStorage.removeItem('kvp_access_token');
  };

  // Login Screen
  if (!authenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="card max-w-md w-full">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🚇</div>
            <h1 className="text-2xl font-bold text-white">TransitIncidentHub</h1>
            <p className="text-slate-400 mt-2">Kunden-Statusportal</p>
            <p className="text-sm text-slate-500 mt-1">Bitte geben Sie Ihren Zugangstoken ein</p>
          </div>

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
              <div className="text-red-400 text-sm bg-red-900/20 border border-red-700 rounded-lg p-3">
                {error}
              </div>
            )}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Prüfe...' : 'Anmelden'}
            </button>
          </form>

          <p className="text-xs text-slate-600 text-center mt-4">
            Ihren Zugangstoken erhalten Sie von Ihrem HanseCom-Ansprechpartner.
          </p>
        </div>
      </div>
    );
  }

  const activeIncidents = incidents.filter(i => i.status !== 'gelöst');
  const resolvedIncidents = incidents.filter(i => i.status === 'gelöst');

  // Status Page
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">System-Status</h1>
          <p className="text-slate-400">
            {kvp?.name} ({kvp?.short_name})
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => loadStatus(token)} className="btn-secondary text-sm">
            🔄 Aktualisieren
          </button>
          <button onClick={handleLogout} className="text-sm text-slate-400 hover:text-white">
            Abmelden
          </button>
        </div>
      </div>

      {/* Overall Status Banner */}
      {activeIncidents.length === 0 ? (
        <div className="card border-green-700/50 bg-green-900/10 mb-8">
          <div className="flex items-center gap-3">
            <span className="text-3xl">✅</span>
            <div>
              <h2 className="text-lg font-semibold text-green-300">Alle Systeme betriebsbereit</h2>
              <p className="text-sm text-green-400/70">Aktuell liegen keine Störungen vor.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card border-red-700/50 bg-red-900/10 mb-8">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚠️</span>
            <div>
              <h2 className="text-lg font-semibold text-red-300">
                {activeIncidents.length} aktive Störung{activeIncidents.length > 1 ? 'en' : ''}
              </h2>
              <p className="text-sm text-red-400/70">
                Bitte beachten Sie die folgenden Einschränkungen.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active Incidents */}
      {activeIncidents.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Aktuelle Störungen</h2>
          <div className="space-y-4">
            {activeIncidents.map(incident => (
              <div
                key={incident.id}
                className="card cursor-pointer hover:border-slate-500 transition-colors"
                onClick={() => setSelectedIncident(selectedIncident?.id === incident.id ? null : incident)}
              >
                <div className="flex items-start gap-3">
                  <StatusIcon status={incident.status} isWarning={incident.is_warning} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white">{incident.title}</h3>
                      <PriorityLabel priority={incident.priority} />
                    </div>

                    {/* Affected Systems & Processes */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(incident.affected_systems || []).map(s => (
                        <span key={s} className="text-xs bg-blue-900/30 text-blue-300 border border-blue-800 px-2 py-0.5 rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {(incident.affected_processes || []).map(p => (
                        <span key={p} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                          {p}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span>Status: <span className="text-slate-300">{incident.status}</span></span>
                      <span>Seit: {formatDate(incident.start_time)}</span>
                    </div>

                    {/* Expanded Detail */}
                    {selectedIncident?.id === incident.id && (
                      <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
                        {incident.description && (
                          <div>
                            <div className="text-xs text-slate-500 uppercase mb-1">Beschreibung</div>
                            <p className="text-sm text-slate-300">{incident.description}</p>
                          </div>
                        )}
                        {incident.workaround_description && (
                          <div className="bg-yellow-900/10 border border-yellow-700/50 rounded-lg p-3">
                            <div className="text-xs text-yellow-500 uppercase mb-1">🔧 Workaround</div>
                            <p className="text-sm text-slate-300">{incident.workaround_description}</p>
                          </div>
                        )}
                        {incident.latest_update && (
                          <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="text-xs text-slate-500 uppercase mb-1">
                              Letztes Update ({incident.latest_update.update_type}) – {formatDate(incident.latest_update.created_at)}
                            </div>
                            <p className="text-sm text-slate-300">{incident.latest_update.message}</p>
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
          <h2 className="text-lg font-semibold text-white mb-4">Kürzlich gelöste Störungen</h2>
          <div className="space-y-3">
            {resolvedIncidents.slice(0, 10).map(incident => (
              <div key={incident.id} className="card opacity-70">
                <div className="flex items-center gap-3">
                  <span className="text-green-400">✅</span>
                  <div className="flex-1">
                    <h3 className="font-medium text-white">{incident.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span>{(incident.affected_systems || []).join(', ')}</span>
                      <span>Gelöst: {incident.resolved_time ? formatDate(incident.resolved_time) : formatDate(incident.updated_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
