// Contadores anónimos de exploración en Telos -- cuántas sesiones llegan a
// cada paso clave del recorrido público, sin guardar ningún dato personal ni
// registro por sesión individual (a diferencia de los leads, que sí son
// datos que la persona decidió compartir). Mismo patrón defensivo que el
// resto de api/_lib: sin KV configurado, no persiste nada pero tampoco rompe
// la ruta que lo llama.

let kvClient;
function getClient() {
  if (kvClient !== undefined) return kvClient;
  try {
    kvClient = require('@vercel/kv').kv;
  } catch (err) {
    console.error('[telos] @vercel/kv no disponible', err);
    kvClient = null;
  }
  return kvClient;
}

const JOURNEYS = ['retirement', 'education'];
// En orden de recorrido: 'time' es el primer paso de ambos journeys (equivale
// a "empezó"), 'meeting' es el paso donde ve la invitación a compartir/agendar
// -- todo lo que no llega a convertirse en lead (api/telos-leads.js) quedó
// en algún punto entre estos dos.
const EVENTS = ['time', 'projection', 'playground', 'summary', 'meeting'];
const SINCE_KEY = 'telos:funnel:since';
const counterKey = (journey, event) => 'telos:funnel:' + journey + ':' + event;

async function incrementFunnel(journey, event) {
  const kv = getClient();
  if (!kv || !JOURNEYS.includes(journey) || !EVENTS.includes(event)) return false;
  try {
    await kv.incr(counterKey(journey, event));
    const since = await kv.get(SINCE_KEY);
    if (!since) await kv.set(SINCE_KEY, new Date().toISOString());
    return true;
  } catch (err) {
    console.error('[telos] KV incrementFunnel falló', err);
    return false;
  }
}

async function getFunnelStats() {
  const kv = getClient();
  if (!kv) return { since: null, journeys: {} };
  try {
    const keys = [];
    for (const j of JOURNEYS) for (const e of EVENTS) keys.push(counterKey(j, e));
    const [since, ...values] = await Promise.all([kv.get(SINCE_KEY), ...keys.map(k => kv.get(k))]);
    const journeys = {};
    let idx = 0;
    for (const j of JOURNEYS) {
      journeys[j] = {};
      for (const e of EVENTS) journeys[j][e] = values[idx++] || 0;
    }
    return { since, journeys };
  } catch (err) {
    console.error('[telos] KV getFunnelStats falló', err);
    return { since: null, journeys: {} };
  }
}

module.exports = { incrementFunnel, getFunnelStats, JOURNEYS, EVENTS };
