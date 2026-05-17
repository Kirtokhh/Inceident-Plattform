'use client';

import { useEffect, useState, useMemo } from 'react';
import { IncidentWithKVPs } from '@/lib/types';
import { useAdminAuth } from '@/lib/admin-auth-context';

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

/* ─── SVG Line Chart with Monthly / Daily Zoom ─── */
function IncidentChart({ incidents }: { incidents: IncidentWithKVPs[] }) {
  // null = monthly overview, string = zoomed into that month (e.g. "2026-05")
  const [zoomedMonth, setZoomedMonth] = useState<string | null>(null);

  const monthlyData = useMemo(() => {
    const today = new Date();
    const months: { label: string; key: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' });
      const count = incidents.filter(inc => inc.created_at?.slice(0, 7) === key).length;
      months.push({ label, key, count });
    }
    return months;
  }, [incidents]);

  const dailyData = useMemo(() => {
    if (!zoomedMonth) return [];
    const [y, m] = zoomedMonth.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const days: { label: string; key: string; count: number }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${zoomedMonth}-${String(d).padStart(2, '0')}`;
      const label = `${d}.`;
      const count = incidents.filter(inc => inc.created_at?.slice(0, 10) === dateStr).length;
      days.push({ label, key: dateStr, count });
    }
    return days;
  }, [incidents, zoomedMonth]);

  const chartData = zoomedMonth ? dailyData : monthlyData;
  const maxCount = Math.max(...chartData.map(d => d.count), 1);

  const W = 700;
  const H = 220;
  const padL = 32;
  const padR = 12;
  const padT = 15;
  const padB = 34;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const points = chartData.map((d, i) => {
    const x = padL + (chartData.length === 1 ? chartW / 2 : (i / (chartData.length - 1)) * chartW);
    const y = padT + chartH - (d.count / maxCount) * chartH;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = points.length > 1
    ? `${linePath} L${points[points.length - 1].x},${padT + chartH} L${points[0].x},${padT + chartH} Z`
    : '';

  const yTicks: { val: number; y: number }[] = [];
  const steps = Math.min(maxCount, 4);
  for (let i = 0; i <= steps; i++) {
    const val = Math.round((maxCount / steps) * i);
    const y = padT + chartH - (val / maxCount) * chartH;
    yTicks.push({ val, y });
  }

  // Show a reasonable number of x-labels
  const xLabelInterval = zoomedMonth ? (chartData.length > 15 ? 3 : 1) : 1;
  const xLabels = points.filter((_, i) => i % xLabelInterval === 0 || i === points.length - 1);

  const [hover, setHover] = useState<number | null>(null);

  const zoomedMonthLabel = zoomedMonth
    ? new Date(Number(zoomedMonth.split('-')[0]), Number(zoomedMonth.split('-')[1]) - 1)
        .toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    : '';

  const handlePointClick = (index: number) => {
    if (!zoomedMonth && monthlyData[index]) {
      setZoomedMonth(monthlyData[index].key);
      setHover(null);
    }
  };

  return (
    <div className="card mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {zoomedMonth && (
            <button
              onClick={() => { setZoomedMonth(null); setHover(null); }}
              className="flex items-center gap-1 text-sm text-init-green hover:text-init-green-dark transition-colors font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Zurück
            </button>
          )}
          <h2 className="text-base font-semibold text-hanse-navy">
            {zoomedMonth ? zoomedMonthLabel : 'Incident-Verlauf (12 Monate)'}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {!zoomedMonth && (
            <span className="text-xs text-gray-400">Klick auf Monat zum Reinzoomen</span>
          )}
          <span className="text-xs text-gray-400 font-medium">
            {incidents.length} gesamt
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 400 }}>
          {/* Grid lines */}
          {yTicks.map(t => (
            <g key={t.val}>
              <line x1={padL} y1={t.y} x2={W - padR} y2={t.y} stroke="#E2E8F0" strokeWidth="1" />
              <text x={padL - 6} y={t.y + 4} textAnchor="end" className="fill-gray-400" fontSize="10">{t.val}</text>
            </g>
          ))}

          {/* Area fill */}
          {areaPath && <path d={areaPath} fill="url(#chartGradient)" />}

          {/* Line */}
          <path d={linePath} fill="none" stroke="#009D3C" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

          {/* Data points */}
          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x} cy={p.y}
                r={hover === i ? 5 : 3.5}
                fill="#009D3C" stroke="white" strokeWidth="2"
                className={`transition-all ${!zoomedMonth ? 'cursor-pointer' : ''}`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onClick={() => handlePointClick(i)}
              />
              {/* Invisible hit area */}
              <rect
                x={p.x - 12} y={padT} width={24} height={chartH} fill="transparent"
                className={!zoomedMonth ? 'cursor-pointer' : ''}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onClick={() => handlePointClick(i)}
              />
            </g>
          ))}

          {/* Tooltip */}
          {hover !== null && points[hover] && (
            <g>
              <line x1={points[hover].x} y1={padT} x2={points[hover].x} y2={padT + chartH} stroke="#009D3C" strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />
              <rect x={points[hover].x - 40} y={points[hover].y - 28} width={80} height={22} rx={6} fill="#053762" />
              <text x={points[hover].x} y={points[hover].y - 14} textAnchor="middle" fill="white" fontSize="10" fontWeight="600">
                {points[hover].label}: {points[hover].count}
              </text>
            </g>
          )}

          {/* X-axis labels */}
          {xLabels.map(p => (
            <text key={p.key} x={p.x} y={H - 8} textAnchor="middle" className="fill-gray-400" fontSize="9">
              {p.label}
            </text>
          ))}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#009D3C" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#009D3C" stopOpacity="0.01" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { admin, loading: authLoading } = useAdminAuth();
  const [incidents, setIncidents] = useState<IncidentWithKVPs[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!authLoading && !admin) {
      window.location.href = '/';
    }
  }, [admin, authLoading]);

  useEffect(() => {
    if (admin) {
      fetch('/api/incidents')
        .then(r => r.json())
        .then(data => {
          setIncidents(data);
          setLoading(false);
        });
    }
  }, [admin]);

  if (authLoading || !admin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-2 border-init-green/30 border-t-init-green rounded-full animate-spin" />
      </div>
    );
  }

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
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-8 bg-init-green rounded-full" />
          <h1 className="text-2xl font-bold text-hanse-navy">Admin Dashboard</h1>
        </div>
        <p className="text-gray-500 ml-3">Willkommen, {admin.display_name} – Incident-Verwaltung</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="card text-center">
          <div className="text-2xl font-bold text-hanse-navy">{stats.total}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">Gesamt</div>
        </div>
        <div className="card text-center border-l-4 border-l-brand-red">
          <div className="text-2xl font-bold text-brand-red">{stats.kritisch}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">Kritisch</div>
        </div>
        <div className="card text-center border-l-4 border-l-red-400">
          <div className="text-2xl font-bold text-red-500">{stats.offen}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">Offen</div>
        </div>
        <div className="card text-center border-l-4 border-l-hanse-navy">
          <div className="text-2xl font-bold text-hanse-navy">{stats.inPruefung}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">In Prüfung</div>
        </div>
        <div className="card text-center border-l-4 border-l-brand-gold">
          <div className="text-2xl font-bold text-amber-600">{stats.workaround}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">Workaround</div>
        </div>
        <div className="card text-center border-l-4 border-l-init-green">
          <div className="text-2xl font-bold text-init-green">{stats.geloest}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">Gelöst</div>
        </div>
      </div>

      {/* Line Chart */}
      <IncidentChart incidents={incidents} />

      {/* Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'offen', 'in Prüfung', 'Workaround', 'gelöst'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              filter === f
                ? 'bg-init-green text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {f === 'all' ? 'Alle' : f}
          </button>
        ))}
      </div>

      {/* Incident List */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <div className="inline-block w-8 h-8 border-2 border-init-green/30 border-t-init-green rounded-full animate-spin mb-3" />
          <div>Lade Incidents...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-gray-400 text-lg mb-2">Keine Incidents gefunden</div>
          <a href="/incidents/new" className="btn-primary inline-block mt-2">
            Erstes Incident anlegen
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(incident => {
            const systems = Array.isArray(incident.affected_systems) ? incident.affected_systems : [];
            const processes = Array.isArray(incident.affected_processes) ? incident.affected_processes : [];
            return (
              <a
                key={incident.id}
                href={`/incidents/${incident.id}`}
                className="card block hover:shadow-card-hover hover:border-init-green/30 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{incident.id}</span>
                      <PriorityBadge priority={incident.priority} />
                      <StatusBadge status={incident.status} />
                      {incident.is_warning && (
                        <span className="badge bg-amber-50 text-amber-700 border border-amber-200">EINSCHRÄNKUNG</span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-hanse-navy truncate">{incident.title}</h3>
                    <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 flex-wrap">
                      {systems.map(s => (
                        <span key={s} className="flex items-center gap-1">
                          <span className="text-init-green">›</span> {s}
                        </span>
                      ))}
                      <span className="text-gray-300">|</span>
                      <span>{formatDate(incident.start_time)}</span>
                    </div>
                    {processes.length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {processes.map(p => (
                          <span key={p} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <svg className="w-5 h-5 text-gray-300 flex-shrink-0 mt-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
