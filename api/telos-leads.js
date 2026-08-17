// Leads del Telos Advisor, consolidado en una sola función (el plan Hobby de
// Vercel limita a 12 Serverless Functions por despliegue). Antes eran tres
// archivos separados (telos-leads.js, telos-lead-status.js,
// telos-scenario.js); ahora es un único recurso "leads" con verbos HTTP:
//   GET   -> lista todos los leads, requiere sesión (asesor)
//   POST  -> crea/actualiza un lead desde un escenario compartido en Telos,
//            SIN sesión a propósito -- es la única puerta de entrada de
//            datos desde el público (telos.html). Se llama dos veces con el
//            mismo scenario_id: al compartir y al confirmar la reunión.
//   PATCH -> actualiza estado/notas de un lead existente, requiere sesión
// Los datos de leads nunca viven en el HTML: sin sesión válida, GET y PATCH
// no devuelven ni tocan nada (TELOS-DEPLOY.md §4).

const { getSession } = require('./_lib/session');
const { listLeads, upsertLead, updateLeadFields } = require('./_lib/telos-leads-kv');
const { sendMeetingNotification } = require('./_lib/telos-email');

const ALLOWED_TYPES = new Set(['retirement', 'education']);
const ALLOWED_STATES = new Set(['Nueva reunión', 'Preparado', 'Completado']);
const MAX_FIELD_LEN = 2000;

function sanitize(value) {
  if (typeof value === 'string') return value.slice(0, MAX_FIELD_LEN);
  if (Array.isArray(value)) return value.slice(0, 50).map(sanitize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value).slice(0, 60)) out[k] = sanitize(value[k]);
    return out;
  }
  return value;
}

async function handleGet(req, res) {
  if (!getSession(req)) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }
  const leads = await listLeads();
  res.status(200).json({ leads });
}

async function handlePost(req, res) {
  const body = req.body || {};
  const scenarioId = typeof body.scenario_id === 'string' ? body.scenario_id.trim().slice(0, 64) : '';
  const scenarioType = body.scenario_type;
  if (!scenarioId || !/^TL-[RE]-\d+$/.test(scenarioId) || !ALLOWED_TYPES.has(scenarioType)) {
    res.status(400).json({ error: 'scenario_id (formato TL-R-##### / TL-E-#####) y scenario_type (retirement|education) son obligatorios' });
    return;
  }

  // `state` lo controla solo el asesor (verbo PATCH); nunca se acepta del público.
  const { state, ...rest } = body;
  const saved = await upsertLead(scenarioId, sanitize(rest));
  if (!saved) {
    res.status(503).json({ error: 'Almacenamiento no disponible en este momento' });
    return;
  }

  // La confirmación de reunión llega como una segunda llamada POST al mismo
  // scenario_id, ya con meeting_date/meeting_time. Se notifica por email
  // antes de responder: en serverless no hay garantía de ejecución tras el
  // flush de la respuesta HTTP.
  if (rest.meeting_date && rest.meeting_time) {
    const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
    const advisorUrl = proto + '://' + req.headers.host + '/telos/advisor';
    await sendMeetingNotification({ ...saved, advisorUrl }).catch(err => {
      console.error('[telos] notificación de reunión falló', err);
    });
  }

  res.status(200).json({ ok: true });
}

async function handlePatch(req, res) {
  if (!getSession(req)) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }

  const { scenario_id, state, notes } = req.body || {};
  if (typeof scenario_id !== 'string' || !scenario_id) {
    res.status(400).json({ error: 'scenario_id requerido' });
    return;
  }
  const patch = {};
  if (state !== undefined) {
    if (!ALLOWED_STATES.has(state)) {
      res.status(400).json({ error: 'state inválido' });
      return;
    }
    patch.state = state;
  }
  if (notes !== undefined) patch.notes = String(notes).slice(0, 4000);

  const saved = await updateLeadFields(scenario_id, patch);
  if (!saved) {
    res.status(404).json({ error: 'Lead no encontrado o almacenamiento no disponible' });
    return;
  }
  res.status(200).json({ ok: true, lead: saved });
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handlePost(req, res);
  if (req.method === 'PATCH') return handlePatch(req, res);
  res.status(405).json({ error: 'Método no permitido' });
};
