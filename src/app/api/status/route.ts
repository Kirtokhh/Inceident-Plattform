import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('x-access-token');
    if (!token) {
      return NextResponse.json({ error: 'Kein Zugangstoken' }, { status: 401 });
    }

    const pool = await getPool();

    // Verify token and get KVP
    const kvpResult = await pool.query(
      'SELECT id, name, short_name FROM kvp WHERE access_token = $1',
      [token.trim()]
    );
    if (kvpResult.rows.length === 0) {
      return NextResponse.json({ error: 'Ungültiger Token' }, { status: 401 });
    }
    const kvp = kvpResult.rows[0];

    // Get incidents assigned to this KVP
    const incidentsResult = await pool.query(`
      SELECT i.id, i.title, i.description, i.affected_systems, i.affected_processes,
             i.is_warning, i.status, i.priority, i.start_time, i.resolved_time,
             i.workaround_description, i.created_at, i.updated_at
      FROM incident i
      INNER JOIN incident_kvp ik ON ik.incident_id = i.id
      WHERE ik.kvp_id = $1
      ORDER BY 
        CASE WHEN i.status != 'gelöst' THEN 0 ELSE 1 END,
        i.created_at DESC
    `, [kvp.id]);

    // Get latest update for each incident
    const incidents = await Promise.all(
      incidentsResult.rows.map(async (incident) => {
        const updatesResult = await pool.query(
          `SELECT update_type, message, created_at FROM incident_update 
           WHERE incident_id = $1 ORDER BY created_at DESC LIMIT 1`,
          [incident.id]
        );
        return {
          ...incident,
          latest_update: updatesResult.rows[0] || null,
        };
      })
    );

    // Upcoming + running maintenance for this KVP
    const maintResult = await pool.query(`
      SELECT m.id, m.title, m.description, m.affected_systems, m.affected_processes,
             m.expected_impact, m.start_time, m.end_time, m.status
      FROM maintenance m
      INNER JOIN maintenance_kvp mk ON mk.maintenance_id = m.id
      WHERE mk.kvp_id = $1
        AND m.status IN ('geplant', 'läuft')
      ORDER BY m.start_time ASC
    `, [kvp.id]);

    return NextResponse.json({ kvp, incidents, maintenances: maintResult.rows });
  } catch (error) {
    console.error('Status API error:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
