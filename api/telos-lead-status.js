// PATCH, requiere sesión -- actualiza el estado de la reunión (Nueva
// reunión / Preparado / Completado) y/o las notas de preparación de un lead
// existente. No crea leads nuevos: eso solo ocurre vía telos-scenario.js.

const { getSession } = require('./_lib/session');
const { updateLeadFields } = require('./_lib/telos-leads-kv');

const ALLOWED_STATES = new Set(['Nueva reunión', 'Preparado', 'Completado']);

module.exports = async function handler(req, res) {
  if (req.method !== 'PATCH') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }
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
};
