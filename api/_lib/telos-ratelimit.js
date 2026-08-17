// Limita intentos de login por IP usando Vercel KV. Igual patrón que
// api/_lib/kv.js: si KV no está configurado (desarrollo local sin variables
// de entorno), nunca bloquea -- se degrada, no rompe.

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

const WINDOW_SECONDS = 15 * 60;
const MAX_ATTEMPTS = 8;

function keyFor(ip) { return 'telos:loginfail:' + ip; }

async function isRateLimited(ip) {
  const kv = getClient();
  if (!kv) return false;
  try {
    const count = await kv.get(keyFor(ip));
    return typeof count === 'number' && count >= MAX_ATTEMPTS;
  } catch (err) {
    console.error('[telos] KV rate-limit get falló', err);
    return false;
  }
}

async function recordLoginAttempt(ip) {
  const kv = getClient();
  if (!kv) return;
  try {
    const key = keyFor(ip);
    const count = (await kv.get(key)) || 0;
    await kv.set(key, count + 1, { ex: WINDOW_SECONDS });
  } catch (err) {
    console.error('[telos] KV rate-limit set falló', err);
  }
}

module.exports = { isRateLimited, recordLoginAttempt };
