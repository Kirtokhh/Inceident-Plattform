import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { CreateIncidentRequest, Incident, KVP, Priority } from '@/lib/types';
import { determineRecipients } from '@/lib/recipients';
import { generateEmailSubject, generateEmailBody } from '@/lib/email-templates';
import { sendEmail } from '@/lib/mailer';
import { requireAdmin, isResponse } from '@/lib/auth';

const VALID_PRIORITIES: Priority[] = ['kritisch', 'hoch', 'mittel', 'niedrig'];

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isResponse(auth)) return auth;
  const pool = await getPool();
  const incidentResult = await pool.query(`
    SELECT * FROM incident ORDER BY
      CASE priority
        WHEN 'kritisch' THEN 1
        WHEN 'hoch' THEN 2
        WHEN 'mittel' THEN 3
        WHEN 'niedrig' THEN 4
      END,
      created_at DESC
  `);

  const result = [];
  for (const inc of incidentResult.rows) {
    const kvpResult = await pool.query(
      `SELECT k.* FROM kvp k
       JOIN incident_kvp ik ON ik.kvp_id = k.id
       WHERE ik.incident_id = $1`,
      [inc.id]
    );
    result.push({ ...inc, kvps: kvpResult.rows as KVP[] });
  }

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isResponse(auth)) return auth;
  const body: CreateIncidentRequest = await req.json();

  if (!body.title || !body.affected_systems?.length || !body.affected_processes?.length || !body.start_time) {
    return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 });
  }

  // Priority kann vom Client weggelassen werden (Formular leitet sie nicht mehr ab → wir machen es serverseitig)
  const priority: Priority = VALID_PRIORITIES.includes(body.priority)
    ? body.priority
    : (body.is_warning ? 'mittel' : 'hoch');

  const pool = await getPool();
  const seqResult = await pool.query("SELECT nextval('incident_seq') AS num");
  const num = String(seqResult.rows[0].num).padStart(3, '0');
  const id = `INC-${num}`;

  await pool.query(
    `INSERT INTO incident (id, title, description, affected_systems, affected_processes, is_warning, priority, status, start_time)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'offen', $8)`,
    [id, body.title, body.description || null, JSON.stringify(body.affected_systems), JSON.stringify(body.affected_processes), body.is_warning || false, priority, body.start_time]
  );

  if (body.kvp_ids && body.kvp_ids.length > 0) {
    for (const kvpId of body.kvp_ids) {
      await pool.query('INSERT INTO incident_kvp (incident_id, kvp_id) VALUES ($1, $2)', [id, kvpId]);
    }
  }

  const updateResult = await pool.query(
    `INSERT INTO incident_update (incident_id, update_type, message, created_by)
     VALUES ($1, 'Erstmeldung', $2, 'System') RETURNING id`,
    [id, `Incident "${body.title}" wurde erstellt.`]
  );

  const incidentResult = await pool.query('SELECT * FROM incident WHERE id = $1', [id]);
  const incident = incidentResult.rows[0] as Incident;

  const kvpResult = await pool.query(
    `SELECT k.* FROM kvp k JOIN incident_kvp ik ON ik.kvp_id = k.id WHERE ik.incident_id = $1`,
    [id]
  );
  const kvps = kvpResult.rows as KVP[];

  const recipients = await determineRecipients(body.affected_processes[0] || '', priority, body.kvp_ids || []);
  const subject = generateEmailSubject(incident, 'Erstmeldung');
  const emailBody = generateEmailBody(incident, kvps, 'Erstmeldung', '');

  let emailStatus: 'gesendet' | 'fehlgeschlagen' | 'entwurf' = 'entwurf';
  let errorMsg: string | null = null;

  if (recipients.allEmails.length > 0) {
    const result = await sendEmail(recipients.allEmails, subject, emailBody);
    emailStatus = result.success ? 'gesendet' : 'fehlgeschlagen';
    errorMsg = result.error || null;
  }

  await pool.query(
    `INSERT INTO email_log (incident_id, update_id, email_type, recipients, subject, body, status, error_message)
     VALUES ($1, $2, 'Erstmeldung', $3, $4, $5, $6, $7)`,
    [id, updateResult.rows[0].id, JSON.stringify(recipients.allEmails), subject, emailBody, emailStatus, errorMsg]
  );

  return NextResponse.json({ ...incident, kvps }, { status: 201 });
}
