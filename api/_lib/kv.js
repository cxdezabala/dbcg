// Prefijo "_" => Vercel no convierte este directorio en una ruta pública.
// Envuelve Vercel KV para que la ausencia de KV (p. ej. en local sin variables
// de entorno configuradas) nunca tumbe /api/drivers ni /api/refresh-drivers.

const SNAPSHOT_KEY = 'kairos:drivers:snapshot';

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

async function getSnapshot() {
  const kv = getClient();
  if (!kv) return null;
  try {
    return (await kv.get(SNAPSHOT_KEY)) || null;
  } catch (err) {
    console.error('[kairos] KV getSnapshot falló', err);
    return null;
  }
}

async function saveSnapshot(drivers) {
  const snapshot = { updatedAt: new Date().toISOString(), drivers };
  const kv = getClient();
  if (kv) {
    try {
      await kv.set(SNAPSHOT_KEY, snapshot);
    } catch (err) {
      console.error('[kairos] KV saveSnapshot falló', err);
    }
  }
  return snapshot;
}

module.exports = { getSnapshot, saveSnapshot, SNAPSHOT_KEY };
