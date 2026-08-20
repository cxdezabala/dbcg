// Notificación por email cuando un lead confirma una reunión en Telos.
// Vía Resend, llamado directo por fetch (sin SDK, sin dependencia nueva).
// Requiere RESEND_API_KEY en variables de entorno; si no está configurada,
// no envía nada y no rompe el flujo que la llama (mismo patrón defensivo
// que el resto de api/_lib).

const FROM = process.env.TELOS_NOTIFY_FROM || 'Telos <onboarding@resend.dev>';
const TO = process.env.TELOS_NOTIFY_TO || 'constantino.dezabala@gmail.com';

function pad(n) { return String(n).padStart(2, '0'); }

// dateISO: 'YYYY-MM-DD', time: 'HH:MM'. Hora "flotante" (sin zona horaria
// explícita): es el horario que la persona eligió en el calendario de
// Telos, tal cual como lo eligió.
function icsFor({ uid, title, description, dateISO, time, durationMinutes = 30 }) {
  const [y, m, d] = dateISO.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const start = new Date(y, m - 1, d, hh, mm);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  const stamp = dt => dt.getFullYear() + pad(dt.getMonth() + 1) + pad(dt.getDate()) + 'T' + pad(dt.getHours()) + pad(dt.getMinutes()) + '00';
  const esc = s => String(s || '').replace(/[\\;,]/g, c => '\\' + c).replace(/\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Telos//DBCG//ES', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:' + uid + '@telos.dbcg.es',
    'DTSTAMP:' + stamp(new Date()),
    'DTSTART:' + stamp(start),
    'DTEND:' + stamp(end),
    'SUMMARY:' + esc(title),
    'DESCRIPTION:' + esc(description),
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
}

function money(n) { return n == null ? '—' : '$' + Math.round(n).toLocaleString('en-US'); }

function buildNotification(lead) {
  const edu = lead.scenario_type === 'education';
  // share_consent llega explícito en false cuando la persona pidió reunión
  // sin compartir su escenario ("Agendar sin compartirlo") -- en ese caso no
  // hay ninguna cifra que mostrar, y el correo debe decirlo así de claro en
  // vez de aparentar datos con guiones.
  const noScenario = lead.share_consent === false;
  const lines = [
    noScenario
      ? 'Nueva reunión agendada en Telos -- SIN escenario compartido.'
      : 'Nuevo escenario compartido y reunión agendada en Telos.',
    '',
    'Lead: ' + (lead.name || '—'),
    'Contacto: ' + (lead.contact || '—'),
    'País: ' + (lead.country || '—'),
    'Tipo: ' + (edu ? 'Educación' : 'Retiro'),
    'Scenario ID: ' + lead.scenario_id,
    '',
    noScenario
      ? 'Esta persona decidió no compartir su escenario -- no hay edad, aportación ni proyección disponibles. Solo consintió compartir su nombre y contacto para coordinar la reunión.'
      : (edu
        ? 'Edad del hijo: ' + (lead.child_age ?? '—') + ' · Tu edad (padre): ' + (lead.parent_age ?? '—')
        : 'Edad actual: ' + (lead.current_age ?? '—') + ' · Edad objetivo: ' + (lead.target_retirement_age ?? '—')),
    noScenario ? null : 'Aportación anual: ' + money(lead.annual_contribution),
    noScenario ? null : 'Referencia al 3%: ' + money(lead.benchmark_future_value),
    '',
    'Reunión: ' + lead.meeting_date + ' a las ' + lead.meeting_time,
    lead.advisorUrl ? '' : null,
    lead.advisorUrl ? 'Abrir en Telos Advisor: ' + lead.advisorUrl : null
  ].filter(l => l !== null);

  const ics = icsFor({
    uid: lead.scenario_id,
    title: 'Telos · ' + (lead.name || 'Reunión') + ' (' + (edu ? 'Educación' : 'Retiro') + ')',
    description: lines.join('\n'),
    dateISO: lead.meeting_date, time: lead.meeting_time
  });

  return {
    from: FROM, to: [TO],
    subject: (noScenario ? 'Nueva reunión (sin escenario) — ' : 'Nueva reunión agendada — ') + (lead.name || lead.scenario_id) + ' · Telos',
    text: lines.join('\n'),
    attachments: [{ filename: 'reunion-telos.ics', content: Buffer.from(ics).toString('base64') }]
  };
}

async function sendMeetingNotification(lead) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error('[telos] RESEND_API_KEY no configurada -- no se envía notificación de reunión');
    return false;
  }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify(buildNotification(lead))
    });
    if (!r.ok) {
      console.error('[telos] Resend respondió con error', r.status, await r.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('[telos] Envío por Resend falló', err);
    return false;
  }
}

module.exports = { sendMeetingNotification, buildNotification, icsFor };
