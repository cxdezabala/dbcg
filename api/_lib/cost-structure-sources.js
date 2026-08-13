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
//
// sectorLabels: nombres EXACTOS de división CNAE-2009 tal como los usa el
// INE en la tabla "Principales magnitudes según actividad principal" (p.ej.
// "Nacional. Gastos de personal. Industria de la alimentación. Dato base.").
// El código CNAE numérico NO aparece en ese texto — solo sirve aquí como
// referencia/documentación. Cuando un sector de Kairos agrupa varias
// divisiones CNAE (p.ej. manufactura = metalurgia + productos metálicos +
// vehículos de motor), se suman los valores de todas las divisiones
// listadas. Confirmado contra datos reales del INE (12 ago 2026) para
// manufactura/alimentacion/textil (macroSector industrial); comercio,
// hosteleria y transporte usan la nomenclatura oficial CNAE-2009 pero aún
// no se han verificado contra la respuesta real de sus tablas EEE.
const CNAE_POR_SECTOR = {
  manufactura: {
    macroSector: 'industrial',
    cnae: ['24', '25', '29'],
    etiqueta: 'metalurgia y vehículos de motor',
    sectorLabels: [
      'Metalurgia; fabricación de productos de hierro, acero y ferroaleaciones',
      'Fabricación de productos metálicos, excepto maquinaria y equipo',
      'Fabricación de vehículos de motor, remolques y semirremolques',
    ],
  },
  alimentacion: {
    macroSector: 'industrial',
    cnae: ['10'],
    etiqueta: 'industria de la alimentación',
    sectorLabels: ['Industria de la alimentación'],
  },
  textil: {
    macroSector: 'industrial',
    cnae: ['13', '14'],
    etiqueta: 'industria textil y confección',
    sectorLabels: ['Industria textil', 'Confección de prendas de vestir'],
  },
  comercio: {
    macroSector: 'comercio',
    cnae: ['45', '46', '47'],
    etiqueta: 'comercio al por mayor y al por menor',
    sectorLabels: [
      'Venta y reparación de vehículos de motor y motocicletas',
      'Comercio al por mayor e intermediarios del comercio, excepto de vehículos de motor y motocicletas',
      'Comercio al por menor, excepto de vehículos de motor y motocicletas',
    ],
  },
  hosteleria: {
    macroSector: 'servicios',
    cnae: ['55', '56'],
    etiqueta: 'hostelería',
    sectorLabels: ['Servicios de alojamiento', 'Servicios de comidas y bebidas'],
  },
  transporte: {
    macroSector: 'servicios',
    cnae: ['49', '50', '51', '52', '53'],
    etiqueta: 'transporte y almacenamiento',
    sectorLabels: [
      'Transporte terrestre y por tubería',
      'Transporte marítimo y por vías navegables interiores',
      'Transporte aéreo',
      'Almacenamiento y actividades anexas al transporte',
      'Actividades postales y de correos',
    ],
  },
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

// La EEE no tiene una tabla por magnitud: todo vive en UNA tabla ancha
// ("Principales magnitudes según actividad principal (CNAE-2009 a 1, 2, 3 y 4
// dígitos)"), con una fila por combinación magnitud × división CNAE. Cada
// fila se nombra así (confirmado contra datos reales del INE, 12 ago 2026):
//   "Nacional. Gastos de personal. Industria de la alimentación. Dato base."
// El código CNAE numérico no aparece nunca en el texto — solo el nombre
// oficial de la división. Cada operación (industrial/comercio/servicios)
// suele tener DOS versiones de esta tabla: una serie antigua descontinuada
// y la vigente (mismo título, Id distinto) — se elige la de
// Ultima_Modificacion más reciente.
const TABLA_PRINCIPALES_MAGNITUDES_REGEX = /principales magnitudes/i;
const TABLA_ACTIVIDAD_PRINCIPAL_REGEX = /actividad principal/i;

function normalizarNombre(nombre) {
  return (nombre || '').replace(/\s+/g, ' ').trim();
}

function valorParaMagnitudYLabel(filas, magnitud, label) {
  // Las tablas de industria usan "Nacional. {magnitud}...", pero las de
  // comercio/servicios usan "Total Nacional. {magnitud}..." — confirmado
  // contra datos reales del INE (12 ago 2026) para la operación de Comercio.
  const sufijo = `${magnitud}. ${label}.`;
  const fila = filas.find(f => {
    const nombre = normalizarNombre(f.Nombre);
    return (nombre.startsWith(`Nacional. ${sufijo}`) || nombre.startsWith(`Total Nacional. ${sufijo}`))
      && /dato base\.?$/i.test(nombre);
  });
  const dato = fila && Array.isArray(fila.Data) ? fila.Data[0] : null;
  if (!dato || typeof dato.Valor !== 'number') return null;
  return { valor: dato.Valor, anyo: dato.Anyo };
}

function sumarMagnitudSobreLabels(filas, magnitud, labels) {
  let total = 0;
  let anyo = null;
  for (const label of labels) {
    const encontrado = valorParaMagnitudYLabel(filas, magnitud, label);
    if (!encontrado) throw new Error(`EEE: no se encontró "${magnitud}" para "${label}"`);
    total += encontrado.valor;
    anyo = encontrado.anyo || anyo;
  }
  return { total, anyo };
}

async function fetchEEERatios(macroSector, sectorLabels, etiqueta) {
  const operacion = EEE_OPERACION[macroSector];
  if (!operacion) throw new Error(`EEE: sin operación configurada para "${macroSector}"`);
  const tablas = await fetchJson(`${INE_BASE}/TABLAS_OPERACION/${operacion}?det=0`);
  if (!Array.isArray(tablas) || tablas.length === 0) throw new Error('EEE: la operación no devolvió tablas');

  const candidatas = tablas.filter(t =>
    TABLA_PRINCIPALES_MAGNITUDES_REGEX.test(t.Nombre || '') && TABLA_ACTIVIDAD_PRINCIPAL_REGEX.test(t.Nombre || '')
  );
  if (candidatas.length === 0) throw new Error('EEE: no se encontró la tabla "Principales magnitudes según actividad principal"');
  const tabla = candidatas.reduce((mejor, actual) => {
    const fechaActual = new Date(actual.Ultima_Modificacion || 0).getTime();
    const fechaMejor = new Date(mejor.Ultima_Modificacion || 0).getTime();
    return fechaActual > fechaMejor ? actual : mejor;
  });

  const filas = await fetchJson(`${INE_BASE}/DATOS_TABLA/${tabla.Id}?nult=1`);
  if (!Array.isArray(filas) || filas.length === 0) throw new Error(`EEE: la tabla ${tabla.Id} no devolvió filas`);

  const cifra = sumarMagnitudSobreLabels(filas, 'Cifra de negocios', sectorLabels);
  const personal = sumarMagnitudSobreLabels(filas, 'Gastos de personal', sectorLabels);
  const compras = sumarMagnitudSobreLabels(filas, 'Total de compras de bienes y servicios', sectorLabels);
  if (!(cifra.total > 0)) throw new Error(`EEE: cifra de negocio no positiva para "${etiqueta}"`);

  const anyo = (cifra.anyo || personal.anyo || compras.anyo || new Date().getFullYear()) + '';
  return {
    personal_pct: (personal.total / cifra.total) * 100,
    consumos_pct: (compras.total / cifra.total) * 100,
    asOf: anyo,
  };
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
  const eeeRatios = await fetchEEERatios(cfg.macroSector, cfg.sectorLabels, cfg.etiqueta);
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
