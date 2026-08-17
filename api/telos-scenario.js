// Recibe el escenario que un usuario decide compartir voluntariamente desde
// Telos (front público, telos.html) y lo guarda como lead para el asesor.
// Sin autenticación a propósito -- es la única puerta de entrada de datos
// desde el público. Solo escribe: leer la lista completa exige sesión
// (ver telos-leads.js). Se llama dos veces desde el front con el mismo
// scenario_id: al compartir (cifras del escenario) y al confirmar la
// reunión (nombre/contacto/fecha) -- el segundo hace merge sobre el primero.

const { upsertLead } = require('./_lib/telos-leads-kv');

const ALLOWED_TYPES = new Set(['retirement', 'education']);
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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const body = req.body || {};
  const scenarioId = typeof body.scenario_id === 'string' ? body.scenario_id.trim().slice(0, 64) : '';
  const scenarioType = body.scenario_type;
  if (!scenarioId || !/^TL-[RE]-\d+$/.test(scenarioId) || !ALLOWED_TYPES.has(scenarioType)) {
    res.status(400).json({ error: 'scenario_id (formato TL-R-##### / TL-E-#####) y scenario_type (retirement|education) son obligatorios' });
    return;
  }

  // `state` lo controla solo el asesor (api/telos-lead-status.js); nunca se acepta del público.
  const { state, ...rest } = body;
  const saved = await upsertLead(scenarioId, sanitize(rest));
  if (!saved) {
    res.status(503).json({ error: 'Almacenamiento no disponible en este momento' });
    return;
  }
  res.status(200).json({ ok: true });
};
