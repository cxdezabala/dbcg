// Prefijo "_" => Vercel no convierte este directorio en una ruta pública.
//
// Un fetcher por fuente. Cada uno:
//   - hace una única llamada HTTP a una API oficial,
//   - lanza (throw) si la fuente falla o el payload no tiene la forma esperada,
//   - si tiene éxito, devuelve exactamente el formato normalizado:
//       { id, current, yoy, asOf, verified, fuente, desc }
//
// refresh-drivers.js decide qué hacer con el error (mantener el último
// valor bueno guardado en KV) — estos fetchers no conocen KV ni el snapshot previo.
//
// IMPORTANT: los códigos de serie del INE (INE_SERIES) son el mejor esfuerzo a partir
// de la documentación pública del catálogo Tempus3 — este entorno de desarrollo no
// tiene salida de red hacia servicios.ine.es para verificarlos en vivo. Confirmar/ajustar
// contra https://servicios.ine.es/wstempus/js/ES/DATOS_SERIE/<codigo>?nult=2 en Vercel
// (que sí tiene salida a internet) antes de confiar en el dato en producción; si el
// código es incorrecto el fetcher simplemente falla y refresh-drivers.js conserva el
// último valor bueno — nunca rompe la UI.

const INE_BASE = 'https://servicios.ine.es/wstempus/js/ES';
const INE_SERIES = {
  // IPC nacional, índice general, tasa de variación interanual (mensual).
  inflacion: 'IPC251856',
  // ETCL: coste laboral por hora efectiva, índice general, valor absoluto €/hora (trimestral).
  laboral: 'ETCL2402',
  // IPRI, Fabricación de colorantes y pigmentos — valor de índice base 100 (anual).
  colorantes: 'IPR43052',
  // IPRI nacional, Total industria — valor de índice base 100 (anual, media anual).
  ipri_general: 'IPR41388',
};

function round1(n) { return Math.round(n * 10) / 10; }

async function fetchJson(url, opts) {
  const res = await fetch(url, { headers: { Accept: 'application/json' }, ...opts });
  if (!res.ok) throw new Error(`${url} respondió ${res.status}`);
  return res.json();
}

async function fetchIneSerie(codigo, nult) {
  const datos = await fetchJson(`${INE_BASE}/DATOS_SERIE/${codigo}?nult=${nult}`);
  const puntos = Array.isArray(datos && datos.Data) ? datos.Data : null;
  if (!puntos || puntos.length === 0) throw new Error(`INE ${codigo}: respuesta sin datos`);
  return puntos; // orden cronológico ascendente según la API Tempus3
}

function ineAsOf(punto) {
  if (!punto) return null;
  if (punto.Anyo && punto.NombrePeriodo) return `${punto.NombrePeriodo} ${punto.Anyo}`;
  if (punto.Fecha) return new Date(punto.Fecha).toISOString().slice(0, 10);
  return null;
}

// --- inflación (IPC, INE) ---
// La serie ya es una tasa interanual en %, así que "yoy" aquí es el cambio en
// puntos frente al dato anterior (igual que en el valor hardcodeado original).
async function fetchInflacion() {
  const puntos = await fetchIneSerie(INE_SERIES.inflacion, 2);
  const actual = puntos[puntos.length - 1];
  const anterior = puntos.length > 1 ? puntos[puntos.length - 2] : actual;
  const current = actual.Valor;
  const asOf = ineAsOf(actual);
  return {
    id: 'inflacion',
    current,
    yoy: round1(current - anterior.Valor),
    asOf,
    verified: true,
    fuente: 'INE',
    desc: `El IPC interanual se sitúa en el ${current}% según el último dato publicado por el INE (${asOf}).`,
  };
}

// --- tipos de interés (BCE, facilidad de depósito) ---
// Serie FM.B.U2.EUR.4F.KR.DFR.LEV del SDW del BCE. "yoy" es el cambio en puntos
// frente a la observación anterior (misma semántica que el valor hardcodeado original).
async function fetchTipos() {
  const json = await fetchJson(
    'https://data-api.ecb.europa.eu/service/data/FM/B.U2.EUR.4F.KR.DFR.LEV?lastNObservations=2&format=jsondata'
  );
  const dataSet = json && json.dataSets && json.dataSets[0];
  const seriesMap = dataSet && dataSet.series;
  const seriesKey = seriesMap && Object.keys(seriesMap)[0];
  const observaciones = seriesKey ? seriesMap[seriesKey].observations : null;
  const periodos = json && json.structure && json.structure.dimensions && json.structure.dimensions.observation && json.structure.dimensions.observation[0] && json.structure.dimensions.observation[0].values;
  if (!observaciones || !periodos) throw new Error('BCE: formato de respuesta inesperado');

  const indices = Object.keys(observaciones).map(Number).sort((a, b) => a - b);
  if (indices.length === 0) throw new Error('BCE: sin observaciones');
  const ultimoIdx = indices[indices.length - 1];
  const anteriorIdx = indices.length > 1 ? indices[indices.length - 2] : ultimoIdx;
  const current = observaciones[ultimoIdx][0];
  const previo = observaciones[anteriorIdx][0];
  const asOf = periodos[ultimoIdx] ? (periodos[ultimoIdx].name || periodos[ultimoIdx].id) : null;

  return {
    id: 'tipos',
    current,
    yoy: round1(current - previo),
    asOf,
    verified: true,
    fuente: 'BCE',
    desc: `El BCE sitúa la facilidad de depósito en el ${current}% en su última reunión (${asOf}).`,
  };
}

// --- coste laboral (ETCL, INE) ---
// Serie en valor absoluto €/hora (trimestral); "yoy" se calcula frente al
// mismo trimestre del año anterior (4 puntos atrás).
async function fetchLaboral() {
  const puntos = await fetchIneSerie(INE_SERIES.laboral, 5);
  const actual = puntos[puntos.length - 1];
  const haceUnAnyo = puntos.length >= 5 ? puntos[puntos.length - 5] : puntos[0];
  const current = actual.Valor;
  const yoy = round1(((current - haceUnAnyo.Valor) / haceUnAnyo.Valor) * 100);
  const asOf = ineAsOf(actual);
  return {
    id: 'laboral',
    current,
    yoy,
    asOf,
    verified: true,
    fuente: 'INE — ETCL',
    desc: `El coste laboral por hora efectiva se sitúa en ${current} €/hora (${asOf}), un ${yoy >= 0 ? '+' : ''}${yoy}% interanual (INE, ETCL).`,
  };
}

// --- colorantes / acabado textil (IPRI, Fabricación de colorantes y pigmentos, INE) ---
// Serie de índice base 100, un dato por año (media anual); "yoy" se calcula
// frente al año inmediatamente anterior.
async function fetchColorantes() {
  const puntos = await fetchIneSerie(INE_SERIES.colorantes, 2);
  const actual = puntos[puntos.length - 1];
  const anterior = puntos.length > 1 ? puntos[puntos.length - 2] : actual;
  const current = actual.Valor;
  const yoy = round1(((current - anterior.Valor) / anterior.Valor) * 100);
  const asOf = ineAsOf(actual);
  return {
    id: 'colorantes',
    current,
    yoy,
    asOf,
    verified: true,
    fuente: 'INE',
    desc: `El IPRI de bienes intermedios químicos (colorantes y acabados) varía un ${yoy >= 0 ? '+' : ''}${yoy}% interanual (${asOf}), INE.`,
  };
}

// --- coste de mercancía / IPRI general (Total industria, INE) ---
// Proxy del coste de reposición de mercancía para comercio: índice de precios
// industriales general, un dato por año (media anual); "yoy" se calcula
// frente al año inmediatamente anterior.
async function fetchIpriGeneral() {
  const puntos = await fetchIneSerie(INE_SERIES.ipri_general, 2);
  const actual = puntos[puntos.length - 1];
  const anterior = puntos.length > 1 ? puntos[puntos.length - 2] : actual;
  const current = actual.Valor;
  const yoy = round1(((current - anterior.Valor) / anterior.Valor) * 100);
  const asOf = ineAsOf(actual);
  return {
    id: 'ipri_general',
    current,
    yoy,
    asOf,
    verified: true,
    fuente: 'INE',
    desc: `El IPRI general (Total industria) varía un ${yoy >= 0 ? '+' : ''}${yoy}% interanual (${asOf}), INE — usado como proxy del coste de reposición de mercancía.`,
  };
}

// --- electricidad industrial (OMIE, precio medio del mercado diario) ---
const OMIE_BASE = 'https://www.omie.es/es/file-download';
const MESES_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function pad2(n) { return String(n).padStart(2, '0'); }

function addDaysUTC(date, dias) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + dias);
  return d;
}

function formatEsDate(date) {
  return `${date.getUTCDate()} ${MESES_ES[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { Accept: 'text/plain' } });
  if (!res.ok) throw new Error(`${url} respondió ${res.status}`);
  return res.text();
}

// Precio medio del mercado diario para un día concreto. El fichero
// MARGINALPDBC de OMIE trae dos columnas de precio (España/Portugal) que
// casi siempre coinciden; solo divergen puntualmente por congestión en la
// interconexión. Para no arriesgarnos a confundir el orden de las columnas
// (no verificable contra la documentación oficial desde este entorno sin
// salida a internet), se promedian ambas — el resultado es una media MIBEL
// prácticamente idéntica a la de España en la inmensa mayoría de las horas.
async function fetchOmieDayAvg(date) {
  const filename = `marginalpdbc_${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}.1`;
  const url = `${OMIE_BASE}?parents%5B0%5D=marginalpdbc&filename=${filename}`;
  const texto = await fetchText(url);
  const precios = [];
  texto.split('\n').forEach(linea => {
    const campos = linea.trim().replace(/;$/, '').split(';');
    if (campos.length < 6) return;
    const p1 = Number(campos[4]);
    const p2 = Number(campos[5]);
    if (Number.isFinite(p1)) precios.push(p1);
    if (Number.isFinite(p2)) precios.push(p2);
  });
  if (precios.length === 0) throw new Error(`OMIE ${filename}: sin precios parseables`);
  return precios.reduce((a, b) => a + b, 0) / precios.length;
}

// Reintenta hacia atrás en el tiempo: fin de semana/festivo con publicación
// tardía, o el cron ejecutándose antes de que OMIE publique el fichero de ayer.
async function fetchOmieDayAvgConReintentos(desde, maxIntentos) {
  let dia = desde;
  let ultimoError;
  for (let i = 0; i < maxIntentos; i++) {
    try {
      const media = await fetchOmieDayAvg(dia);
      return { dia, media };
    } catch (e) {
      ultimoError = e;
      dia = addDaysUTC(dia, -1);
    }
  }
  throw ultimoError;
}

async function fetchElectricidad() {
  const hoy = new Date();
  const ayer = addDaysUTC(new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate())), -1);
  const { dia, media } = await fetchOmieDayAvgConReintentos(ayer, 4);
  const diaAnyoAnterior = addDaysUTC(dia, -364); // mismo día de la semana, ~1 año antes
  const { media: mediaAnyoAnterior } = await fetchOmieDayAvgConReintentos(diaAnyoAnterior, 4);
  const current = round1(media);
  const yoy = round1(((media - mediaAnyoAnterior) / mediaAnyoAnterior) * 100);
  const asOf = formatEsDate(dia);
  return {
    id: 'electricidad',
    current,
    yoy,
    asOf,
    verified: true,
    fuente: 'OMIE',
    desc: `El precio medio del mercado diario fue de ${current} €/MWh el ${asOf}, un ${yoy >= 0 ? '+' : ''}${yoy}% interanual frente al mismo día de la semana de hace un año (OMIE).`,
  };
}

const SOURCES = [
  { id: 'inflacion', run: fetchInflacion },
  { id: 'tipos', run: fetchTipos },
  { id: 'laboral', run: fetchLaboral },
  { id: 'colorantes', run: fetchColorantes },
  { id: 'ipri_general', run: fetchIpriGeneral },
  { id: 'electricidad', run: fetchElectricidad },
];

module.exports = { SOURCES, fetchInflacion, fetchTipos, fetchLaboral, fetchColorantes, fetchIpriGeneral, fetchElectricidad };

// ---------------------------------------------------------------------------
// Fase 2 (sin implementar todavía) — resto de drivers de la tabla de fuentes.
// No tienen API oficial gratuita: requieren scraping (frágil, necesita tests
// de regresión) o un proveedor de datos de pago. Ver KAIROS-DATA-PIPELINE.md.
// ---------------------------------------------------------------------------
//
// aceite_oliva  -> MAPA / Infaoliva. Sin API pública estable; scraping de
//                  Infaoliva o boletín MAPA (Observatorio de Precios), semanal.
//                  Alternativa a evaluar: Poolred.
//
// aceite_vegetal -> Lonja de Tortosa / MAPA. Sin API pública; scraping del
//                  boletín de lonja, semanal. Convertir €/t -> €/kg.
//
// trigo         -> FEGA / lonjas regionales. Sin API unificada; scraping de
//                  agronewscastillayleon.com u otras lonjas, o boletín FEGA en
//                  PDF. Comprobar si FEGA publica CSV/Excel descargable.
//
// cerdo         -> MAPA / lonjas (Zamora, Salamanca, Segovia). Boletín semanal
//                  MAPA en PDF (mapa.gob.es/.../informe-semanal-precios-productos-ganaderos),
//                  parseable con una librería de extracción de tablas de PDF.
//
// pollo         -> MAPA / lonjas, mismo boletín semanal que cerdo. Dato débil,
//                  validar cobertura antes de confiar.
//
// pienso        -> FEGA / lonjas, mismo mecanismo semanal que trigo.
//
// algodon       -> ICE Futures U.S. No tiene API gratuita — requiere proveedor
//                  de pago/freemium (Trading Economics, Alpha Vantage, Nasdaq
//                  Data Link) para el contrato de algodón. Convertir ¢/lb -> €/kg.
//
// aluminio      -> LME. Igual que algodón: LME cash no es gratis. Alternativa
//                  freemium aproximada: metals-api.com. Convertir USD/t -> €/t.
//
// acero         -> Cámara de España, nota mensual en PDF/HTML sin API
//                  (https://www.camara.es/indice-precios-acero-corrugado-{mes}-2026).
//                  Scraping simple, la URL sigue un patrón predecible.
