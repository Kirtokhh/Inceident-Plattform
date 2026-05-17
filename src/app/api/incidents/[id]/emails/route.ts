import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { EmailLog } from '@/lib/types';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const pool = await getPool();
  const result = await pool.query(
    'SELECT * FROM email_log WHERE incident_id = $1 ORDER BY sent_at DESC',
    [params.id]
  );
  return NextResponse.json(result.rows as EmailLog[]);
}
