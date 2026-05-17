import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.example.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });
  }
  return transporter;
}

export async function sendEmail(
  recipients: string[],
  subject: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const t = getTransporter();
    const from = process.env.SMTP_FROM || '"Operations-Team" <incident@example.com>';
    // Alle Empfänger gehen in BCC — Kunden sehen keine anderen Adressen.
    // "to" zeigt auf den Absender selbst, damit die Mail einen sichtbaren Empfänger hat.
    await t.sendMail({
      from,
      to: from,
      bcc: recipients.join(', '),
      subject,
      text: body,
    });
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    console.error('E-Mail-Versand fehlgeschlagen:', message);
    return { success: false, error: message };
  }
}
