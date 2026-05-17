'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Lang = 'de' | 'en';

type Dict = Record<string, { de: string; en: string }>;

export const dict: Dict = {
  // ─── Allgemein ───
  save: { de: 'Speichern', en: 'Save' },
  saving: { de: 'Speichert…', en: 'Saving…' },
  cancel: { de: 'Abbrechen', en: 'Cancel' },
  edit: { de: 'Bearbeiten', en: 'Edit' },
  delete: { de: 'Löschen', en: 'Delete' },
  create: { de: 'Anlegen', en: 'Create' },
  search: { de: 'Suche…', en: 'Search…' },
  loading: { de: 'Lade…', en: 'Loading…' },
  required: { de: 'Pflichtfeld', en: 'Required' },
  close: { de: 'Schließen', en: 'Close' },
  copy: { de: 'Kopieren', en: 'Copy' },
  copied: { de: 'Kopiert', en: 'Copied' },
  refresh: { de: 'Aktualisieren', en: 'Refresh' },
  yes: { de: 'Ja', en: 'Yes' },
  no: { de: 'Nein', en: 'No' },
  all: { de: 'Alle', en: 'All' },
  none: { de: 'Keine', en: 'None' },

  // ─── NavBar ───
  brand: { de: 'IncidentHub', en: 'IncidentHub' },
  navDashboard: { de: 'Dashboard', en: 'Dashboard' },
  navMaintenance: { de: 'Wartungen', en: 'Maintenance' },
  navManagement: { de: 'Verwaltung', en: 'Administration' },
  navKvps: { de: 'KVPs', en: 'Customers' },
  navAdmins: { de: 'Administratoren', en: 'Administrators' },
  navNewIncident: { de: '+ Neues Incident', en: '+ New Incident' },
  navCustomerPortal: { de: 'Kunden-Portal', en: 'Customer Portal' },
  navAdmin: { de: 'Admin', en: 'Admin' },
  navLogout: { de: 'Abmelden', en: 'Logout' },

  // ─── Dashboard ───
  dashboardTitle: { de: 'Dashboard', en: 'Dashboard' },
  welcome: { de: 'Willkommen', en: 'Welcome' },
  statTotal: { de: 'Gesamt', en: 'Total' },
  statCritical: { de: 'Kritisch', en: 'Critical' },
  statOpen: { de: 'Offen', en: 'Open' },
  statWorkaround: { de: 'Workaround', en: 'Workaround' },
  statResolved: { de: 'Gelöst', en: 'Resolved' },
  resolutionTime: { de: 'Lösungszeit', en: 'Resolution Time' },
  resolutionBasis: { de: 'Basis', en: 'Based on' },
  noResolved: { de: 'Noch keine gelösten Incidents für die Auswertung vorhanden.', en: 'No resolved incidents available for analysis yet.' },
  resAverage: { de: 'Ø Durchschnitt', en: 'Average' },
  resMedian: { de: 'Median', en: 'Median' },
  resFastest: { de: 'Schnellste', en: 'Fastest' },
  resLongest: { de: 'Längste', en: 'Longest' },
  byPriority: { de: 'Nach Priorität', en: 'By priority' },
  trend6m: { de: 'Trend (Ø pro Monat)', en: 'Trend (avg/month)' },
  prioCritical: { de: 'kritisch', en: 'critical' },
  prioHigh: { de: 'hoch', en: 'high' },
  prioMedium: { de: 'mittel', en: 'medium' },
  prioLow: { de: 'niedrig', en: 'low' },
  filterAll: { de: 'Alle', en: 'All' },
  filterOpen: { de: 'offen', en: 'open' },
  filterWorkaround: { de: 'Workaround', en: 'Workaround' },
  filterResolved: { de: 'gelöst', en: 'resolved' },
  loadIncidents: { de: 'Lade Incidents…', en: 'Loading incidents…' },
  noIncidents: { de: 'Keine Incidents gefunden', en: 'No incidents found' },
  firstIncident: { de: 'Erstes Incident anlegen', en: 'Create first incident' },
  chartTitle12m: { de: 'Incident-Verlauf (12 Monate)', en: 'Incident history (12 months)' },
  chartZoomHint: { de: 'Klick auf Monat zum Reinzoomen', en: 'Click a month to zoom in' },
  chartTotal: { de: 'gesamt', en: 'total' },
  back: { de: 'Zurück', en: 'Back' },

  // ─── KVPs ───
  kvpTitle: { de: 'KVP-Verwaltung', en: 'Customer Management' },
  kvpSubtitle: { de: 'Produkt-Tags klickbar zum Zuordnen.', en: 'Click product tags to assign.' },
  kvpNew: { de: 'Neuer KVP', en: 'New customer' },
  kvpNoneYet: { de: 'Noch keine KVPs angelegt.', en: 'No customers created yet.' },
  kvpWithoutProduct: { de: 'Ohne Produkt', en: 'Without product' },
  kvpFieldName: { de: 'Name', en: 'Name' },
  kvpFieldShort: { de: 'Kürzel', en: 'Short name' },
  kvpFieldRegion: { de: 'Region', en: 'Region' },
  kvpFieldEmail: { de: 'E-Mail(s)', en: 'Email(s)' },
  kvpEmailHint: { de: 'Mehrere E-Mails mit Komma trennen.', en: 'Separate multiple emails with commas.' },
  kvpFieldContact: { de: 'Ansprechpartner', en: 'Contact person' },
  kvpFieldProducts: { de: 'Produkte', en: 'Products' },
  kvpProductsHint: { de: 'Ordne den KVP allen Produkten zu, die er nutzt. Ein KVP kann mehrere Produkte haben.', en: 'Assign all products the customer uses. A customer can have multiple products.' },
  kvpEditTitle: { de: 'KVP bearbeiten', en: 'Edit customer' },
  kvpCreateTitle: { de: 'Neuen KVP anlegen', en: 'Create new customer' },
  kvpRequiredHint: { de: 'Name, Kürzel und E-Mail sind Pflichtfelder.', en: 'Name, short name and email are required.' },
  kvpToken: { de: 'Token', en: 'Token' },
  kvpTokenLabel: { de: 'Kunden-Zugangstoken:', en: 'Customer access token:' },
  kvpTokenNone: { de: 'Kein Token gesetzt', en: 'No token set' },
  kvpTokenRegenerate: { de: 'Neu generieren', en: 'Regenerate' },
  kvpTokenCreate: { de: 'Erstellen', en: 'Create' },
  kvpConfirmDelete: { de: 'KVP "{name}" wirklich löschen?', en: 'Really delete customer "{name}"?' },

  // ─── Wartungen ───
  maintTitle: { de: 'Wartungen', en: 'Maintenance' },
  maintSubtitle: { de: 'Mindestvorlauf {days} Tage.', en: 'Minimum lead time {days} days.' },
  maintNew: { de: 'Neue Wartung', en: 'New maintenance' },
  maintNoneYet: { de: 'Noch keine Wartungen geplant.', en: 'No maintenance scheduled yet.' },
  maintCreateTitle: { de: 'Neue Wartung anlegen', en: 'Create new maintenance' },
  maintEarliestStart: { de: 'Frühestmöglicher Start:', en: 'Earliest possible start:' },
  maintFieldStart: { de: 'Beginn', en: 'Start' },
  maintFieldEnd: { de: 'Ende', en: 'End' },
  maintFieldSystems: { de: 'Betroffene Systeme', en: 'Affected systems' },
  maintFieldProcesses: { de: 'Betroffene Prozesse', en: 'Affected processes' },
  maintFieldImpact: { de: 'Erwartete Auswirkung', en: 'Expected impact' },
  maintImpactPlaceholder: { de: 'z.B. Ticketkauf während des Fensters nicht möglich', en: 'e.g. Ticket purchase not available during the window' },
  maintFieldDescription: { de: 'Beschreibung', en: 'Description' },
  maintFieldKvps: { de: 'Betroffene KVPs', en: 'Affected customers' },
  maintCreateBtn: { de: 'Wartung anlegen', en: 'Create maintenance' },
  maintLeadError: { de: 'Wartungen müssen mind. {days} Tage im Voraus geplant werden. Frühestens: {earliest}.', en: 'Maintenance must be scheduled at least {days} days in advance. Earliest: {earliest}.' },
  maintEndAfterStart: { de: 'Endzeit muss nach der Startzeit liegen.', en: 'End time must be after start time.' },
  maintReqFields: { de: 'Titel, mindestens ein System, Start- und Endzeit sind Pflicht.', en: 'Title, at least one system, start and end time are required.' },
  maintStatusGeplant: { de: 'geplant', en: 'planned' },
  maintStatusLaeuft: { de: 'läuft', en: 'running' },
  maintStatusAbgeschlossen: { de: 'abgeschlossen', en: 'completed' },
  maintStatusAbgesagt: { de: 'abgesagt', en: 'cancelled' },
  maintEmailBtn: { de: 'E-Mail', en: 'Email' },
  maintEmailTitle: { de: 'Wartungs-E-Mail', en: 'Maintenance email' },
  maintEmailSubtitle: { de: 'Vorlage für {id} – {title} · alle Empfänger werden per BCC angeschrieben.', en: 'Template for {id} – {title} · all recipients are sent via BCC.' },
  maintEmailKvpLabel: { de: 'Empfänger-KVPs', en: 'Recipient customers' },
  maintEmailExtra: { de: 'Zusätzliche Empfänger (optional)', en: 'Additional recipients (optional)' },
  maintEmailExtraHint: { de: 'Komma-getrennt. Werden zusätzlich zu den ausgewählten KVPs in BCC aufgenommen.', en: 'Comma-separated. Added to BCC alongside selected customers.' },
  maintEmailSendInfo: { de: 'Versand an {n} Empfänger via BCC · keine Adressen für Kunden sichtbar.', en: 'Sending to {n} recipients via BCC · no addresses visible to customers.' },
  maintEmailSubject: { de: 'Betreff', en: 'Subject' },
  maintEmailBody: { de: 'Inhalt', en: 'Body' },
  maintEmailSend: { de: 'Jetzt versenden', en: 'Send now' },
  maintEmailSending: { de: 'Sendet…', en: 'Sending…' },
  maintEmailSent: { de: 'E-Mail erfolgreich versendet.', en: 'Email sent successfully.' },
  maintEmailCopied: { de: 'In Zwischenablage kopiert.', en: 'Copied to clipboard.' },

  // ─── Administratoren ───
  adminUsersTitle: { de: 'Administratoren', en: 'Administrators' },
  adminUsersSubtitle: { de: 'Zugänge fürs Operations-Team verwalten.', en: 'Manage access for the operations team.' },
  adminUsersNew: { de: 'Neuer Admin', en: 'New admin' },
  adminUsersCreateTitle: { de: 'Neuen Admin anlegen', en: 'Create new admin' },
  adminUsersDisplayName: { de: 'Anzeigename', en: 'Display name' },
  adminUsersUsername: { de: 'Benutzername', en: 'Username' },
  adminUsersPassword: { de: 'Passwort', en: 'Password' },
  adminUsersNewPassword: { de: 'Neues Passwort', en: 'New password' },
  adminUsersPasswordHint: { de: 'Mindestens 8 Zeichen', en: 'At least 8 characters' },
  adminUsersLeaveBlank: { de: 'Leer lassen zum Beibehalten', en: 'Leave blank to keep current' },
  adminUsersSelfLogoutHint: { de: 'Bei Passwortänderung wirst du abgemeldet.', en: 'You will be logged out after changing the password.' },
  adminUsersSelfTag: { de: 'Du', en: 'You' },
  adminUsersCreatedOn: { de: 'Angelegt am', en: 'Created' },
  adminUsersEditTitle: { de: '{name} bearbeiten', en: 'Edit {name}' },
  adminUsersAllRequired: { de: 'Alle Felder sind Pflicht.', en: 'All fields are required.' },
  adminUsersMin8: { de: 'Passwort muss mindestens 8 Zeichen lang sein.', en: 'Password must be at least 8 characters.' },

  // ─── Login ───
  loginAdminTitle: { de: 'Admin-Anmeldung', en: 'Admin Login' },
  loginUsername: { de: 'Benutzername', en: 'Username' },
  loginPassword: { de: 'Passwort', en: 'Password' },
  loginSubmit: { de: 'Anmelden', en: 'Sign in' },
  loginChecking: { de: 'Prüfe…', en: 'Checking…' },
  loginBadCredentials: { de: 'Ungültige Anmeldedaten', en: 'Invalid credentials' },

  // ─── Statusseite (Kunden) ───
  statusTitle: { de: 'System-Status', en: 'System status' },
  statusOk: { de: 'Alle Systeme betriebsbereit', en: 'All systems operational' },
  statusActive: { de: '{n} aktive Störung', en: '{n} active incident' },
  statusActivePlural: { de: '{n} aktive Störungen', en: '{n} active incidents' },
  statusPlannedMaint: { de: 'Geplante Wartungen', en: 'Scheduled maintenance' },
  statusCurrentIncidents: { de: 'Aktuelle Störungen', en: 'Current incidents' },
  statusRecentResolved: { de: 'Kürzlich gelöste Störungen', en: 'Recently resolved incidents' },
  statusIncident: { de: 'Störung', en: 'Incident' },
  statusLimitation: { de: 'Einschränkung', en: 'Limitation' },
  statusRunning: { de: 'läuft', en: 'running' },
  statusPlanned: { de: 'geplant', en: 'planned' },
  statusImpact: { de: 'Auswirkung:', en: 'Impact:' },
  statusPeriod: { de: 'Zeitraum:', en: 'Period:' },
  statusSince: { de: 'seit', en: 'since' },
  statusResolved: { de: 'Gelöst', en: 'Resolved' },
  statusDuration: { de: 'Dauer', en: 'Duration' },
  statusDescription: { de: 'Beschreibung', en: 'Description' },
  statusWorkaround: { de: 'Workaround', en: 'Workaround' },
  statusLatestUpdate: { de: 'Letztes Update', en: 'Latest update' },
  statusTokenTitle: { de: 'Kunden-Portal', en: 'Customer portal' },
  statusTokenLabel: { de: 'Ihr Zugangstoken', en: 'Your access token' },
  statusTokenHint: { de: 'Ihren Zugangstoken erhalten Sie von Ihrem Ansprechpartner.', en: 'You receive your access token from your contact person.' },

  // ─── Incident-Formular ───
  incNewTitle: { de: 'Neues Incident anlegen', en: 'Create new incident' },
  incSubtitle: { de: 'Störung erfassen → Betroffene Systeme/Prozesse auswählen → KVPs benachrichtigen', en: 'Capture incident → select affected systems/processes → notify customers' },
  incInfoSection: { de: 'Störungsinformationen', en: 'Incident details' },
  incFieldTitle: { de: 'Titel', en: 'Title' },
  incTitlePlaceholder: { de: 'z.B. Payment-System nicht erreichbar', en: 'e.g. Payment system unreachable' },
  incFieldDescription: { de: 'Beschreibung', en: 'Description' },
  incDescPlaceholder: { de: 'Detaillierte Beschreibung der Störung…', en: 'Detailed description of the incident…' },
  incFieldStart: { de: 'Startzeit', en: 'Start time' },
  incSection2: { de: 'Betroffene Systeme', en: 'Affected systems' },
  incSection3: { de: 'Betroffene Prozesse', en: 'Affected processes' },
  incSection4: { de: 'Wer ist betroffen? (KVPs)', en: 'Who is affected? (Customers)' },
  incWarningLabel: { de: 'Einschränkung – kein Totalausfall, Funktionalität nur teilweise betroffen', en: 'Limitation – not a full outage, partial functionality affected' },
  incKvpHint: { de: 'KVPs sind nach Produkt gruppiert. E-Mails sind bereits hinterlegt — Bleistift-Symbol zum dauerhaften Ändern.', en: 'Customers are grouped by product. Emails are already on file — pencil icon to edit permanently.' },
  incSelectAllIn: { de: 'Alle in {product} wählen', en: 'Select all in {product}' },
  incNoKvps: { de: 'Noch keine KVPs angelegt.', en: 'No customers created yet.' },
  incCreateNow: { de: 'Jetzt anlegen', en: 'Create now' },
  incRecipientPreview: { de: 'Empfänger-Vorschau', en: 'Recipient preview' },
  incSubmit: { de: 'Incident anlegen & Kunden benachrichtigen', en: 'Create incident & notify customers' },
  incSubmitting: { de: 'Wird erstellt…', en: 'Creating…' },
  incFillRequired: { de: 'Bitte alle Pflichtfelder ausfüllen', en: 'Please fill all required fields' },
  incManage: { de: 'Verwalten', en: 'Manage' },

  // ─── Dashboard zusätzlich ───
  piecesShort: { de: 'Stk.', en: 'pcs' },
  medianShort: { de: 'Med.', en: 'Med.' },
  limitationShort: { de: 'Einschr.', en: 'Limited' },
};

const I18nContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: 'de',
  setLang: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('de');

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('lang') : null;
    if (stored === 'en' || stored === 'de') setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== 'undefined') window.localStorage.setItem('lang', l);
  };

  return <I18nContext.Provider value={{ lang, setLang }}>{children}</I18nContext.Provider>;
}

export function useT() {
  const { lang, setLang } = useContext(I18nContext);
  const t = (key: keyof typeof dict, vars?: Record<string, string | number>) => {
    let value = dict[key]?.[lang] ?? String(key);
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return value;
  };
  return { t, lang, setLang };
}
