// Serverless function — NO está en el cron diario de vercel.json a propósito:
// la fuente (INE, Estadística Estructural de Empresas) es anual, así que no
// tiene sentido refrescar esto todos los días. Se dispara a mano (o con un
// cron de baja frecuencia si se añade más adelante).
//
// Para cada sector con mapeo CNAE conocido (ver cost-structure-sources.js):
// trae los ratios oficiales del INE y le pide a un modelo que reasigne las
// partidas específicas actuales de Kairos dentro de esas categorías
// oficiales. Si algo falla (fuente INE no localizada, OPENAI_API_KEY no
// configurada, respuesta del modelo inválida), conserva la última estructura
// buena guardada en KV — nunca rompe ni muestra un dato inventado.

const { getCostStructuresSnapshot, saveCostStructuresSnapshot } = require('./_lib/kv');
const { reconcileSector } = require('./_lib/cost-structure-sources');

// Nombre y estructura actual (editorial) de los sectores que sí tienen mapeo
// CNAE — debe reflejar lo que hay en SECTORS_RAW dentro de kairos.html. Si se
// edita la estructura de referencia allí, actualizar también aquí.
const SECTORES_A_RECONCILIAR = {
  manufactura: { nombre: 'Industria del metal y automoción', estructura: [['Acero laminado', 41], ['Energía', 10], ['Componentes', 14], ['Personal', 25], ['Otros', 10]] },
  alimentacion: { nombre: 'Industria de la alimentación', estructura: [['Materia prima', 45], ['Energía', 8], ['Envase', 10], ['Personal', 27], ['Otros', 10]] },
  textil: { nombre: 'Textil y confección', estructura: [['Algodón fibra', 36], ['Energía', 8], ['Colorantes y acabado', 10], ['Personal', 33], ['Otros', 13]] },
  comercio: { nombre: 'Comercio', estructura: [['Mercancía / compra de producto', 40], ['Alquiler local', 12], ['Personal', 28], ['Energía', 5], ['Otros', 15]] },
  hosteleria: { nombre: 'Hostelería y turismo', estructura: [['Materia prima (alimentos y bebida)', 32], ['Personal', 30], ['Alquiler local', 10], ['Energía', 8], ['Otros', 20]] },
  transporte: { nombre: 'Transporte y logística', estructura: [['Combustible', 35], ['Personal (conductores)', 30], ['Mantenimiento y flota', 12], ['Peajes', 8], ['Otros', 15]] },
};

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers['authorization'] !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

  const previo = await getCostStructuresSnapshot();
  const previoPorSector = (previo && previo.sectores) || {};

  const sectorIds = Object.keys(SECTORES_A_RECONCILIAR);
  const resultados = await Promise.allSettled(
    sectorIds.map(id => reconcileSector(id, SECTORES_A_RECONCILIAR[id].nombre, SECTORES_A_RECONCILIAR[id].estructura))
  );

  const sectores = { ...previoPorSector };
  const errores = [];

  resultados.forEach((resultado, i) => {
    const id = sectorIds[i];
    if (resultado.status === 'fulfilled' && resultado.value) {
      sectores[id] = resultado.value;
      return;
    }
    errores.push({ id, error: (resultado.reason && resultado.reason.message) || String(resultado.reason) });
    // no se toca sectores[id]: se queda con la última estructura buena (o ausente si nunca hubo una)
  });

  const snapshot = await saveCostStructuresSnapshot(sectores);

  res.status(200).json({
    ok: true,
    updatedAt: snapshot.updatedAt,
    count: Object.keys(sectores).length,
    errores,
  });
};
