import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// POST: Admin login
export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Benutzername und Passwort erforderlich' }, { status: 400 });
    }

    const pool = await getPool();
    const result = await pool.query(
      'SELECT id, username, password_hash, display_name FROM admin_user WHERE username = $1',
      [username.trim()]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Ungültige Anmeldedaten' }, { status: 401 });
    }

    const admin = result.rows[0];
    const valid = await bcrypt.compare(password, admin.password_hash);

    if (!valid) {
      return NextResponse.json({ error: 'Ungültige Anmeldedaten' }, { status: 401 });
    }

    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    await pool.query(
      'UPDATE admin_user SET session_token = $1 WHERE id = $2',
      [sessionToken, admin.id]
    );

    const response = NextResponse.json({
      admin: { id: admin.id, username: admin.username, display_name: admin.display_name },
    });

    response.cookies.set('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// GET: Check session
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('admin_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const pool = await getPool();
    const result = await pool.query(
      'SELECT id, username, display_name FROM admin_user WHERE session_token = $1',
      [sessionToken]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      admin: result.rows[0],
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

// DELETE: Logout
export async function DELETE(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('admin_session')?.value;
    if (sessionToken) {
      const pool = await getPool();
      await pool.query(
        'UPDATE admin_user SET session_token = NULL WHERE session_token = $1',
        [sessionToken]
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Fehler beim Abmelden' }, { status: 500 });
  }
}
