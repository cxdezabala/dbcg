// Serverless function GET: lee el último snapshot guardado en Vercel KV por
// /api/refresh-drivers (más el histórico acumulado) y lo devuelve tal cual.
// No llama a ninguna fuente externa.

const { getSnapshot, getDriversHistory } = require('./_lib/kv');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const [snapshot, history] = await Promise.all([getSnapshot(), getDriversHistory()]);
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');

  if (!snapshot) {
    res.status(200).json({ updatedAt: null, drivers: [], history });
    return;
  }

  res.status(200).json({ ...snapshot, history });
};
