import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getPool } from '@/lib/db';
import { requireAdmin, getAdminSession, isResponse } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if (isResponse(auth)) return auth;

  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 });

  const body = await req.json();
  const { display_name, password } = body;

  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (typeof display_name === 'string' && display_name.trim().length > 0) {
    sets.push(`display_name = $${i++}`);
    values.push(display_name.trim());
  }
  if (typeof password === 'string' && password.length > 0) {
    if (password.length < 8) {
      return NextResponse.json({ error: 'Passwort muss mindestens 8 Zeichen lang sein' }, { status: 400 });
    }
    sets.push(`password_hash = $${i++}`);
    values.push(await bcrypt.hash(password, 10));
    // Invalidate sessions on password change
    sets.push(`session_token = NULL`);
  }
  if (sets.length === 0) return NextResponse.json({ error: 'Keine Änderungen' }, { status: 400 });

  values.push(id);
  const pool = await getPool();
  const result = await pool.query(
    `UPDATE admin_user SET ${sets.join(', ')} WHERE id = $${i} RETURNING id, username, display_name, created_at`,
    values
  );
  if (result.rowCount === 0) return NextResponse.json({ error: 'Admin nicht gefunden' }, { status: 404 });
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession(req);
  if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 });

  if (session.id === id) {
    return NextResponse.json({ error: 'Eigenen Account kann man nicht löschen' }, { status: 400 });
  }

  const pool = await getPool();
  const countResult = await pool.query('SELECT COUNT(*)::int as c FROM admin_user');
  if (countResult.rows[0].c <= 1) {
    return NextResponse.json({ error: 'Mindestens ein Admin muss bestehen bleiben' }, { status: 400 });
  }

  const result = await pool.query('DELETE FROM admin_user WHERE id = $1', [id]);
  if (result.rowCount === 0) return NextResponse.json({ error: 'Admin nicht gefunden' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
