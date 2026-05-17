import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { KVP } from '@/lib/types';
import { requireAdmin, isResponse } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if (isResponse(auth)) return auth;
  const pool = await getPool();
  const result = await pool.query('SELECT * FROM maintenance WHERE id = $1', [params.id]);
  if (result.rowCount === 0) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  const kvps = await pool.query(
    `SELECT k.* FROM kvp k JOIN maintenance_kvp mk ON mk.kvp_id = k.id WHERE mk.maintenance_id = $1`,
    [params.id]
  );
  return NextResponse.json({ ...result.rows[0], kvps: kvps.rows as KVP[] });
}

const ALLOWED = ['title', 'description', 'affected_systems', 'affected_processes', 'expected_impact', 'start_time', 'end_time', 'status'];

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if (isResponse(auth)) return auth;
  const body = await req.json();
  const pool = await getPool();

  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const f of ALLOWED) {
    if (f in body) {
      if (f === 'affected_systems' || f === 'affected_processes') {
        sets.push(`${f} = $${i++}`);
        values.push(JSON.stringify(body[f]));
      } else {
        sets.push(`${f} = $${i++}`);
        values.push(body[f]);
      }
    }
  }
  if (sets.length === 0 && !Array.isArray(body.kvp_ids)) {
    return NextResponse.json({ error: 'Keine Änderungen' }, { status: 400 });
  }

  if (sets.length > 0) {
    sets.push(`updated_at = NOW()`);
    values.push(params.id);
    await pool.query(`UPDATE maintenance SET ${sets.join(', ')} WHERE id = $${i}`, values);
  }

  if (Array.isArray(body.kvp_ids)) {
    await pool.query('DELETE FROM maintenance_kvp WHERE maintenance_id = $1', [params.id]);
    for (const kid of body.kvp_ids) {
      await pool.query('INSERT INTO maintenance_kvp (maintenance_id, kvp_id) VALUES ($1, $2)', [params.id, kid]);
    }
  }

  const result = await pool.query('SELECT * FROM maintenance WHERE id = $1', [params.id]);
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if (isResponse(auth)) return auth;
  const pool = await getPool();
  const result = await pool.query('DELETE FROM maintenance WHERE id = $1', [params.id]);
  if (result.rowCount === 0) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
