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

function formatDurationShort(minutes: number): string {
  if (!isFinite(minutes) || minutes < 0) return '–';
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const mins = Math.round(minutes % 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
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

  // Lösungszeit-Auswertung
  const resolutionStats = useMemo(() => {
    const resolved = incidents
      .filter(i => i.status === 'gelöst' && i.start_time && i.resolved_time)
      .map(i => ({
        priority: i.priority,
        resolved_time: i.resolved_time as string,
        mins: (new Date(i.resolved_time as string).getTime() - new Date(i.start_time).getTime()) / 60000,
      }))
      .filter(x => x.mins > 0);

    const all = resolved.map(r => r.mins);
    const overall = {
      count: all.length,
      avg: all.length ? all.reduce((a, b) => a + b, 0) / all.length : 0,
      med: median(all),
      min: all.length ? Math.min(...all) : 0,
      max: all.length ? Math.max(...all) : 0,
    };

    const byPrio: { priority: string; count: number; avg: number; med: number }[] = [];
    for (const p of ['kritisch', 'hoch', 'mittel', 'niedrig']) {
      const subset = resolved.filter(r => r.priority === p).map(r => r.mins);
      if (subset.length > 0) {
        byPrio.push({
          priority: p,
          count: subset.length,
          avg: subset.reduce((a, b) => a + b, 0) / subset.length,
          med: median(subset),
        });
      }
    }

    // Letzte 6 Monate Trend
    const today = new Date();
    const months: { label: string; key: string; count: number; avg: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('de-DE', { month: 'short' });
      const subset = resolved.filter(r => r.resolved_time.slice(0, 7) === key).map(r => r.mins);
      months.push({
        label,
        key,
        count: subset.length,
        avg: subset.length ? subset.reduce((a, b) => a + b, 0) / subset.length : 0,
      });
    }

    return { overall, byPrio, months };
  }, [incidents]);

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
      <div className="mb-6 flex items-baseline justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-hanse-navy">Dashboard</h1>
        <p className="text-sm text-gray-500">Willkommen, {admin.display_name}</p>
      </div>

      {/* Stats — kompakt als einzelne Zeile */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-px bg-gray-200 rounded-xl overflow-hidden mb-6 border border-gray-200">
        {[
          { label: 'Gesamt', value: stats.total, color: 'text-hanse-navy' },
          { label: 'Kritisch', value: stats.kritisch, color: 'text-brand-red' },
          { label: 'Offen', value: stats.offen, color: 'text-red-500' },
          { label: 'In Prüfung', value: stats.inPruefung, color: 'text-hanse-navy' },
          { label: 'Workaround', value: stats.workaround, color: 'text-amber-600' },
          { label: 'Gelöst', value: stats.geloest, color: 'text-init-green' },
        ].map(s => (
          <div key={s.label} className="bg-white px-4 py-3 text-center">
            <div className={`text-xl font-semibold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Line Chart */}
      <IncidentChart incidents={incidents} />

      {/* Lösungszeit-Auswertung */}
      <div className="card mb-8">
        <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-base font-semibold text-hanse-navy">Lösungszeit</h2>
          <span className="text-xs text-gray-400">
            Basis: {resolutionStats.overall.count} gelöste Incident{resolutionStats.overall.count === 1 ? '' : 's'}
          </span>
        </div>

        {resolutionStats.overall.count === 0 ? (
          <div className="text-sm text-gray-400 italic py-6 text-center">
            Noch keine gelösten Incidents für die Auswertung vorhanden.
          </div>
        ) : (
          <>
            {/* Kennzahlen */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-200 rounded-xl overflow-hidden border border-gray-200 mb-5">
              {[
                { label: 'Ø Durchschnitt', value: formatDurationShort(resolutionStats.overall.avg) },
                { label: 'Median', value: formatDurationShort(resolutionStats.overall.med) },
                { label: 'Schnellste', value: formatDurationShort(resolutionStats.overall.min) },
                { label: 'Längste', value: formatDurationShort(resolutionStats.overall.max) },
              ].map(s => (
                <div key={s.label} className="bg-white px-4 py-3 text-center">
                  <div className="text-lg font-semibold text-hanse-navy">{s.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Nach Priorität */}
              {resolutionStats.byPrio.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold tracking-wide text-gray-500 uppercase mb-2">Nach Priorität</h3>
                  <div className="space-y-1.5">
                    {resolutionStats.byPrio.map(p => {
                      const cls: Record<string, string> = {
                        kritisch: 'bg-brand-red',
                        hoch: 'bg-orange-500',
                        mittel: 'bg-amber-500',
                        niedrig: 'bg-init-green',
                      };
                      return (
                        <div key={p.priority} className="flex items-center gap-3 text-sm">
                          <div className={`w-1.5 h-1.5 rounded-full ${cls[p.priority] || 'bg-gray-400'}`} />
                          <span className="text-hanse-navy w-20 capitalize">{p.priority}</span>
                          <span className="text-xs text-gray-400 w-16">{p.count} Stk.</span>
                          <span className="text-gray-600 flex-1">Ø {formatDurationShort(p.avg)}</span>
                          <span className="text-gray-400 text-xs">Med. {formatDurationShort(p.med)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Trend letzte 6 Monate */}
              <div>
                <h3 className="text-xs font-semibold tracking-wide text-gray-500 uppercase mb-2">Trend (Ø pro Monat)</h3>
                {(() => {
                  const maxAvg = Math.max(...resolutionStats.months.map(m => m.avg), 1);
                  return (
                    <div className="space-y-1.5">
                      {resolutionStats.months.map(m => (
                        <div key={m.key} className="flex items-center gap-3 text-sm">
                          <span className="w-10 text-xs text-gray-500">{m.label}</span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-init-green/70 rounded-full transition-all"
                              style={{ width: `${(m.avg / maxAvg) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-24 text-right">
                            {m.count > 0 ? `${formatDurationShort(m.avg)} (${m.count})` : '–'}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </>
        )}
      </div>

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
        <div className="space-y-2">
          {filtered.map(incident => {
            const systems = Array.isArray(incident.affected_systems) ? incident.affected_systems : [];
            return (
              <a
                key={incident.id}
                href={`/incidents/${incident.id}`}
                className="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl bg-white hover:border-gray-300 transition-colors"
              >
                <span className="text-xs font-mono text-gray-400 flex-shrink-0 w-16">{incident.id}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-hanse-navy truncate">{incident.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                    {systems.join(', ')} · {formatDate(incident.start_time)}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {incident.is_warning && (
                    <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Einschr.</span>
                  )}
                  <StatusBadge status={incident.status} />
                </div>
                <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
