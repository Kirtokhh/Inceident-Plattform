export interface KVP {
  id: number;
  name: string;
  short_name: string;
  contact_email: string;
  contact_name: string | null;
  region: string | null;
  products: string[];
  access_token: string | null;
}

export const PRODUCTS = ['HTD', 'MaaS', 'Deutschlandticket'] as const;
export type Product = typeof PRODUCTS[number];

export interface Stakeholder {
  id: number;
  name: string;
  email: string;
  role: 'intern' | 'support' | 'management' | 'technik';
}

export const AFFECTED_SYSTEMS = [
  'All customers',
  'HTD (inkl. Lib)',
  'MaaS-Apps (inkl. DT)',
  'Deutschlandticket App',
] as const;

export const AFFECTED_PROCESSES = [
  'Bezahlsystem',
  'Fahrplanauskunft und Abfahrtsmonitor (inkl. Live-Daten)',
  'Login und Registrierung',
  'Push-Mitteilungen',
  'Ticketkauf',
  'Ticketanzeige',
  'Service- und Kundenportal',
  'Deutschlandticket Serviceportal (NM-Abo Serviceportal)',
  'Noch unklar',
] as const;

export type AffectedSystem = typeof AFFECTED_SYSTEMS[number];
export type AffectedProcess = typeof AFFECTED_PROCESSES[number];
export type Priority = 'kritisch' | 'hoch' | 'mittel' | 'niedrig';
export type IncidentStatus = 'offen' | 'in Prüfung' | 'Workaround' | 'gelöst';
export type EmailType = 'Erstmeldung' | 'Zwischenupdate' | 'Workaround' | 'Abschluss/RCA';

export interface Incident {
  id: string;
  title: string;
  description: string | null;
  affected_systems: string[];
  affected_processes: string[];
  is_warning: boolean;
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
  problem_type: string | null;
  priority: Priority | null;
  stakeholder_id: number;
  always_notify: boolean;
}

export interface CreateIncidentRequest {
  title: string;
  description?: string;
  affected_systems: string[];
  affected_processes: string[];
  is_warning?: boolean;
  priority: Priority;
  start_time: string;
  kvp_ids: number[];
}

export type MaintenanceStatus = 'geplant' | 'läuft' | 'abgeschlossen' | 'abgesagt';

export interface Maintenance {
  id: string;
  title: string;
  description: string | null;
  affected_systems: string[];
  affected_processes: string[];
  expected_impact: string | null;
  start_time: string;
  end_time: string;
  status: MaintenanceStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceWithKVPs extends Maintenance {
  kvps: KVP[];
}

export interface CreateMaintenanceRequest {
  title: string;
  description?: string;
  affected_systems: string[];
  affected_processes: string[];
  expected_impact?: string;
  start_time: string;
  end_time: string;
  created_by?: string;
  kvp_ids: number[];
}

export const MAINTENANCE_MIN_LEAD_DAYS = 14;

export interface CreateUpdateRequest {
  update_type: EmailType;
  message: string;
  created_by?: string;
  send_email: boolean;
}
