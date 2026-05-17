import { Incident, KVP, EmailType, Maintenance } from './types';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatSystems(incident: Incident): string {
  const systems = Array.isArray(incident.affected_systems) ? incident.affected_systems : [];
  return systems.map(s => `  • ${s}`).join('\n') || '  • Keine Angabe';
}

function formatProcesses(incident: Incident): string {
  const processes = Array.isArray(incident.affected_processes) ? incident.affected_processes : [];
  return processes.map(p => `  • ${p}`).join('\n') || '  • Keine Angabe';
}

export function generateEmailSubject(incident: Incident, emailType: EmailType): string {
  const prefix: Record<EmailType, string> = {
    'Erstmeldung': '[STÖRUNG]',
    'Zwischenupdate': '[UPDATE]',
    'Workaround': '[WORKAROUND]',
    'Abschluss/RCA': '[GELÖST]',
  };
  const systems = Array.isArray(incident.affected_systems) ? incident.affected_systems : [];
  return `${prefix[emailType]} ${incident.id} – ${incident.title} (${systems[0] || 'System'})`;
}

export function generateEmailBody(
  incident: Incident,
  kvps: KVP[],
  emailType: EmailType,
  updateMessage: string
): string {
  const kvpList = kvps.map(k => `  • ${k.name} (${k.short_name})`).join('\n');

  switch (emailType) {
    case 'Erstmeldung':
      return `
Sehr geehrte Damen und Herren,

hiermit informieren wir Sie über eine aktuelle Störung:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STÖRUNGSMELDUNG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Incident-ID:    ${incident.id}
Titel:          ${incident.title}
Status:         ${incident.status}
Beginn:         ${formatDateTime(incident.start_time)}
${incident.is_warning ? 'Hinweis: Eingeschränkte Funktionalität (kein Totalausfall)' : ''}

Betroffene Systeme:
${formatSystems(incident)}

Betroffene Prozesse:
${formatProcesses(incident)}

Betroffene KVP/Verkehrsunternehmen:
${kvpList}

Beschreibung:
${incident.description || 'Keine weitere Beschreibung vorhanden.'}

${updateMessage ? `Zusätzliche Information:\n${updateMessage}` : ''}

Wir informieren Sie über den weiteren Verlauf.

Mit freundlichen Grüßen
Ihr Operations-Team
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

    case 'Zwischenupdate':
      return `
Sehr geehrte Damen und Herren,

es gibt ein Update zur laufenden Störung:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ZWISCHENUPDATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Incident-ID:    ${incident.id}
Titel:          ${incident.title}
Status:         ${incident.status}

Update:
${updateMessage}

Betroffene Systeme:
${formatSystems(incident)}

Betroffene KVP/Verkehrsunternehmen:
${kvpList}

Wir halten Sie weiterhin auf dem Laufenden.

Mit freundlichen Grüßen
Ihr Operations-Team
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

    case 'Workaround':
      return `
Sehr geehrte Damen und Herren,

für die folgende Störung steht ein Workaround zur Verfügung:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WORKAROUND VERFÜGBAR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Incident-ID:    ${incident.id}
Titel:          ${incident.title}
Status:         Workaround

Workaround-Beschreibung:
${updateMessage}

${incident.workaround_description ? `Detaillierte Anleitung:\n${incident.workaround_description}` : ''}

Betroffene Systeme:
${formatSystems(incident)}

Betroffene KVP/Verkehrsunternehmen:
${kvpList}

Die Ursache wird weiterhin untersucht. Eine endgültige Lösung folgt.

Mit freundlichen Grüßen
Ihr Operations-Team
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

    case 'Abschluss/RCA':
      return `
Sehr geehrte Damen und Herren,

die Störung wurde behoben. Anbei der Abschlussbericht inklusive Root-Cause-Analyse:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STÖRUNG GELÖST – ABSCHLUSSBERICHT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Incident-ID:    ${incident.id}
Titel:          ${incident.title}
Status:         Gelöst
Beginn:         ${formatDateTime(incident.start_time)}
${incident.resolved_time ? `Gelöst um:      ${formatDateTime(incident.resolved_time)}` : ''}

Betroffene Systeme:
${formatSystems(incident)}

Betroffene Prozesse:
${formatProcesses(incident)}

Root Cause:
${incident.root_cause || 'Wird noch untersucht.'}

Zusammenfassung / Lösung:
${updateMessage}

Betroffene KVP/Verkehrsunternehmen:
${kvpList}

Maßnahmen zur Vermeidung werden eingeleitet. Vielen Dank für Ihr Verständnis.

Mit freundlichen Grüßen
Ihr Operations-Team
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

    default:
      return updateMessage;
  }
}

export function generateMaintenanceSubject(m: Maintenance): string {
  const systems = Array.isArray(m.affected_systems) ? m.affected_systems : [];
  return `[WARTUNGSANKÜNDIGUNG] ${m.id} – ${m.title} (${systems[0] || 'System'})`;
}

export function generateMaintenanceBody(m: Maintenance, kvps: KVP[]): string {
  const systems = (Array.isArray(m.affected_systems) ? m.affected_systems : []).map(s => `  • ${s}`).join('\n') || '  • Keine Angabe';
  const processes = (Array.isArray(m.affected_processes) ? m.affected_processes : []).map(p => `  • ${p}`).join('\n');
  const kvpList = kvps.map(k => `  • ${k.name} (${k.short_name})`).join('\n');

  return `
Sehr geehrte Damen und Herren,

wir möchten Sie über eine geplante Wartung informieren:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WARTUNGSANKÜNDIGUNG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Wartungs-ID:    ${m.id}
Titel:          ${m.title}
Beginn:         ${formatDateTime(m.start_time)}
Ende:           ${formatDateTime(m.end_time)}

Betroffene Systeme:
${systems}
${processes ? `\nBetroffene Prozesse:\n${processes}\n` : ''}
${m.expected_impact ? `Erwartete Auswirkung:\n${m.expected_impact}\n` : ''}
${m.description ? `Beschreibung:\n${m.description}\n` : ''}
${kvpList ? `Betroffene KVP/Verkehrsunternehmen:\n${kvpList}\n` : ''}
Wir bitten um Ihr Verständnis für die wartungsbedingten Einschränkungen.
Bei Rückfragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen
Ihr Operations-Team
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
}
