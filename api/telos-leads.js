// GET, requiere sesión -- lista todos los leads (escenarios compartidos)
// guardados en KV, más recientes primero. Los datos de leads nunca viven en
// el HTML: sin sesión válida esta ruta no devuelve nada (TELOS-DEPLOY.md §4).

const { getSession } = require('./_lib/session');
const { listLeads } = require('./_lib/telos-leads-kv');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }
  if (!getSession(req)) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }
  const leads = await listLeads();
  res.status(200).json({ leads });
};
