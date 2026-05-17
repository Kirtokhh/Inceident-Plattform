export interface KVP {
  id: number;
  name: string;
  short_name: string;
  contact_email: string;
  contact_name: string | null;
  region: string | null;
}

export interface Stakeholder {
  id: number;
  name: string;
  email: string;
  role: 'intern' | 'support' | 'management' | 'technik';
}

export type Product = 'Deutschlandticket' | 'EinzelTicket' | 'Zeitkarte' | 'Abo' | 'Sonstiges';
export type ProblemType = 'Payment' | 'Ticketanzeige' | 'Login' | 'Tarif' | 'Backend' | 'Reporting';
export type Priority = 'kritisch' | 'hoch' | 'mittel' | 'niedrig';
export type IncidentStatus = 'offen' | 'in Prüfung' | 'Workaround' | 'gelöst';
export type EmailType = 'Erstmeldung' | 'Zwischenupdate' | 'Workaround' | 'Entwarnung' | 'Abschluss/RCA';

export interface Incident {
  id: string;
  title: string;
  description: string | null;
  affected_app: string;
  product: Product;
  problem_type: ProblemType;
  priority: Priority;
  status: IncidentStatus;
  start_time: string;
  resolved_time: string | null;
  root_cause: string | null;
  workaround_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncidentWithKVPs extends Incident {
  kvps: KVP[];
}

export interface IncidentUpdate {
  id: number;
  incident_id: string;
  update_type: EmailType;
  message: string;
  created_by: string | null;
  created_at: string;
}

export interface EmailLog {
  id: number;
  incident_id: string;
  update_id: number | null;
  email_type: EmailType;
  recipients: string;
  subject: string;
  body: string;
  status: 'gesendet' | 'fehlgeschlagen' | 'entwurf';
  sent_at: string;
  error_message: string | null;
}

export interface RecipientRule {
  id: number;
  problem_type: ProblemType | null;
  priority: Priority | null;
  stakeholder_id: number;
  always_notify: boolean;
}

export interface CreateIncidentRequest {
  title: string;
  description?: string;
  affected_app: string;
  product: Product;
  problem_type: ProblemType;
  priority: Priority;
  start_time: string;
  kvp_ids: number[];
}

export interface CreateUpdateRequest {
  update_type: EmailType;
  message: string;
  created_by?: string;
  send_email: boolean;
}
