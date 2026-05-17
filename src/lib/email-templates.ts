import { Incident, KVP, EmailType } from './types';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function priorityLabel(p: string): string {
  const colors: Record<string, string> = {
    kritisch: '🔴 KRITISCH',
    hoch: '🟠 HOCH',
    mittel: '🟡 MITTEL',
    niedrig: '🟢 NIEDRIG',
  };
  return colors[p] || p;
}

export function generateEmailSubject(incident: Incident, emailType: EmailType): string {
  const prefix: Record<EmailType, string> = {
    'Erstmeldung': '⚠️ [STÖRUNG]',
    'Zwischenupdate': '🔄 [UPDATE]',
    'Workaround': '🔧 [WORKAROUND]',
    'Entwarnung': '✅ [ENTWARNUNG]',
    'Abschluss/RCA': '📋 [ABSCHLUSS/RCA]',
  };
  return `${prefix[emailType]} ${incident.id} – ${incident.title} (${incident.affected_app})`;
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
Betroffene App: ${incident.affected_app}
Produkt:        ${incident.product}
Problemtyp:     ${incident.problem_type}
Priorität:      ${priorityLabel(incident.priority)}
Status:         ${incident.status}
Beginn:         ${formatDateTime(incident.start_time)}

Betroffene KVP/Verkehrsunternehmen:
${kvpList}

Beschreibung:
${incident.description || 'Keine weitere Beschreibung vorhanden.'}

${updateMessage ? `Zusätzliche Information:\n${updateMessage}` : ''}

Wir informieren Sie über den weiteren Verlauf.

Mit freundlichen Grüßen
TransitIncidentHub
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
Betroffene App: ${incident.affected_app}
Priorität:      ${priorityLabel(incident.priority)}
Status:         ${incident.status}

Update:
${updateMessage}

Betroffene KVP/Verkehrsunternehmen:
${kvpList}

Wir halten Sie weiterhin auf dem Laufenden.

Mit freundlichen Grüßen
TransitIncidentHub
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
Betroffene App: ${incident.affected_app}
Priorität:      ${priorityLabel(incident.priority)}
Status:         Workaround

Workaround-Beschreibung:
${updateMessage}

${incident.workaround_description ? `Detaillierte Anleitung:\n${incident.workaround_description}` : ''}

Betroffene KVP/Verkehrsunternehmen:
${kvpList}

Die Ursache wird weiterhin untersucht. Eine endgültige Lösung folgt.

Mit freundlichen Grüßen
TransitIncidentHub
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

    case 'Entwarnung':
      return `
Sehr geehrte Damen und Herren,

wir können Entwarnung geben – die Störung wurde behoben:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENTWARNUNG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Incident-ID:    ${incident.id}
Titel:          ${incident.title}
Betroffene App: ${incident.affected_app}
Status:         Gelöst
Beginn:         ${formatDateTime(incident.start_time)}
${incident.resolved_time ? `Gelöst um:      ${formatDateTime(incident.resolved_time)}` : ''}

Lösung:
${updateMessage}

Betroffene KVP/Verkehrsunternehmen:
${kvpList}

Vielen Dank für Ihr Verständnis.

Mit freundlichen Grüßen
TransitIncidentHub
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

    case 'Abschluss/RCA':
      return `
Sehr geehrte Damen und Herren,

anbei der Abschlussbericht und die Root-Cause-Analyse (RCA):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ABSCHLUSSBERICHT / ROOT-CAUSE-ANALYSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Incident-ID:    ${incident.id}
Titel:          ${incident.title}
Betroffene App: ${incident.affected_app}
Produkt:        ${incident.product}
Problemtyp:     ${incident.problem_type}
Beginn:         ${formatDateTime(incident.start_time)}
${incident.resolved_time ? `Gelöst um:      ${formatDateTime(incident.resolved_time)}` : ''}

Root Cause:
${incident.root_cause || 'Wird noch untersucht.'}

Zusammenfassung:
${updateMessage}

Betroffene KVP/Verkehrsunternehmen:
${kvpList}

Maßnahmen zur Vermeidung werden eingeleitet.

Mit freundlichen Grüßen
TransitIncidentHub
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

    default:
      return updateMessage;
  }
}
