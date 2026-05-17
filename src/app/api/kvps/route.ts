import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { KVP } from '@/lib/types';
import { requireAdmin, isResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isResponse(auth)) return auth;
  const pool = await getPool();
  const result = await pool.query('SELECT * FROM kvp ORDER BY name');
  return NextResponse.json(result.rows as KVP[]);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isResponse(auth)) return auth;
  const body = await req.json();
  if (!body.name || !body.short_name || !body.contact_email) {
    return NextResponse.json({ error: 'name, short_name und contact_email sind Pflichtfelder' }, { status: 400 });
  }

  const products = Array.isArray(body.products) ? body.products : [];
  const pool = await getPool();
  const result = await pool.query(
    `INSERT INTO kvp (name, short_name, contact_email, contact_name, region, products)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [body.name, body.short_name, body.contact_email, body.contact_name || null, body.region || null, JSON.stringify(products)]
  );

  return NextResponse.json(result.rows[0], { status: 201 });
}
