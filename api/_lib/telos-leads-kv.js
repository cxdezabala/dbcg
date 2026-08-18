// Almacena en Vercel KV los escenarios que un usuario decide compartir
// voluntariamente desde Telos -- son los "leads" del asesor. Mismo patrón
// defensivo que api/_lib/kv.js: sin KV configurado, las funciones no
// persisten nada pero tampoco rompen la ruta que las llama.

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

const INDEX_KEY = 'telos:lead:index';
const leadKey = id => 'telos:lead:' + id;

async function getIndex() {
  const kv = getClient();
  if (!kv) return [];
  try {
    return (await kv.get(INDEX_KEY)) || [];
  } catch (err) {
    console.error('[telos] KV index get falló', err);
    return [];
  }
}

async function saveIndex(ids) {
  const kv = getClient();
  if (!kv) return;
  try {
    await kv.set(INDEX_KEY, ids);
  } catch (err) {
    console.error('[telos] KV index set falló', err);
  }
}

// Crea o actualiza un lead por scenario_id. `state` nunca lo fija el llamador
// público (api/telos-scenario.js lo excluye antes de llegar aquí) -- solo se
// preserva el existente o se inicializa a 'Nueva reunión'.
async function upsertLead(scenarioId, patch) {
  const kv = getClient();
  if (!kv) return null;
  try {
    const existing = (await kv.get(leadKey(scenarioId))) || null;
    const now = new Date().toISOString();
    const merged = {
      ...(existing || {}), ...patch, scenario_id: scenarioId,
      created_at: (existing && existing.created_at) || now, updated_at: now,
      state: (existing && existing.state) || 'Nueva reunión'
    };
    await kv.set(leadKey(scenarioId), merged);
    const index = await getIndex();
    if (!index.includes(scenarioId)) {
      index.unshift(scenarioId);
      await saveIndex(index);
    }
    return merged;
  } catch (err) {
    console.error('[telos] KV upsertLead falló', err);
    return null;
  }
}

async function listLeads() {
  const kv = getClient();
  if (!kv) return [];
  const index = await getIndex();
  if (!index.length) return [];
  try {
    const records = await Promise.all(index.map(id => kv.get(leadKey(id))));
    return records.filter(Boolean);
  } catch (err) {
    console.error('[telos] KV listLeads falló', err);
    return [];
  }
}

async function updateLeadFields(scenarioId, patch) {
  const kv = getClient();
  if (!kv) return null;
  try {
    const existing = await kv.get(leadKey(scenarioId));
    if (!existing) return null; // no se crea un lead nuevo desde una actualización del asesor
    const merged = { ...existing, ...patch, updated_at: new Date().toISOString() };
    await kv.set(leadKey(scenarioId), merged);
    return merged;
  } catch (err) {
    console.error('[telos] KV updateLeadFields falló', err);
    return null;
  }
}

// Borra un lead (p.ej. escenarios de prueba). Quita tanto el registro como su
// entrada en el índice -- sin esto último quedaría un id "fantasma" que
// listLeads() intentaría leer en cada carga.
async function deleteLead(scenarioId) {
  const kv = getClient();
  if (!kv) return false;
  try {
    const existing = await kv.get(leadKey(scenarioId));
    if (!existing) return false;
    await kv.del(leadKey(scenarioId));
    const index = await getIndex();
    const next = index.filter(id => id !== scenarioId);
    if (next.length !== index.length) await saveIndex(next);
    return true;
  } catch (err) {
    console.error('[telos] KV deleteLead falló', err);
    return false;
  }
}

module.exports = { upsertLead, listLeads, updateLeadFields, deleteLead };
