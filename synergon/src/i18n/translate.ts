// Port of reference/synergon-i18n.js. The prototype translated the rendered DOM by looking up
// each English text node; here the same dictionary (messages/es.json → "dict") and the same
// pattern rules are applied explicitly through t() in every component.
export type Locale = 'en' | 'es';
export type Dict = Map<string, string>;

const MON: Record<string, string> = { Jan: 'ene', Feb: 'feb', Mar: 'mar', Apr: 'abr', May: 'may', Jun: 'jun', Jul: 'jul', Aug: 'ago', Sep: 'sep', Oct: 'oct', Nov: 'nov', Dec: 'dic' };
const MONL: Record<string, string> = { Jan: 'Ene', Feb: 'Feb', Mar: 'Mar', Apr: 'Abr', May: 'May', Jun: 'Jun', Jul: 'Jul', Aug: 'Ago', Sep: 'Sep', Oct: 'Oct', Nov: 'Nov', Dec: 'Dic' };

type Rule = [RegExp, string | ((m: RegExpMatchArray, D: Dict) => string)];
const RULES: Rule[] = [
  [/^Good morning, (.+)\.$/, 'Buenos días, $1.'], [/^Good afternoon, (.+)\.$/, 'Buenas tardes, $1.'], [/^Good evening, (.+)\.$/, 'Buenas noches, $1.'],
  [/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/, m => MONL[m[1]]], [/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})$/, m => MONL[m[1]] + ' ' + m[2]], [/^(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/, m => m[1] + ' ' + MON[m[2]]],
  [/^(\d+) opportunities$/, '$1 oportunidades'], [/^(\d+) opps?$/, '$1 opp.'], [/^(\d+) deals$/, '$1 operaciones'], [/^target (.+)$/, 'objetivo $1'], [/^(\d+%) of quota$/, '$1 de la cuota'], [/^(\d+) executives$/, '$1 ejecutivos'], [/^lead (.+)$/, 'responsable $1'], [/^(\d+) teams$/, '$1 equipos'], [/^(\d+) months$/, '$1 meses'], [/^> 36 months$/, '> 36 meses'], [/^(\d+) employees$/, '$1 empleados'],
  [/^(€[\d.]+[MBk]) of (€[\d.]+[MBk])$/, '$1 de $2'], [/^(€[\d.]+M) open$/, '$1 abierto'], [/^Top 25 of (\d+) by value$/, 'Top 25 de $1 por valor'], [/^Last 10 of (\d+)$/, 'Últimos 10 de $1'], [/^(\d+)\/(\d+) watched$/, '$1/$2 vistos'],
  [/^Step (\d+): (.+)$/, (m, D) => 'Paso ' + m[1] + ': ' + (D.get(m[2]) || m[2])], [/^Next: (.+)$/, (m, D) => 'Siguiente: ' + (D.get(m[1]) || m[1])],
  [/^Win rate (\d+%) and (\d+%) of quota with 2 months left\. (\d+%) of your pipeline is still early-stage — advance (.+) and protect the Banco Ribera negotiation\.$/, 'Tasa de éxito $1 y $2 de la cuota a 2 meses del cierre. El $3 de tu pipeline sigue en fases iniciales — avanza $4 y protege la negociación con Banco Ribera.'],
  [/^Your own pipeline is (\d+%) of the team — your leverage is coaching: the team wins (\d+%) by value\.$/, 'Tu pipeline propio es el $1 del equipo — tu palanca es el coaching: el equipo gana el $2 por valor.'],
  [/^Your team carries (\d+%) of the Europe BU pipeline\. Coach (.+) \(lowest win rate, (\d+%)\) and move (\d+%) early-stage pipeline forward\.$/, 'Tu equipo aporta el $1 del pipeline de la UN Europa. Haz coaching a $2 (menor tasa de éxito, $3) y avanza el $4 del pipeline en fases iniciales.'],
  [/^(.+) holds (\d+%) of Asterion pipeline with a (\d+%) win rate\. Top executive: (.+)\.$/, '$1 concentra el $2 del pipeline de Asterion con una tasa de éxito del $3. Principal ejecutivo: $4.'],
  [/^Organisation win rate (\d+%), (\d+%) of target\. (.+) converts best \((\d+%)\); (.+) needs attention \((\d+%)\)\.$/, 'Tasa de éxito de la organización $1, $2 del objetivo. $3 convierte mejor ($4); $5 requiere atención ($6).'],
  [/^Lead with (.+), open with (.+) \((.+)\) and pitch “(.+)”\.$/, 'Lidera con $1, abre con $2 ($3) y propón “$4”.'],
  [/^(\d+) steps? left\. Use “Apply AI picks” to prepare in one click\.$/, 'Quedan $1 pasos. Usa “Aplicar selección de IA” para prepararlo en un clic.'], [/^You are ready — generate the meeting brief\.$/, 'Estás listo — genera el brief de reunión.'],
  [/^Viewing as (.+) — (.+)$/, (m, D) => 'Viendo como ' + m[1] + ' — ' + (D.get(m[2]) || m[2])],
  // SYNERGON MVP additions — dynamic strings (names, counts) composed at runtime
  [/^(€[\d.]+[MBk]) of (€[\d.]+[MBk]) won$/, '$1 de $2 ganado'],
  [/^(€[\d.]+[MBk]) of (€[\d.]+[MBk]) · (.+)$/, (m, D) => m[1] + ' de ' + m[2] + ' · ' + (D.get(m[3]) || m[3])],
  [/^(\d+) days ago$/, 'hace $1 días'],
  [/^(\d+) h ago$/, 'hace $1 h'], [/^(\d+) min ago$/, 'hace $1 min'], [/^(\d+) d ago$/, 'hace $1 d'],
  [/^launched the strategic initiative “(.+)”\.$/, 'lanzó la iniciativa estratégica “$1”.'],
  [/^contributed expertise to “(.+)”: sequence agent-assist before automation\.$/, 'aportó expertise a “$1”: agent-assist antes que automatización.'],
  [/^(Your Meridian solution is linked\. )?Teams: (.+)\. Kick-off 14 Nov · shared proposition team with Sofia Chen\.$/, m => (m[1] ? 'Tu solución Meridian está vinculada. ' : '') + 'Equipos: ' + m[2] + '. Arranque el 14 nov · equipo de propuesta compartido con Sofia Chen.'],
  [/^(\d+) of (\d+) integrations connected$/, '$1 de $2 integraciones conectadas'],
  [/^Align with initiative: (.+)$/, 'Alinearse con la iniciativa: $1'],
  [/^Advance Meridian solution — stage (\d) of 7$/, 'Avanzar la solución de Meridian — etapa $1 de 7'],
  [/^Validate (\d+) knowledge contributions$/, 'Validar $1 aportaciones de conocimiento'],
  [/^Review emerging pattern: AI customer operations \((\d+) executives, 3 BUs\)$/, 'Revisar el patrón emergente: operaciones de cliente con IA ($1 ejecutivos, 3 UN)'],
  [/^(\d+) executives across 3 business units are exploring AI-enabled customer operations\.$/, '$1 ejecutivos de 3 unidades de negocio están explorando operaciones de cliente con IA.'],
  [/^“—” = suppressed: group below minimum size of (\d+) \(privacy threshold\)$/, '“—” = suprimido: grupo por debajo del tamaño mínimo de $1 (umbral de privacidad)'],
  [/^Suppressed: group of (\d+) is below the minimum size of (\d+)$/, 'Suprimido: el grupo de $1 está por debajo del tamaño mínimo de $2'],
  [/^Restricted — (.+) is outside your authorised scope \(owned by (.+)\)$/, 'Restringido — $1 está fuera de tu alcance autorizado (responsable: $2)'],
  [/^Signal connected to (.+) — visible in Commercial Intelligence$/, 'Señal conectada a $1 — visible en Inteligencia Comercial'],
  [/^Opened existing solution “(.+)”( — signal imported)?$/, m => 'Abierta la solución existente “' + m[1] + '”' + (m[2] ? ' — señal importada' : '')],
  [/^Solution design created with account intelligence from (.+)$/, 'Diseño de solución creado con la inteligencia de cuenta de $1'],
  [/^Contribution requested from (.+?)( — simulated response in a few seconds)?$/, m => 'Aportación solicitada a ' + m[1] + (m[2] ? ' — respuesta simulada en unos segundos' : '')],
  [/^(.+) connected to “(.+)”$/, '$1 conectado a “$2”'],
  [/^Sofia Chen contributed to “(.+)”$/, 'Sofia Chen aportó a “$1”'],
  [/^Approach ([ABC]) selected — architecture pre-filled$/, 'Enfoque $1 seleccionado — arquitectura precargada'],
  [/^Policy updated — SYNERGON Command heatmap now suppresses groups < (\d+)$/, 'Política actualizada — el mapa de calor de SYNERGON Command suprime ahora grupos < $1'],
  [/^Initiative launched — now visible to (\d+) teams\. Switch to Executive to see the impact\.$/, 'Iniciativa lanzada — ya visible para $1 equipos. Cambia a Ejecutivo para ver el impacto.'],
  [/^Initiative “(.+)” is live — visible to (\d+) teams$/, 'La iniciativa “$1” está activa — visible para $2 equipos'],
  [/^Initiative live: (\d+)% · (\d+) teams$/, 'Iniciativa activa: $1% · $2 equipos'],
  [/^Hypothesis already drafted for (.+)$/, 'Ya hay una hipótesis redactada para $1'],
  [/^No Radar360 signal connected to (.+)$/, 'No hay señal Radar360 conectada a $1'],
  [/^(.+) sync queued$/, 'Sincronización de $1 en cola'],
  [/^Demo: opens (.+) in a new tab in production$/, 'Demo: en producción abre $1 en una pestaña nueva'],
  [/^Demo: opens (.+) in production$/, 'Demo: en producción abre $1'],
  [/^Demo: searches LinkedIn for “(.+)”$/, 'Demo: busca en LinkedIn “$1”'],
  [/^Team · (.+)$/, (m, D) => 'Equipo · ' + (D.get(m[1]) || m[1])],
  [/^Executives · (.+)$/, 'Ejecutivos · $1'],
  [/^Each executive’s share of (.+)$/, 'Peso de cada ejecutivo en $1'],
  [/^(\d+) of (\d+)$/, '$1 de $2'],
  [/^for (.+)$/, (m, D) => 'para ' + (D.get(m[1]) || D.get(m[1].charAt(0).toUpperCase() + m[1].slice(1)) || m[1])],
  [/^Sector ([\d.]+%)$/, 'Sector $1'],
  [/^([+-][\d.]+) pts vs sector$/, '$1 pts vs sector'],
  [/^(€[\d,]+) per employee$/, '$1 por empleado'],
  [/^([\d,]+) leaders$/, '$1 líderes'],
  [/^Reported (\d{4})$/, 'Reportado $1'],
  [/^Annual report (\d{4})$/, 'Informe anual $1'],
  [/^Next: (.+)$/, (m, D) => 'Siguiente: ' + (D.get(m[1]) || m[1])],
  [/^Margin ([\d.]+) pts above sector — capacity to invest; frame around growth\.( Figures are estimates: validate them early\.)?$/, m => 'Margen ' + m[1] + ' pts por encima del sector — capacidad de inversión; enfoca en crecimiento.' + (m[2] ? ' Las cifras son estimaciones: valídalas pronto.' : '')],
  [/^Margin ([\d.]+) pts below sector — cost pressure likely; frame around efficiency\.( Figures are estimates: validate them early\.)?$/, m => 'Margen ' + m[1] + ' pts por debajo del sector — probable presión de costes; enfoca en eficiencia.' + (m[2] ? ' Las cifras son estimaciones: valídalas pronto.' : '')],
  [/^Start with (.+) \((.+)\)\. (\d+) key stakeholders? still need an introduction\.$/, 'Empieza por $1 ($2). $3 stakeholders clave aún necesitan presentación.'],
  [/^Start with (.+) \((.+)\)\. All key stakeholders are reachable\.$/, 'Empieza por $1 ($2). Todos los stakeholders clave son accesibles.'],
  [/^(\d+) business units? with high fit\. Lead with (.+?) — (.+)$/, '$1 unidades de negocio con alto encaje. Lidera con $2 — $3'],
  [/^Main threat: (.+?)\. (.+)$/, 'Principal amenaza: $1. $2'],
  [/^Main loss driver: (.+) — review pricing strategy with Hannah Ortiz \(value modelling\)\.$/, (m, D) => 'Principal causa de pérdida: ' + (D.get(m[1].charAt(0).toUpperCase() + m[1].slice(1)) || m[1]).toLowerCase() + ' — revisa la estrategia de precios con Hannah Ortiz (modelado de valor).'],
  [/^Your own pipeline is (\d+%) of the team — your leverage is coaching: the team wins (\d+%) by value\.$/, 'Tu pipeline propio es el $1 del equipo — tu palanca es el coaching: el equipo gana el $2 por valor.'],
  [/^(.+) · (\d+) min this month$/, '$1 · $2 min este mes'],
  [/^(\d+) lessons completed this month · 1 capability evidence validated \(business case, Oct\) · completion ≠ demonstrated competence$/, '$1 lecciones completadas este mes · 1 evidencia de capacidad validada (caso de negocio, oct) · completar ≠ competencia demostrada'],
  [/^(.+) · (\d+)\/(\d+) watched$/, '$1 · $2/$3 vistos'],
  [/^Step (\d+): (.+)$/, (m, D) => 'Paso ' + m[1] + ': ' + (D.get(m[2]) || m[2])],
  [/^Scope: Asterion · 6 teams · 60 executives$/, 'Alcance: Asterion · 6 equipos · 60 ejecutivos'],
  [/^Scope: (.+)$/, (m, D) => 'Alcance: ' + (D.get(m[1]) || m[1])],
];

export function makeDict(pairs: [string, string][] | undefined): Dict { return new Map(pairs || []); }

function tr(k: string, D: Dict): string | null {
  const hit = D.get(k);
  if (hit != null) return hit;
  for (const [re, rep] of RULES) { const m = k.match(re); if (m) return typeof rep === 'function' ? rep(m, D) : k.replace(re, rep); }
  return null;
}

/** Translate one UI string (exact entry, pattern rule, or "·"/"—"-separated compound). */
export function translate(s: string, locale: Locale, D: Dict): string {
  if (locale !== 'es' || !s) return s;
  const k = s.trim(); if (!k) return s;
  let t = tr(k, D);
  if (t == null && /[·—]/.test(k)) {
    let ch = false;
    const out = k.split(/(\s*[·—]\s*)/).map(p => { if (!p.trim() || /^\s*[·—]\s*$/.test(p)) return p; const x = tr(p.trim(), D); if (x != null) { ch = true; return x; } return p; });
    t = ch ? out.join('') : null;
  }
  if (t == null) return s;
  return (s.match(/^\s*/)![0]) + t + (s.match(/\s*$/)![0]);
}
export type TFn = (s: string) => string;
