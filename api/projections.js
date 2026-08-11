// Serverless function GET: lee el último snapshot de PROJECTIONS guardado en
// Vercel KV por /api/refresh-projections y lo devuelve tal cual.

const { getProjectionsSnapshot } = require('./_lib/kv');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const snapshot = await getProjectionsSnapshot();
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');

  if (!snapshot) {
    res.status(200).json({ updatedAt: null, projections: {} });
    return;
  }

  res.status(200).json(snapshot);
};
