import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { access_token } = await request.json();

    if (!access_token || typeof access_token !== 'string') {
      return NextResponse.json({ error: 'Access-Token erforderlich' }, { status: 400 });
    }

    const pool = await getPool();
    const result = await pool.query(
      'SELECT id, name, short_name, contact_email FROM kvp WHERE access_token = $1',
      [access_token.trim()]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Ungültiger Access-Token' }, { status: 401 });
    }

    const kvp = result.rows[0];
    return NextResponse.json({ kvp });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
