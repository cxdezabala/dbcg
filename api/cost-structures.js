// Serverless function GET: lee el último snapshot de estructuras de coste por
// sector guardado en Vercel KV por /api/refresh-cost-structures.

const { getCostStructuresSnapshot } = require('./_lib/kv');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const snapshot = await getCostStructuresSnapshot();
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  if (!snapshot) {
    res.status(200).json({ updatedAt: null, sectores: {} });
    return;
  }

  res.status(200).json(snapshot);
};
