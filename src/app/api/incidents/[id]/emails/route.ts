import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { EmailLog } from '@/lib/types';
import { requireAdmin, isResponse } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin(req);
  if (isResponse(auth)) return auth;
  const pool = await getPool();
  const result = await pool.query(
    'SELECT * FROM email_log WHERE incident_id = $1 ORDER BY sent_at DESC',
    [params.id]
  );
  return NextResponse.json(result.rows as EmailLog[]);
}
