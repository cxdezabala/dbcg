// Prefijo "_" => Vercel no convierte este directorio en una ruta pública.
//
// Un fetcher por driver proyectable. Cada uno devuelve exactamente:
//   { nivel, metodo, fuente, asOf, h: { m30, m90, m180 } }
// donde cada mXX es { v, lo, hi } (variación % esperada sobre el valor actual
// del driver, con banda) o `null` si esa fuente no publica a ese horizonte —
// nunca se rellena un horizonte sin fuente forward con extrapolación.
//
// Nivel 1 (curva de futuros, dato de mercado): electricidad (OMIP) y gas_natural
// (MIBGAS Derivados). Requieren spot + futuro; v = (futuro/spot − 1) × 100.
// Nivel 2 (previsión/certeza de organismo oficial, "se lee del informe"):
// inflación (Banco de España), SMI y peajes (BOE/Min. Transportes) — estos dos
// últimos son certezas administrativas ya publicadas, no modelos, así que se
// calculan por fecha de efecto en vez de por llamada de red.
//
// IMPORTANT: los endpoints de OMIP y MIBGAS Derivados son el mejor esfuerzo a
// partir de sus portales públicos de datos de mercado — este entorno de
// desarrollo no tiene salida de red hacia esos dominios para verificarlos en
// vivo. Igual que con los códigos de serie del INE en sources.js: si un
// endpoint está mal, el fetcher falla y refresh-projections.js simplemente
// no actualiza ese driver (nunca rompe el snapshot). Confirmar/ajustar en
// Vercel (que sí tiene salida a internet) antes de confiar en el dato.

function round1(n) { return Math.round(n * 10) / 10; }
function addDays(date, days) { return new Date(date.getTime() + days * 86400000); }
function daysBetween(a, b) { return (b.getTime() - a.getTime()) / 86400000; }

async function fetchJson(url, opts) {
  const res = await fetch(url, { headers: { Accept: 'application/json' }, ...opts });
  if (!res.ok) throw new Error(`${url} respondió ${res.status}`);
  return res.json();
}

// Banda alrededor de v: se ensancha con el horizonte (30/90/180 días).
// No hay fuente de volatilidad implícita conectada todavía — placeholder
// razonable hasta sustituir por volatilidad histórica/implícita real.
const BAND_SPREAD = [2, 4.5, 7]; // puntos porcentuales, por índice de horizonte (m30, m90, m180)
function withBand(v, horizonIdx) {
  const spread = BAND_SPREAD[horizonIdx];
  return { v: round1(v), lo: round1(v - spread), hi: round1(v + spread) };
}

const HORIZON_DAYS = { m30: 30, m90: 90, m180: 180 };

// ---------------------------------------------------------------------------
// Nivel 1 — electricidad (spot REE/OMIE + futuro OMIP)
// ---------------------------------------------------------------------------

async function fetchElectricidadSpot() {
  const hoy = new Date();
  const desde = addDays(hoy, -1).toISOString().slice(0, 10);
  const hasta = hoy.toISOString().slice(0, 10);
  const url = `https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real?start_date=${desde}T00:00&end_date=${hasta}T23:59&time_trunc=day`;
  const json = await fetchJson(url);
  const serie = Array.isArray(json && json.included)
    ? json.included.find(s => s.attributes && /spot|diario/i.test(s.attributes.title || ''))
    : null;
  const valores = serie && Array.isArray(serie.attributes.values) ? serie.attributes.values : null;
  if (!valores || valores.length === 0) throw new Error('REE apidatos: sin precio spot disponible');
  return valores[valores.length - 1].value;
}

// TODO verificar endpoint: OMIP publica cierres diarios de futuros mensuales/trimestrales
// del mercado eléctrico español en su portal de datos de mercado (omip.pt). No hay salida
// de red en este entorno de desarrollo para confirmar la URL/JSON exactos.
async function fetchElectricidadFuturaMensual() {
  const url = 'https://www.omip.pt/en/dados-mercado/settlement-prices?product=FTB&zone=ES';
  const json = await fetchJson(url);
  const precio = json && (json.settlementPrice ?? json.precio ?? (Array.isArray(json.data) && json.data[0] && json.data[0].price));
  if (typeof precio !== 'number') throw new Error('OMIP: formato de respuesta inesperado');
  return precio;
}

async function fetchElectricidadProjection() {
  const [spot, futuroMes] = await Promise.all([fetchElectricidadSpot(), fetchElectricidadFuturaMensual()]);
  if (!spot) throw new Error('electricidad: sin precio spot');
  const vMensual = (futuroMes / spot - 1) * 100;
  // Solo tenemos el futuro a 1 mes verificado en este endpoint; 90/180 días
  // quedan en null hasta añadir los productos trimestral/anual de OMIP.
  return {
    nivel: 1,
    metodo: 'Curva OMIP (futuro eléctrico español) vs. spot OMIE/REE',
    fuente: 'OMIP',
    asOf: new Date().toISOString().slice(0, 10),
    h: { m30: withBand(vMensual, 0), m90: null, m180: null },
  };
}

// ---------------------------------------------------------------------------
// Nivel 1 — gas natural (spot MIBGAS + futuro MIBGAS Derivados)
// ---------------------------------------------------------------------------

// TODO verificar endpoint exacto del portal de datos de MIBGAS/MIBGAS Derivados.
async function fetchGasSpotMibgas() {
  const url = 'https://www.mibgas.es/en/data-access/summary?product=PVB_DA&format=json';
  const json = await fetchJson(url);
  const precio = json && (json.price ?? json.precio ?? (Array.isArray(json.data) && json.data[0] && json.data[0].price));
  if (typeof precio !== 'number') throw new Error('MIBGAS: formato de respuesta inesperado (spot)');
  return precio;
}

async function fetchGasFuturoMibgasDerivados(producto) {
  const url = `https://www.mibgas.es/en/data-access/derivatives?product=${producto}&format=json`;
  const json = await fetchJson(url);
  const precio = json && (json.price ?? json.precio ?? (Array.isArray(json.data) && json.data[0] && json.data[0].price));
  if (typeof precio !== 'number') throw new Error(`MIBGAS Derivados: formato de respuesta inesperado (${producto})`);
  return precio;
}

async function fetchGasNaturalProjection() {
  const spot = await fetchGasSpotMibgas();
  if (!spot) throw new Error('gas_natural: sin precio spot');
  const resultados = await Promise.allSettled([
    fetchGasFuturoMibgasDerivados('MTH'), // mes siguiente -> horizonte ~30d
    fetchGasFuturoMibgasDerivados('QTR'), // trimestre siguiente -> horizonte ~90d
  ]);
  const [mth, qtr] = resultados;
  const h = { m30: null, m90: null, m180: null };
  if (mth.status === 'fulfilled') h.m30 = withBand((mth.value / spot - 1) * 100, 0);
  if (qtr.status === 'fulfilled') h.m90 = withBand((qtr.value / spot - 1) * 100, 1);
  if (!h.m30 && !h.m90) throw new Error('gas_natural: ningún producto derivado disponible');
  return {
    nivel: 1,
    metodo: 'Curva MIBGAS Derivados (MTH/QTR) vs. spot PVB Day-Ahead',
    fuente: 'MIBGAS',
    asOf: new Date().toISOString().slice(0, 10),
    h, // m180 queda en null: MIBGAS Derivados no cubre YR con liquidez suficiente hoy
  };
}

// ---------------------------------------------------------------------------
// Nivel 2 — inflación (Banco de España, proyecciones macroeconómicas)
// ---------------------------------------------------------------------------
//
// El Banco de España no publica una API JSON de sus "Proyecciones macroeconómicas
// de la economía española" — es un informe trimestral (mar/jun/sep/dic) que hay
// que leer y actualizar aquí a mano, tal como indica KAIROS-DATA-PIPELINE.md
// ("no se calcula: se lee del informe y se interpola linealmente al horizonte").
// ACTUALIZAR estos dos puntos cada vez que el BdE publique un nuevo informe:
// https://www.bde.es/wbe/es/publicaciones/analisis-economico-investigacion/proyecciones-macroeconomicas/
const BDE_IPC_PROJECTION = {
  informe: 'Proyecciones macroeconómicas de la economía española (jun 2026)',
  anchors: [
    { date: '2026-12-31', ipc: 3.0 }, // IPC medio proyectado cierre 2026
    { date: '2027-12-31', ipc: 2.4 }, // IPC medio proyectado cierre 2027
  ],
};

function interpolateIpc(current, hoy, horizonDate) {
  const puntos = [{ date: hoy, ipc: current }, ...BDE_IPC_PROJECTION.anchors.map(a => ({ date: new Date(a.date), ipc: a.ipc }))];
  if (horizonDate <= puntos[0].date) return puntos[0].ipc;
  for (let i = 0; i < puntos.length - 1; i++) {
    const a = puntos[i], b = puntos[i + 1];
    if (horizonDate <= b.date) {
      const t = daysBetween(a.date, horizonDate) / (daysBetween(a.date, b.date) || 1);
      return a.ipc + (b.ipc - a.ipc) * t;
    }
  }
  return puntos[puntos.length - 1].ipc; // más allá del último ancla publicado: se mantiene plano, no se extrapola
}

async function fetchInflacionProjection() {
  const { fetchInflacion } = require('./sources');
  const inflacionActual = await fetchInflacion(); // current = IPC interanual actual (INE)
  const current = inflacionActual.current;
  const hoy = new Date();
  const h = {};
  Object.keys(HORIZON_DAYS).forEach((key, idx) => {
    const horizonDate = addDays(hoy, HORIZON_DAYS[key]);
    const ipcProyectado = interpolateIpc(current, hoy, horizonDate);
    const v = current !== 0 ? ((ipcProyectado - current) / Math.abs(current)) * 100 : 0;
    h[key] = withBand(v, idx);
  });
  return {
    nivel: 2,
    metodo: `Proyección macro Banco de España (${BDE_IPC_PROJECTION.informe}), interpolada`,
    fuente: 'Banco de España',
    asOf: inflacionActual.asOf,
    h,
  };
}

// ---------------------------------------------------------------------------
// Nivel 2 — SMI y peajes: certezas administrativas ya publicadas (BOE / Min.
// Transportes), no un modelo. Se calculan por fecha de efecto, sin llamada de
// red: mientras el horizonte no cruce la próxima revisión conocida, v = 0
// (banda cero, es un hecho, no una estimación). Si el horizonte cruza una
// revisión cuya cuantía todavía no se ha publicado, ese punto queda en null
// en vez de inventar una cifra.
// ---------------------------------------------------------------------------

function stepProjection({ metodo, fuente, proximaRevision, nuevaVariacion }) {
  const hoy = new Date();
  const h = {};
  Object.keys(HORIZON_DAYS).forEach(key => {
    const horizonDate = addDays(hoy, HORIZON_DAYS[key]);
    if (!proximaRevision || horizonDate < proximaRevision) {
      h[key] = { v: 0, lo: 0, hi: 0 };
    } else if (nuevaVariacion != null) {
      h[key] = { v: nuevaVariacion, lo: nuevaVariacion, hi: nuevaVariacion };
    } else {
      h[key] = null; // hay revisión programada pero la cuantía aún no está publicada
    }
  });
  return { nivel: 2, metodo, fuente, asOf: hoy.toISOString().slice(0, 10), h };
}

// SMI 1.221 €/mes fijado por RD 126/2026 (18 feb 2026). Sin nueva subida
// publicada todavía para el siguiente periodo -> actualizar `proximaRevision`
// y `nuevaVariacion` en cuanto el BOE publique el siguiente Real Decreto.
async function fetchSmiProjection() {
  return stepProjection({
    metodo: 'Subida ya publicada (RD 126/2026); sin nueva revisión del SMI publicada todavía',
    fuente: 'BOE',
    proximaRevision: null,
    nuevaVariacion: null,
  });
}

// Peajes de autopistas estatales: revisión ya publicada, efectiva 1 ene 2026.
// La siguiente revisión (previsiblemente 1 ene 2027) aún no tiene cuantía
// publicada -> horizontes que cruzan esa fecha quedan en null.
async function fetchPeajesProjection() {
  return stepProjection({
    metodo: 'Revisión tarifaria ya publicada; próxima revisión (1 ene 2027) sin cuantía publicada aún',
    fuente: 'Min. Transportes',
    proximaRevision: new Date('2027-01-01T00:00:00Z'),
    nuevaVariacion: null,
  });
}

const PROJECTION_SOURCES = [
  { id: 'electricidad', run: fetchElectricidadProjection },
  { id: 'gas_natural', run: fetchGasNaturalProjection },
  { id: 'inflacion', run: fetchInflacionProjection },
  { id: 'smi', run: fetchSmiProjection },
  { id: 'peajes', run: fetchPeajesProjection },
];

module.exports = { PROJECTION_SOURCES };

// ---------------------------------------------------------------------------
// Fase 3, resto de la tabla (sin implementar todavía) — dejar horizonte null,
// no rellenar con extrapolación:
// ---------------------------------------------------------------------------
//
// fuel, aluminio, algodon -> Nivel 1, requieren proveedor de datos de pago
// (Nasdaq Data Link / Alpha Vantage / metals-api) para la curva de futuros —
// mismo problema que en fase 1.
//
// tipos -> Nivel 1/2, curva OIS €STR / futuros Euribor — el BCE SDW publica
// spot, falta conectar la curva de futuros o las staff projections del BCE.
//
// laboral -> Nivel 2, previsión de remuneración por asalariado (BdE/AIReF) —
// mismo mecanismo "se lee del informe" que inflación; pendiente de añadir la
// constante equivalente a BDE_IPC_PROJECTION.
//
// acero, colorantes, aceite_oliva, aceite_vegetal, trigo, cerdo, pollo, pienso,
// cobre, materiales_construccion -> Nivel 3 (modelo propio: descomposición
// estacional + deriva, o Holt-Winters) o Nivel 4 (derivado por correlación) —
// ninguno implementado todavía, ver KAIROS-DATA-PIPELINE.md.
