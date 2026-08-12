// Serverless function (Vercel Cron -> ver vercel.json "crons").
// Llama a cada fuente, normaliza al formato { id, current, yoy, asOf, verified, fuente, desc }
// y guarda el snapshot en Vercel KV. Si una fuente falla, conserva el último valor
// bueno de esa misma fuente que ya estuviera en KV — nunca rompe el snapshot completo.
// Además, por cada fuente que sí responde, añade un punto {date, value} al
// histórico de ese driver (no se pisa: se acumula, un punto por día).

const { getSnapshot, saveSnapshot, appendDriversHistory } = require('./_lib/kv');
const { SOURCES } = require('./_lib/sources');
const { formatFechaCorta } = require('./_lib/format');

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
  const puntosHistoricos = {};
  const hoy = formatFechaCorta(new Date());

  resultados.forEach((resultado, i) => {
    const { id } = SOURCES[i];
    if (resultado.status === 'fulfilled' && resultado.value) {
      drivers.push(resultado.value);
      puntosHistoricos[id] = { date: hoy, value: resultado.value.current };
      return;
    }
    const motivo = resultado.reason;
    errores.push({ id, error: (motivo && motivo.message) || String(motivo) });
    const valorAnterior = previoPorId.get(id);
    if (valorAnterior) drivers.push(valorAnterior); // mantener el último valor bueno
    // no se añade punto de histórico: no hay dato nuevo que registrar
  });

  const snapshot = await saveSnapshot(drivers);
  if (Object.keys(puntosHistoricos).length > 0) await appendDriversHistory(puntosHistoricos);

  res.status(200).json({
    ok: true,
    updatedAt: snapshot.updatedAt,
    count: drivers.length,
    historyPoints: Object.keys(puntosHistoricos).length,
    errores,
  });
};
