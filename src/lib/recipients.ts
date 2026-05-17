import { getPool } from './db';
import { Stakeholder } from './types';

export async function determineRecipients(
  problemType: string,
  priority: string,
  kvpIds: number[]
): Promise<{ kvpEmails: string[]; stakeholderEmails: string[]; allEmails: string[] }> {
  const pool = await getPool();

  // Get KVP contact emails
  const kvpEmails: string[] = [];
  if (kvpIds.length > 0) {
    const placeholders = kvpIds.map((_, i) => `$${i + 1}`).join(',');
    const kvpResult = await pool.query(
      `SELECT contact_email FROM kvp WHERE id IN (${placeholders})`,
      kvpIds
    );
    kvpEmails.push(...kvpResult.rows.map((k: { contact_email: string }) => k.contact_email));
  }

  // Get stakeholders based on rules
  const stakeholderResult = await pool.query(
    `SELECT DISTINCT s.email FROM stakeholder s
     JOIN recipient_rule r ON r.stakeholder_id = s.id
     WHERE r.always_notify = TRUE
        OR r.problem_type = $1
        OR r.priority = $2`,
    [problemType, priority]
  );

  const stakeholderEmails = stakeholderResult.rows.map((s: { email: string }) => s.email);
  const allEmails = Array.from(new Set([...kvpEmails, ...stakeholderEmails]));

  return { kvpEmails, stakeholderEmails, allEmails };
}

export async function getAllStakeholders(): Promise<Stakeholder[]> {
  const pool = await getPool();
  const result = await pool.query('SELECT * FROM stakeholder ORDER BY role, name');
  return result.rows as Stakeholder[];
}
