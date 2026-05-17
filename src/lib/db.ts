import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/incident_hub',
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

let initialized = false;

export async function getPool(): Promise<Pool> {
  if (!initialized) {
    await initializeSchema();
    initialized = true;
  }
  return pool;
}

async function initializeSchema() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS incident_seq START 1;

      CREATE TABLE IF NOT EXISTS kvp (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        short_name TEXT NOT NULL,
        contact_email TEXT NOT NULL,
        contact_name TEXT,
        access_token TEXT UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS stakeholder (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('intern', 'support', 'management', 'technik')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS incident (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        affected_systems JSONB NOT NULL DEFAULT '[]',
        affected_processes JSONB NOT NULL DEFAULT '[]',
        is_warning BOOLEAN DEFAULT FALSE,
        priority TEXT NOT NULL CHECK(priority IN ('kritisch', 'hoch', 'mittel', 'niedrig')),
        status TEXT NOT NULL DEFAULT 'offen' CHECK(status IN (
          'offen', 'in Prüfung', 'Workaround', 'gelöst'
        )),
        start_time TIMESTAMPTZ NOT NULL,
        resolved_time TIMESTAMPTZ,
        root_cause TEXT,
        workaround_description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS incident_kvp (
        incident_id TEXT NOT NULL REFERENCES incident(id) ON DELETE CASCADE,
        kvp_id INTEGER NOT NULL REFERENCES kvp(id) ON DELETE CASCADE,
        PRIMARY KEY (incident_id, kvp_id)
      );

      CREATE TABLE IF NOT EXISTS incident_update (
        id SERIAL PRIMARY KEY,
        incident_id TEXT NOT NULL REFERENCES incident(id) ON DELETE CASCADE,
        update_type TEXT NOT NULL CHECK(update_type IN (
          'Erstmeldung', 'Zwischenupdate', 'Workaround', 'Entwarnung', 'Abschluss/RCA'
        )),
        message TEXT NOT NULL,
        created_by TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS email_log (
        id SERIAL PRIMARY KEY,
        incident_id TEXT NOT NULL REFERENCES incident(id) ON DELETE CASCADE,
        update_id INTEGER REFERENCES incident_update(id),
        email_type TEXT NOT NULL CHECK(email_type IN (
          'Erstmeldung', 'Zwischenupdate', 'Workaround', 'Entwarnung', 'Abschluss/RCA'
        )),
        recipients TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'gesendet' CHECK(status IN (
          'gesendet', 'fehlgeschlagen', 'entwurf'
        )),
        sent_at TIMESTAMPTZ DEFAULT NOW(),
        error_message TEXT
      );

      CREATE TABLE IF NOT EXISTS recipient_rule (
        id SERIAL PRIMARY KEY,
        problem_type TEXT,
        priority TEXT,
        stakeholder_id INTEGER REFERENCES stakeholder(id) ON DELETE CASCADE,
        always_notify BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS admin_user (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        session_token TEXT UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Seed-Daten nur wenn Tabellen leer
    const kvpCount = await client.query('SELECT COUNT(*)::int as count FROM kvp');
    if (kvpCount.rows[0].count === 0) {
      await client.query(`
        INSERT INTO kvp (name, short_name, contact_email, contact_name, access_token) VALUES
          ('KVP1', 'KVP1', 'kirill.tokmann@hansecom.com', 'Vorname Nachname', 'kvp1-token-2024'),
          ('KVP2', 'KVP2', 'kirill.tokmann@hansecom.com', 'Vorname Nachname', 'kvp2-token-2024')
      `);

      await client.query(`
        INSERT INTO stakeholder (name, email, role) VALUES
          ('IT-Betrieb', 'it-betrieb@unternehmen.local', 'intern'),
          ('Support-Team', 'support@unternehmen.local', 'support'),
          ('Technik-Leitung', 'technik@unternehmen.local', 'technik')
      `);

      await client.query(`
        INSERT INTO recipient_rule (problem_type, priority, stakeholder_id, always_notify) VALUES
          (NULL, NULL, 1, TRUE),
          (NULL, NULL, 2, TRUE),
          (NULL, 'kritisch', 3, FALSE)
      `);

      // Seed admin users
      const adminHash = await bcrypt.hash('admin123', 10);
      await client.query(
        `INSERT INTO admin_user (username, password_hash, display_name) VALUES ($1, $2, $3)`,
        ['admin', adminHash, 'Administrator']
      );
    }
  } finally {
    client.release();
  }
}
