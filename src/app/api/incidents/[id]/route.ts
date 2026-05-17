import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { Incident, KVP, IncidentUpdate, EmailLog } from '@/lib/types';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const pool = await getPool();

  const incidentResult = await pool.query('SELECT * FROM incident WHERE id = $1', [params.id]);
  if (incidentResult.rows.length === 0) {
    return NextResponse.json({ error: 'Incident nicht gefunden' }, { status: 404 });
  }
  const incident = incidentResult.rows[0] as Incident;

  const kvpResult = await pool.query(
    `SELECT k.* FROM kvp k
     JOIN incident_kvp ik ON ik.kvp_id = k.id
     WHERE ik.incident_id = $1`,
    [params.id]
  );

  const updatesResult = await pool.query(
    'SELECT * FROM incident_update WHERE incident_id = $1 ORDER BY created_at DESC',
    [params.id]
  );

  const emailResult = await pool.query(
    'SELECT * FROM email_log WHERE incident_id = $1 ORDER BY sent_at DESC',
    [params.id]
  );

  return NextResponse.json({
    ...incident,
    kvps: kvpResult.rows as KVP[],
    updates: updatesResult.rows as IncidentUpdate[],
    emailLogs: emailResult.rows as EmailLog[],
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const pool = await getPool();

  const existing = await pool.query('SELECT * FROM incident WHERE id = $1', [params.id]);
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: 'Incident nicht gefunden' }, { status: 404 });
  }

  const body = await req.json();
  const allowedFields = ['status', 'priority', 'root_cause', 'workaround_description', 'resolved_time', 'description'];
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      setClauses.push(`${field} = $${paramIndex}`);
      values.push(body[field]);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) {
    return NextResponse.json({ error: 'Keine Änderungen' }, { status: 400 });
  }

  setClauses.push('updated_at = NOW()');
  values.push(params.id);

  await pool.query(
    `UPDATE incident SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
    values
  );

  const updated = await pool.query('SELECT * FROM incident WHERE id = $1', [params.id]);
  return NextResponse.json(updated.rows[0]);
}
