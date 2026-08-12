// Prefijo "_" => Vercel no convierte este directorio en una ruta pública.

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// "13 ago 2026" — mismo formato que los puntos hardcodeados de DRIVERS_HISTORY,
// para que un histórico real y uno de referencia se puedan concatenar sin que
// se note el empalme en el eje del gráfico.
function formatFechaCorta(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

module.exports = { formatFechaCorta };
