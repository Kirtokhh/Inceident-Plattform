import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { CreateMaintenanceRequest, Maintenance, KVP, MAINTENANCE_MIN_LEAD_DAYS } from '@/lib/types';
import { requireAdmin, isResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isResponse(auth)) return auth;
  const pool = await getPool();
  // Auto-transition statuses based on time
  await pool.query(`
    UPDATE maintenance
    SET status = CASE
      WHEN status IN ('geplant', 'läuft') AND end_time < NOW() THEN 'abgeschlossen'
      WHEN status = 'geplant' AND start_time <= NOW() AND end_time >= NOW() THEN 'läuft'
      ELSE status
    END,
    updated_at = NOW()
    WHERE status IN ('geplant', 'läuft')
  `);

  const result = await pool.query(`SELECT * FROM maintenance ORDER BY start_time DESC`);
  const out = [];
  for (const m of result.rows) {
    const kvpResult = await pool.query(
      `SELECT k.* FROM kvp k JOIN maintenance_kvp mk ON mk.kvp_id = k.id WHERE mk.maintenance_id = $1`,
      [m.id]
    );
    out.push({ ...m, kvps: kvpResult.rows as KVP[] });
  }
  return NextResponse.json(out);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isResponse(auth)) return auth;
  const body: CreateMaintenanceRequest = await req.json();

  if (!body.title || !body.affected_systems?.length || !body.start_time || !body.end_time) {
    return NextResponse.json({ error: 'Pflichtfelder fehlen (Titel, betroffene Systeme, Start- und Endzeit)' }, { status: 400 });
  }

  const start = new Date(body.start_time);
  const end = new Date(body.end_time);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: 'Ungültiges Datum' }, { status: 400 });
  }
  if (end <= start) {
    return NextResponse.json({ error: 'Endzeit muss nach der Startzeit liegen' }, { status: 400 });
  }

  const earliest = new Date(Date.now() + MAINTENANCE_MIN_LEAD_DAYS * 24 * 60 * 60 * 1000);
  if (start < earliest) {
    return NextResponse.json(
      { error: `Wartungen müssen mindestens ${MAINTENANCE_MIN_LEAD_DAYS} Tage im Voraus geplant werden. Frühestmöglicher Start: ${earliest.toLocaleString('de-DE')}.` },
      { status: 400 }
    );
  }

  const pool = await getPool();
  const seq = await pool.query("SELECT nextval('maintenance_seq') AS num");
  const num = String(seq.rows[0].num).padStart(3, '0');
  const id = `WAR-${num}`;

  await pool.query(
    `INSERT INTO maintenance (id, title, description, affected_systems, affected_processes, expected_impact, start_time, end_time, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      id, body.title, body.description || null,
      JSON.stringify(body.affected_systems),
      JSON.stringify(body.affected_processes || []),
      body.expected_impact || null,
      body.start_time, body.end_time,
      body.created_by || null,
    ]
  );

  if (body.kvp_ids?.length) {
    for (const kvpId of body.kvp_ids) {
      await pool.query('INSERT INTO maintenance_kvp (maintenance_id, kvp_id) VALUES ($1, $2)', [id, kvpId]);
    }
  }

  const result = await pool.query('SELECT * FROM maintenance WHERE id = $1', [id]);
  const kvpResult = await pool.query(
    `SELECT k.* FROM kvp k JOIN maintenance_kvp mk ON mk.kvp_id = k.id WHERE mk.maintenance_id = $1`,
    [id]
  );
  return NextResponse.json({ ...(result.rows[0] as Maintenance), kvps: kvpResult.rows as KVP[] }, { status: 201 });
}
