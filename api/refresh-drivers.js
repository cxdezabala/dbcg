// Serverless function (Vercel Cron -> ver vercel.json "crons").
// Llama a cada fuente, normaliza al formato { id, current, yoy, asOf, verified, fuente, desc }
// y guarda el snapshot en Vercel KV. Si una fuente falla, conserva el último valor
// bueno de esa misma fuente que ya estuviera en KV — nunca rompe el snapshot completo.

const { getSnapshot, saveSnapshot } = require('./_lib/kv');
const { SOURCES } = require('./_lib/sources');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  // Si CRON_SECRET está configurado en las variables de entorno de Vercel,
  // exigir que la llamada lo incluya (Vercel Cron lo añade automáticamente
  // como cabecera Authorization: Bearer <CRON_SECRET>).
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers['authorization'] !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

  const previo = await getSnapshot();
  const previoPorId = new Map((previo && previo.drivers ? previo.drivers : []).map(d => [d.id, d]));

  const resultados = await Promise.allSettled(SOURCES.map(fuente => fuente.run()));

  const drivers = [];
  const errores = [];

  resultados.forEach((resultado, i) => {
    const { id } = SOURCES[i];
    if (resultado.status === 'fulfilled' && resultado.value) {
      drivers.push(resultado.value);
      return;
    }
    const motivo = resultado.reason;
    errores.push({ id, error: (motivo && motivo.message) || String(motivo) });
    const valorAnterior = previoPorId.get(id);
    if (valorAnterior) drivers.push(valorAnterior); // mantener el último valor bueno
  });

  const snapshot = await saveSnapshot(drivers);

  res.status(200).json({
    ok: true,
    updatedAt: snapshot.updatedAt,
    count: drivers.length,
    errores,
  });
};
