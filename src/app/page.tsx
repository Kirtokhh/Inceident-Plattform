'use client';

import { useEffect, useState } from 'react';
import { IncidentWithKVPs } from '@/lib/types';

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function DashboardPage() {
  const [incidents, setIncidents] = useState<IncidentWithKVPs[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetch('/api/incidents')
      .then(r => r.json())
      .then(data => {
        setIncidents(data);
        setLoading(false);
      });
  }, []);

  const filtered = filter === 'all'
    ? incidents
    : incidents.filter(i => i.status === filter);

  const stats = {
    total: incidents.length,
    offen: incidents.filter(i => i.status === 'offen').length,
    inPruefung: incidents.filter(i => i.status === 'in Prüfung').length,
    workaround: incidents.filter(i => i.status === 'Workaround').length,
    geloest: incidents.filter(i => i.status === 'gelöst').length,
    kritisch: incidents.filter(i => i.priority === 'kritisch' && i.status !== 'gelöst').length,
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Incident Dashboard</h1>
        <p className="text-slate-400">Übersicht aller Störungen und deren Status</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="card text-center">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-xs text-slate-400 mt-1">Gesamt</div>
        </div>
        <div className="card text-center border-red-700/50">
          <div className="text-2xl font-bold text-red-400">{stats.kritisch}</div>
          <div className="text-xs text-slate-400 mt-1">Kritisch (aktiv)</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-red-300">{stats.offen}</div>
          <div className="text-xs text-slate-400 mt-1">Offen</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-300">{stats.inPruefung}</div>
          <div className="text-xs text-slate-400 mt-1">In Prüfung</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-300">{stats.workaround}</div>
          <div className="text-xs text-slate-400 mt-1">Workaround</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-300">{stats.geloest}</div>
          <div className="text-xs text-slate-400 mt-1">Gelöst</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'offen', 'in Prüfung', 'Workaround', 'gelöst'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {f === 'all' ? 'Alle' : f}
          </button>
        ))}
      </div>

      {/* Incident List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Lade Incidents...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-slate-500 text-lg">Keine Incidents gefunden</div>
          <a href="/incidents/new" className="btn-primary inline-block mt-4">
            Erstes Incident anlegen
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(incident => (
            <a
              key={incident.id}
              href={`/incidents/${incident.id}`}
              className="card block hover:border-blue-500/50 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-mono text-slate-500">{incident.id}</span>
                    <PriorityBadge priority={incident.priority} />
                    <StatusBadge status={incident.status} />
                  </div>
                  <h3 className="text-lg font-semibold text-white truncate">{incident.title}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                    <span>📱 {incident.affected_app}</span>
                    <span>🎫 {incident.product}</span>
                    <span>🔧 {incident.problem_type}</span>
                    <span>🕐 {formatDate(incident.start_time)}</span>
                  </div>
                  {incident.kvps.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {incident.kvps.map(k => (
                        <span key={k.id} className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                          {k.short_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
