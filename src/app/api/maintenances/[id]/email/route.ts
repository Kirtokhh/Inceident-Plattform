import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { KVP, Maintenance } from '@/lib/types';
import { generateMaintenanceSubject, generateMaintenanceBody } from '@/lib/email-templates';
import { sendEmail } from '@/lib/mailer';
import { requireAdmin, isResponse } from '@/lib/auth';

// GET → returns the prefilled template (subject, body, recipients) for preview/editing
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if (isResponse(auth)) return auth;
  const pool = await getPool();
  const mres = await pool.query('SELECT * FROM maintenance WHERE id = $1', [params.id]);
  if (mres.rowCount === 0) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  const m = mres.rows[0] as Maintenance;

  const kres = await pool.query(
    `SELECT k.* FROM kvp k JOIN maintenance_kvp mk ON mk.kvp_id = k.id WHERE mk.maintenance_id = $1`,
    [params.id]
  );
  const kvps = kres.rows as KVP[];
  const recipients = Array.from(new Set(
    kvps.flatMap(k => (k.contact_email || '').split(/[,;]/).map(e => e.trim()).filter(Boolean))
  ));

  // Auch alle KVPs zurückgeben, damit der Admin im Modal nachträglich auswählen kann
  const allKvpsRes = await pool.query('SELECT * FROM kvp ORDER BY name');

  return NextResponse.json({
    subject: generateMaintenanceSubject(m),
    body: generateMaintenanceBody(m, kvps),
    recipients,
    linked_kvp_ids: kvps.map(k => k.id),
    all_kvps: allKvpsRes.rows,
  });
}

// POST → actually sends the (possibly user-edited) email
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if (isResponse(auth)) return auth;
  const body = await req.json();
  if (!body.subject || !body.body || !Array.isArray(body.recipients) || body.recipients.length === 0) {
    return NextResponse.json({ error: 'subject, body und mindestens ein Empfänger nötig' }, { status: 400 });
  }
  const pool = await getPool();
  const mres = await pool.query('SELECT id FROM maintenance WHERE id = $1', [params.id]);
  if (mres.rowCount === 0) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

  const result = await sendEmail(body.recipients, body.subject, body.body);
  return NextResponse.json({
    success: result.success,
    error: result.error || null,
  });
}
