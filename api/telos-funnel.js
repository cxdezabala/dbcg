// Contador anónimo de exploración en Telos: cuántas sesiones llegan a cada
// paso clave del recorrido público, sin ningún dato personal. POST es
// público y sin sesión a propósito -- es un beacon que llama telos.html en
// cada paso clave del recorrido. GET requiere sesión de asesor, igual que el
// resto del back office.

const { getSession } = require('./_lib/session');
const { incrementFunnel, getFunnelStats } = require('./_lib/telos-funnel-kv');

async function handlePost(req, res) {
  try {
    const { journey, event } = req.body || {};
    await incrementFunnel(journey, event);
  } catch (err) {
    console.error('[telos] telos-funnel POST falló', err);
  }
  // Siempre 204 sin cuerpo: es un beacon de analítica, nunca debe romper ni
  // dar pistas de validación a quien inspeccione la red del navegador.
  res.status(204).end();
}

async function handleGet(req, res) {
  if (!getSession(req)) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }
  const stats = await getFunnelStats();
  res.status(200).json(stats);
}

module.exports = async function handler(req, res) {
  if (req.method === 'POST') return handlePost(req, res);
  if (req.method === 'GET') return handleGet(req, res);
  res.status(405).json({ error: 'Método no permitido' });
};
