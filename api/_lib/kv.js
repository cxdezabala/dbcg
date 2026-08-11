// Prefijo "_" => Vercel no convierte este directorio en una ruta pública.
// Envuelve Vercel KV para que la ausencia de KV (p. ej. en local sin variables
// de entorno configuradas) nunca tumbe ninguna de las rutas /api/*.

const DRIVERS_KEY = 'kairos:drivers:snapshot';
const PROJECTIONS_KEY = 'kairos:projections:snapshot';

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

module.exports = {
  getSnapshot, saveSnapshot,
  getProjectionsSnapshot, saveProjectionsSnapshot,
  DRIVERS_KEY, PROJECTIONS_KEY,
};
