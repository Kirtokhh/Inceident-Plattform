import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireAdmin, isResponse } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if (isResponse(auth)) return auth;
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 });
  }

  const body = await req.json();
  if (!body.name || !body.short_name || !body.contact_email) {
    return NextResponse.json({ error: 'name, short_name und contact_email sind Pflichtfelder' }, { status: 400 });
  }

  const pool = await getPool();
  const products = Array.isArray(body.products) ? body.products : [];
  const result = await pool.query(
    `UPDATE kvp SET name = $1, short_name = $2, contact_email = $3, contact_name = $4, region = $5, products = $6
     WHERE id = $7 RETURNING *`,
    [body.name, body.short_name, body.contact_email, body.contact_name || null, body.region || null, JSON.stringify(products), id]
  );

  if (result.rowCount === 0) {
    return NextResponse.json({ error: 'KVP nicht gefunden' }, { status: 404 });
  }
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if (isResponse(auth)) return auth;
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 });
  }

  const pool = await getPool();
  const inUse = await pool.query('SELECT 1 FROM incident_kvp WHERE kvp_id = $1 LIMIT 1', [id]);
  if (inUse.rowCount && inUse.rowCount > 0) {
    return NextResponse.json(
      { error: 'KVP ist mit bestehenden Incidents verknüpft und kann nicht gelöscht werden.' },
      { status: 409 }
    );
  }

  const result = await pool.query('DELETE FROM kvp WHERE id = $1', [id]);
  if (result.rowCount === 0) {
    return NextResponse.json({ error: 'KVP nicht gefunden' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
