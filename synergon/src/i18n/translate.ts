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
