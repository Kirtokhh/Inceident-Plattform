import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getPool } from '@/lib/db';
import { requireAdmin, isResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isResponse(auth)) return auth;
  const pool = await getPool();
  const result = await pool.query(
    'SELECT id, username, display_name, created_at FROM admin_user ORDER BY username'
  );
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isResponse(auth)) return auth;
  const body = await req.json();
  const { username, password, display_name } = body;
  if (!username || !password || !display_name) {
    return NextResponse.json({ error: 'Benutzername, Passwort und Anzeigename sind Pflichtfelder' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Passwort muss mindestens 8 Zeichen lang sein' }, { status: 400 });
  }

  const pool = await getPool();
  const exists = await pool.query('SELECT 1 FROM admin_user WHERE username = $1', [username.trim()]);
  if (exists.rowCount && exists.rowCount > 0) {
    return NextResponse.json({ error: 'Benutzername bereits vergeben' }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    'INSERT INTO admin_user (username, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id, username, display_name, created_at',
    [username.trim(), hash, display_name.trim()]
  );
  return NextResponse.json(result.rows[0], { status: 201 });
}
