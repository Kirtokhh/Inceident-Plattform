import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { CreateUpdateRequest, Incident, KVP } from '@/lib/types';
import { determineRecipients } from '@/lib/recipients';
import { generateEmailSubject, generateEmailBody } from '@/lib/email-templates';
import { sendEmail } from '@/lib/mailer';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const pool = await getPool();
  const result = await pool.query(
    'SELECT * FROM incident_update WHERE incident_id = $1 ORDER BY created_at DESC',
    [params.id]
  );
  return NextResponse.json(result.rows);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const pool = await getPool();

  const incidentResult = await pool.query('SELECT * FROM incident WHERE id = $1', [params.id]);
  if (incidentResult.rows.length === 0) {
    return NextResponse.json({ error: 'Incident nicht gefunden' }, { status: 404 });
  }

  const body: CreateUpdateRequest = await req.json();

  if (!body.update_type || !body.message) {
    return NextResponse.json({ error: 'update_type und message sind Pflichtfelder' }, { status: 400 });
  }

  // Update incident status based on update type
  if (body.update_type === 'Workaround') {
    await pool.query(
      "UPDATE incident SET status = 'Workaround', workaround_description = $1, updated_at = NOW() WHERE id = $2",
      [body.message, params.id]
    );
  } else if (body.update_type === 'Entwarnung') {
    await pool.query(
      "UPDATE incident SET status = 'gelöst', resolved_time = NOW(), updated_at = NOW() WHERE id = $1",
      [params.id]
    );
  } else if (body.update_type === 'Zwischenupdate') {
    await pool.query(
      "UPDATE incident SET status = 'in Prüfung', updated_at = NOW() WHERE id = $1",
      [params.id]
    );
  } else if (body.update_type === 'Abschluss/RCA') {
    await pool.query(
      "UPDATE incident SET status = 'gelöst', root_cause = $1, updated_at = NOW() WHERE id = $2",
      [body.message, params.id]
    );
  }

  // Insert update record
  const insertResult = await pool.query(
    `INSERT INTO incident_update (incident_id, update_type, message, created_by)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [params.id, body.update_type, body.message, body.created_by || 'System']
  );
  const updateId = insertResult.rows[0].id;

  // Refresh incident data
  const updatedResult = await pool.query('SELECT * FROM incident WHERE id = $1', [params.id]);
  const updatedIncident = updatedResult.rows[0] as Incident;

  const kvpResult = await pool.query(
    `SELECT k.* FROM kvp k JOIN incident_kvp ik ON ik.kvp_id = k.id WHERE ik.incident_id = $1`,
    [params.id]
  );
  const kvps = kvpResult.rows as KVP[];

  // Send email if requested
  if (body.send_email) {
    const kvpIds = kvps.map(k => k.id);
    const recipients = await determineRecipients(updatedIncident.problem_type, updatedIncident.priority, kvpIds);
    const subject = generateEmailSubject(updatedIncident, body.update_type);
    const emailBody = generateEmailBody(updatedIncident, kvps, body.update_type, body.message);

    let emailStatus: 'gesendet' | 'fehlgeschlagen' | 'entwurf' = 'entwurf';
    let errorMsg: string | null = null;

    if (recipients.allEmails.length > 0) {
      const emailResult = await sendEmail(recipients.allEmails, subject, emailBody);
      emailStatus = emailResult.success ? 'gesendet' : 'fehlgeschlagen';
      errorMsg = emailResult.error || null;
    }

    await pool.query(
      `INSERT INTO email_log (incident_id, update_id, email_type, recipients, subject, body, status, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [params.id, updateId, body.update_type, JSON.stringify(recipients.allEmails), subject, emailBody, emailStatus, errorMsg]
    );
  }

  return NextResponse.json({
    id: updateId,
    incident_id: params.id,
    update_type: body.update_type,
    message: body.message,
  }, { status: 201 });
}
