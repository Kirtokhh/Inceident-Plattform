import { NextRequest, NextResponse } from 'next/server';
import { getPool } from './db';

export interface AdminSession {
  id: number;
  username: string;
  display_name: string;
}

export async function getAdminSession(req: NextRequest): Promise<AdminSession | null> {
  const token = req.cookies.get('admin_session')?.value;
  if (!token) return null;
  const pool = await getPool();
  const result = await pool.query(
    'SELECT id, username, display_name FROM admin_user WHERE session_token = $1',
    [token]
  );
  return (result.rows[0] as AdminSession) || null;
}

export async function requireAdmin(req: NextRequest): Promise<AdminSession | NextResponse> {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }
  return session;
}

export function isResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
