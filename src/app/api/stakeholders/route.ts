import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET() {
  const pool = await getPool();
  const result = await pool.query('SELECT * FROM stakeholder ORDER BY role, name');
  return NextResponse.json(result.rows);
}
