// Prefijo "_" => Vercel no convierte este directorio en una ruta pública.
//
// Estructura de coste por sector, con dos pasos:
//   1) Traer los ratios AGREGADOS y reales del INE (Estadística Estructural
//      de Empresas, EEE) para el CNAE que corresponde a cada sector de Kairos
//      — gastos de personal, consumos de explotación, etc., como % real.
//   2) Pedirle a un modelo (mismo OPENAI_API_KEY que usa Brandt AI) que
//      reasigne las partidas específicas ACTUALES de Kairos (p.ej. "Acero
//      laminado", "Combustible") DENTRO de esas categorías oficiales, de
//      forma proporcional — nunca que invente partidas nuevas ni cifras
//      sueltas. La respuesta se valida estrictamente antes de aceptarla.
//
// IDs de operación (Tempus3, el `Id` que espera la URL — no el `Cod_IOE` del
// catálogo IOE, que es un número distinto) confirmados a mano contra
// https://servicios.ine.es/wstempus/js/ES/OPERACIONES_DISPONIBLES el
// 12 ago 2026, porque este entorno de desarrollo no tiene salida de red hacia
// ine.es para consultarlo por sí solo. Un intento anterior usó por error el
// Cod_IOE (30048) en vez del Id (24) y siempre devolvía cuerpo vacío.
const INE_BASE = 'https://servicios.ine.es/wstempus/js/ES';
const EEE_OPERACION = {
  industrial: '24',  // Estadística Estructural de Empresas: Sector Industrial
  comercio: '256',   // Estadística Estructural de Empresas: Sector Comercio
  servicios: '130',  // Estadística Estructural de Empresas: Sector Servicios
};

// Sectores de Kairos con mapeo a CNAE dentro de alguna de las tres EEE. Solo
// construccion queda fuera: la EEE del INE cubre Industria/Comercio/Servicios
// pero no tiene una operación dedicada a Construcción — necesitaría otra
// fuente (Encuesta Anual de Construcción del INE, o SEOPAN/Fundación Laboral
// de la Construcción).
const CNAE_POR_SECTOR = {
  manufactura: { macroSector: 'industrial', cnae: ['24', '25', '29'], etiqueta: 'metalurgia y vehículos de motor' },
  alimentacion: { macroSector: 'industrial', cnae: ['10'], etiqueta: 'industria de la alimentación' },
  textil: { macroSector: 'industrial', cnae: ['13', '14'], etiqueta: 'industria textil y confección' },
  comercio: { macroSector: 'comercio', cnae: ['45', '46', '47'], etiqueta: 'comercio al por mayor y al por menor' },
  hosteleria: { macroSector: 'servicios', cnae: ['55', '56'], etiqueta: 'hostelería' },
  transporte: { macroSector: 'servicios', cnae: ['49', '50', '51', '52', '53'], etiqueta: 'transporte y almacenamiento' },
};

// Errores explícitos (status + un trozo del cuerpo) en vez de dejar que
// JSON.parse falle con "Unexpected end of JSON input" — así el array
// `errores` de /api/refresh-cost-structures dice qué pasó de verdad, sin
// tener que reproducirlo a ciegas.
async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const texto = await res.text();
  if (!res.ok) throw new Error(`${url} respondió ${res.status}: ${texto.slice(0, 200)}`);
  if (!texto) throw new Error(`${url} respondió ${res.status} con cuerpo vacío`);
  try {
    return JSON.parse(texto);
  } catch (e) {
    throw new Error(`${url} no devolvió JSON válido (status ${res.status}): ${texto.slice(0, 200)}`);
  }
}

async function fetchEEERatios(macroSector, cnaeList, etiqueta) {
  const operacion = EEE_OPERACION[macroSector];
  if (!operacion) throw new Error(`EEE: sin operación configurada para "${macroSector}"`);
  const tablas = await fetchJson(`${INE_BASE}/TABLAS_OPERACION/${operacion}?det=0`);
  if (!Array.isArray(tablas) || tablas.length === 0) throw new Error('EEE: la operación no devolvió tablas');

  const tablaPersonal = tablas.find(t => /gastos de personal/i.test(t.Nombre || ''));
  const tablaConsumos = tablas.find(t => /consumo|compras/i.test(t.Nombre || ''));
  if (!tablaPersonal || !tablaConsumos) throw new Error('EEE: no se encontraron las tablas de personal/consumos esperadas');

  const [datosPersonal, datosConsumos] = await Promise.all([
    fetchJson(`${INE_BASE}/DATOS_TABLA/${tablaPersonal.Id}?nult=1`),
    fetchJson(`${INE_BASE}/DATOS_TABLA/${tablaConsumos.Id}?nult=1`),
  ]);

  const matchCnae = serie => {
    const nombre = (serie.Nombre || '');
    return cnaeList.some(c => nombre.includes(c)) || nombre.toLowerCase().includes(etiqueta.toLowerCase());
  };
  const puntoPersonal = (Array.isArray(datosPersonal) ? datosPersonal : []).find(matchCnae);
  const puntoConsumos = (Array.isArray(datosConsumos) ? datosConsumos : []).find(matchCnae);
  if (!puntoPersonal || !puntoConsumos) throw new Error(`EEE: no se encontró el desglose para CNAE ${cnaeList.join('/')}`);

  const valorPersonal = puntoPersonal.Data && puntoPersonal.Data[0] && puntoPersonal.Data[0].Valor;
  const valorConsumos = puntoConsumos.Data && puntoConsumos.Data[0] && puntoConsumos.Data[0].Valor;
  if (typeof valorPersonal !== 'number' || typeof valorConsumos !== 'number') throw new Error('EEE: valores no numéricos en la respuesta');

  const anyo = (puntoPersonal.Data[0].Anyo || puntoPersonal.Data[0].T3_Periodo || new Date().getFullYear()) + '';
  return { personal_pct: valorPersonal, consumos_pct: valorConsumos, asOf: anyo };
}

// --- Reconciliación por IA: números oficiales agregados -> partidas específicas de Kairos ---

async function reconcileWithLLM({ sectorName, currentEstructura, eeeRatios }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY no configurada');
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const prompt = `Eres un analista financiero. Tienes la estructura de coste ACTUAL de un sector (partidas específicas, estimación editorial de un consultor) y los ratios OFICIALES agregados del INE (Estadística Estructural de Empresas) para ese mismo sector.

Sector: ${sectorName}

Estructura actual (editorial, partidas específicas, suman ~100):
${JSON.stringify(currentEstructura.map(([label, pct]) => ({ label, pct })))}

Ratios oficiales agregados (INE EEE, año ${eeeRatios.asOf}, % sobre cifra de negocio):
{"gastos_de_personal_pct": ${eeeRatios.personal_pct}, "consumos_de_explotacion_pct": ${eeeRatios.consumos_pct}}

Tarea: reasigna las partidas específicas actuales DENTRO de estas dos categorías oficiales (más "Otros" para lo que no encaje), de forma proporcional, para que la partida de personal sume el % oficial de personal y el resto de partidas de coste (materiales, energía, componentes...) sumen el % oficial de consumos. No inventes partidas que no estén ya en la lista actual. No cambies el nombre de las partidas existentes.

Devuelve SOLO un JSON con este formato exacto, sin texto adicional ni markdown:
{"estructura": [{"label": "...", "pct": 00.0}], "notas": "explicación breve de los criterios de reasignación, en una frase"}

Los "pct" deben sumar 100 (±1 por redondeo).`;

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'Devuelves únicamente JSON válido, sin comentarios ni texto fuera del JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  });
  if (!r.ok) throw new Error(`OpenAI respondió ${r.status}`);
  const data = await r.json();
  const raw = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!raw) throw new Error('Respuesta vacía de OpenAI');

  let parsed;
  try { parsed = JSON.parse(raw); } catch (e) { throw new Error('OpenAI no devolvió JSON válido'); }

  // Validación estricta: nunca se acepta ni se muestra un dato que no pase esto.
  if (!Array.isArray(parsed.estructura) || parsed.estructura.length === 0) throw new Error('Formato inesperado: falta "estructura"');
  let total = 0;
  const limpio = parsed.estructura.map(item => {
    if (!item || typeof item.label !== 'string' || typeof item.pct !== 'number' || !Number.isFinite(item.pct) || item.pct < 0) {
      throw new Error('Partida inválida en la respuesta del modelo');
    }
    total += item.pct;
    return [item.label, Math.round(item.pct * 10) / 10];
  });
  if (Math.abs(total - 100) > 3) throw new Error(`Los porcentajes suman ${total.toFixed(1)}, no ~100 — se descarta`);

  return { estructura: limpio, notas: typeof parsed.notas === 'string' ? parsed.notas.slice(0, 500) : '' };
}

async function reconcileSector(sectorId, sectorName, currentEstructura) {
  const cfg = CNAE_POR_SECTOR[sectorId];
  if (!cfg) throw new Error(`${sectorId}: sin mapeo CNAE a EEE todavía`);
  const eeeRatios = await fetchEEERatios(cfg.macroSector, cfg.cnae, cfg.etiqueta);
  const { estructura, notas } = await reconcileWithLLM({ sectorName, currentEstructura, eeeRatios });
  return {
    estructura,
    fuente: 'INE — Estadística Estructural de Empresas',
    metodo: `Ratios oficiales EEE ${eeeRatios.asOf} (CNAE ${cfg.cnae.join('/')}) reasignados por IA sobre las partidas de Kairos`,
    notas,
    asOf: eeeRatios.asOf,
  };
}

module.exports = { reconcileSector, CNAE_POR_SECTOR };

// ---------------------------------------------------------------------------
// construccion: sin fuente EEE — no rellenar con una suposición, investigar
// primero. La EEE del INE cubre Industria/Comercio/Servicios, pero no tiene
// una operación dedicada a Construcción. Posible fuente alternativa: Encuesta
// Anual de Construcción del INE, o datos sectoriales de SEOPAN/Fundación
// Laboral de la Construcción.
// ---------------------------------------------------------------------------
