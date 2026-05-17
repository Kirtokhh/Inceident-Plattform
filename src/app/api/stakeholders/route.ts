import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireAdmin, isResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isResponse(auth)) return auth;
  const pool = await getPool();
  const result = await pool.query('SELECT * FROM stakeholder ORDER BY role, name');
  return NextResponse.json(result.rows);
}
