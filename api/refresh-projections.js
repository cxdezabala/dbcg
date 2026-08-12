// Serverless function (Vercel Cron -> ver vercel.json "crons").
// Recalcula PROJECTIONS: llama a cada fuente forward (Nivel 1: curva de
// futuros; Nivel 2: previsión/certeza de organismo oficial), normaliza a
// { nivel, metodo, fuente, asOf, h:{m30,m90,m180} } y guarda el snapshot en
// Vercel KV. Si una fuente falla, conserva la última proyección buena de ese
// mismo driver — nunca rompe el snapshot completo. Los drivers sin fetcher
// implementado (ver projection-sources.js) simplemente no aparecen en el
// snapshot; kairos.html los deja en null vía su fallback, no se inventan.
// Además, por cada fuente que sí responde, añade un punto {date, m30, m90,
// m180} al histórico de esa proyección (cómo ha evolucionado el pronóstico
// a cada horizonte, un punto por día) — no se pisa, se acumula.

const { getProjectionsSnapshot, saveProjectionsSnapshot, appendProjectionsHistory } = require('./_lib/kv');
const { PROJECTION_SOURCES } = require('./_lib/projection-sources');
const { formatFechaCorta } = require('./_lib/format');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers['authorization'] !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

  const previo = await getProjectionsSnapshot();
  const previoProjections = (previo && previo.projections) || {};

  const resultados = await Promise.allSettled(PROJECTION_SOURCES.map(fuente => fuente.run()));

  const projections = { ...previoProjections };
  const errores = [];
  const puntosHistoricos = {};
  const hoy = formatFechaCorta(new Date());

  resultados.forEach((resultado, i) => {
    const { id } = PROJECTION_SOURCES[i];
    if (resultado.status === 'fulfilled' && resultado.value) {
      projections[id] = resultado.value; // reemplaza con la proyección fresca
      const h = resultado.value.h || {};
      puntosHistoricos[id] = {
        date: hoy,
        m30: h.m30 ? h.m30.v : null,
        m90: h.m90 ? h.m90.v : null,
        m180: h.m180 ? h.m180.v : null,
      };
      return;
    }
    errores.push({ id, error: (resultado.reason && resultado.reason.message) || String(resultado.reason) });
    // no se toca projections[id]: se queda con la última proyección buena (o ausente si nunca hubo una)
  });

  const snapshot = await saveProjectionsSnapshot(projections);
  if (Object.keys(puntosHistoricos).length > 0) await appendProjectionsHistory(puntosHistoricos);

  res.status(200).json({
    ok: true,
    updatedAt: snapshot.updatedAt,
    count: Object.keys(projections).length,
    historyPoints: Object.keys(puntosHistoricos).length,
    errores,
  });
};
