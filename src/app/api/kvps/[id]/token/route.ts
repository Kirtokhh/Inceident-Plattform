import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getPool } from '@/lib/db';
import { requireAdmin, isResponse } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if (isResponse(auth)) return auth;

  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 });
  }

  const token = crypto.randomBytes(24).toString('hex');
  const pool = await getPool();
  const result = await pool.query(
    'UPDATE kvp SET access_token = $1 WHERE id = $2 RETURNING *',
    [token, id]
  );
  if (result.rowCount === 0) {
    return NextResponse.json({ error: 'KVP nicht gefunden' }, { status: 404 });
  }
  return NextResponse.json(result.rows[0]);
}
