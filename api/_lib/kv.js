// Prefijo "_" => Vercel no convierte este directorio en una ruta pública.
// Envuelve Vercel KV para que la ausencia de KV (p. ej. en local sin variables
// de entorno configuradas) nunca tumbe ninguna de las rutas /api/*.

const DRIVERS_KEY = 'kairos:drivers:snapshot';
const PROJECTIONS_KEY = 'kairos:projections:snapshot';
const DRIVERS_HISTORY_KEY = 'kairos:drivers:history';
const PROJECTIONS_HISTORY_KEY = 'kairos:projections:history';

// Cuántos puntos guardamos por driver como máximo (con cron diario, ~180
// puntos son unos 6 meses de histórico) — evita que la clave crezca sin límite.
const MAX_HISTORY_POINTS = 180;

let kvClient;
function getClient() {
  if (kvClient !== undefined) return kvClient;
  try {
    kvClient = require('@vercel/kv').kv;
  } catch (err) {
    console.error('[kairos] @vercel/kv no disponible', err);
    kvClient = null;
  }
  return kvClient;
}

async function getJson(key) {
  const kv = getClient();
  if (!kv) return null;
  try {
    return (await kv.get(key)) || null;
  } catch (err) {
    console.error(`[kairos] KV get(${key}) falló`, err);
    return null;
  }
}

async function setJson(key, value) {
  const kv = getClient();
  if (kv) {
    try {
      await kv.set(key, value);
    } catch (err) {
      console.error(`[kairos] KV set(${key}) falló`, err);
    }
  }
  return value;
}

async function getSnapshot() {
  return getJson(DRIVERS_KEY);
}

async function saveSnapshot(drivers) {
  return setJson(DRIVERS_KEY, { updatedAt: new Date().toISOString(), drivers });
}

async function getProjectionsSnapshot() {
  return getJson(PROJECTIONS_KEY);
}

async function saveProjectionsSnapshot(projections) {
  return setJson(PROJECTIONS_KEY, { updatedAt: new Date().toISOString(), projections });
}

// --- Histórico: un punto por driver y por día (cron diario => 1 punto/día). ---
// Si ya hay un punto con la misma etiqueta `date` (mismo día), se sustituye en
// vez de duplicarse — así una fuente que tarda en refrescar, o un reintento
// manual el mismo día, no ensucia la serie con dos puntos idénticos.

function appendPoint(history, point) {
  const list = Array.isArray(history) ? history.slice() : [];
  const last = list[list.length - 1];
  if (last && last.date === point.date) {
    list[list.length - 1] = point;
  } else {
    list.push(point);
  }
  if (list.length > MAX_HISTORY_POINTS) list.splice(0, list.length - MAX_HISTORY_POINTS);
  return list;
}

async function appendHistoryPoints(key, pointsById) {
  const historia = (await getJson(key)) || {};
  const actualizada = { ...historia };
  Object.keys(pointsById).forEach(id => {
    actualizada[id] = appendPoint(historia[id], pointsById[id]);
  });
  await setJson(key, actualizada);
  return actualizada;
}

async function getDriversHistory() {
  return (await getJson(DRIVERS_HISTORY_KEY)) || {};
}

async function appendDriversHistory(pointsById) {
  return appendHistoryPoints(DRIVERS_HISTORY_KEY, pointsById);
}

async function getProjectionsHistory() {
  return (await getJson(PROJECTIONS_HISTORY_KEY)) || {};
}

async function appendProjectionsHistory(pointsById) {
  return appendHistoryPoints(PROJECTIONS_HISTORY_KEY, pointsById);
}

module.exports = {
  getSnapshot, saveSnapshot,
  getProjectionsSnapshot, saveProjectionsSnapshot,
  getDriversHistory, appendDriversHistory,
  getProjectionsHistory, appendProjectionsHistory,
  DRIVERS_KEY, PROJECTIONS_KEY, DRIVERS_HISTORY_KEY, PROJECTIONS_HISTORY_KEY,
};
