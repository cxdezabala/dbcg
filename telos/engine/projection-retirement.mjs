// Motor de proyección — retiro (Abundance).
//
// Puerto directo de la constante REF y los métodos fitFace(age, annual) / project(lead)
// de `Telos Advisor.dc.html` (fuente de verdad visual y funcional del proyecto — ver
// README del handoff). No se recalculan ni reinterpretan valores aquí: esto es una
// extracción literal a un módulo ES probable en Node y en el navegador.
//
// Fuente de los datos: 21 ilustraciones reales, `uploads/abundance *.pdf`.
// Rejilla: edad de entrada 30/35/40/45/50/55 × face amount 75,000/147,000/200,000/322,500.
//
// Regla que no se negocia (PROMPT-claude-code.md §0.2): si la combinación no está
// respaldada por una ilustración real o por una interpolación válida entre anclas
// compatibles, project() devuelve `ok:false` y el llamador no debe mostrar cifras.

export const REF = {
  30: { set: 65, pts: [
    { fa: 75000, p: 2437.5, gcv: 107925, pv: 163924, o2: 997, o3: 569, db: [75107, 75609, 76880, 80341] },
    { fa: 147000, p: 4633.5, gcv: 211533, pv: 321292, o2: 1953, o3: 1115, db: [147210, 148193, 150684, 157468] },
    { fa: 200000, p: 6250, gcv: 287800, pv: 437132, o2: 2658, o3: 1517, db: [200285, 201623, 205012, 214242] },
    { fa: 322500, p: 9986.25, gcv: 464077.5, pv: 704875, o2: 4286, o3: 2446, db: [322960, 325118, 330582, 345465] }
  ] },
  35: { set: 65, pts: [
    { fa: 75000, p: 3057, gcv: 107925, pv: 154042, o2: 937, o3: 535, db: [75123, 75762, 77532, 82116] },
    { fa: 147000, p: 5847.72, gcv: 211533, pv: 301922, o2: 1836, o3: 1048, db: [147242, 148494, 151963, 160948] },
    { fa: 200000, p: 7902, gcv: 287800, pv: 410778, o2: 2498, o3: 1425, db: [200329, 202032, 206753, 218977] },
    { fa: 322500, p: 12650.1, gcv: 464077.5, pv: 662379, o2: 4027, o3: 2298, db: [323030, 325777, 333389, 353100] }
  ] },
  40: { set: 65, pts: [
    { fa: 75000, p: 3966, gcv: 107925, pv: 144783, o2: 880, o3: 502, db: [75172, 76132, 78653, 84709] },
    { fa: 147000, p: 7629.36, gcv: 211533, pv: 283776, o2: 1725, o3: 985, db: [147337, 149218, 154159, 166030] },
    { fa: 200000, p: 10326, gcv: 287800, pv: 386089, o2: 2347, o3: 1340, db: [200458, 203018, 209741, 225891] },
    { fa: 322500, p: 16558.8, gcv: 464077.5, pv: 622569, o2: 3785, o3: 2160, db: [323238, 327367, 338207, 364248] }
  ] },
  45: { set: 65, pts: [
    { fa: 75000, p: 5445, gcv: 107925, pv: 136070, o2: 827, o3: 472, db: [75248, 76728, 80297, 88547] },
    { fa: 147000, p: 10528.2, gcv: 211533, pv: 266697, o2: 1622, o3: 925, db: [147487, 150387, 157382, 173553] },
    { fa: 200000, p: 14270, gcv: 287800, pv: 362853, o2: 2206, o3: 1259, db: [200662, 204609, 214125, 236126] },
    { fa: 322500, p: 22918.5, gcv: 464077.5, pv: 585101, o2: 3557, o3: 2030, db: [323567, 329931, 345276, 380753] }
  ] },
  50: { set: 70, pts: [
    { fa: 75000, p: 8042.25, gcv: 131813.07, pv: 156292, o2: 1086, o3: 542, db: [75370, 77576, 83084, 127968] },
    { fa: 147000, p: 15618.81, gcv: 258353.62, pv: 306332, o2: 2129, o3: 1063, db: [147725, 152049, 162844, 250816] },
    { fa: 200000, p: 21196, gcv: 351501.52, pv: 416778, o2: 2897, o3: 1446, db: [200987, 206870, 221556, 341247] }
  ] },
  55: { set: 75, pts: [
    { fa: 147000, p: 26717.31, gcv: 315537.49, pv: 355876, o2: 2893, o3: 1235, db: [148244, 155433, 238576, 291382] },
    { fa: 200000, p: 36296, gcv: 429302.71, pv: 484186, o2: 3936, o3: 1680, db: [201692, 211474, 324593, 396438] }
  ] }
};

export const REF_AGES = [30, 35, 40, 45, 50, 55];
export const PREMIUM_END_AGE = 65;
export const ILL_RATE = 0.0408;
export const SETTLE_RATE = 0.0425;
export const SRC_DATE = '2026-08-14';
export const PROJECTION_VERSION = 'abundance-ref-2026.08';

function money(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

// Interpola linealmente sobre el face amount dentro de una edad de entrada exacta.
export function fitFace(age, annual) {
  const entry = REF[age];
  if (!entry) return null;
  const pts = entry.pts;
  if (annual < pts[0].p * 0.995 || annual > pts[pts.length - 1].p * 1.005) return null;
  let lo = pts[0], hi = pts[pts.length - 1];
  for (let i = 0; i < pts.length - 1; i++) {
    if (annual >= pts[i].p && annual <= pts[i + 1].p) { lo = pts[i]; hi = pts[i + 1]; }
  }
  const t = hi.p === lo.p ? 0 : (annual - lo.p) / (hi.p - lo.p);
  const L = (a, b) => a + (b - a) * t;
  const exact = pts.find(p => Math.abs(p.p - annual) / p.p < 0.005);
  return {
    set: entry.set, fa: exact ? exact.fa : L(lo.fa, hi.fa),
    gcv: exact ? exact.gcv : L(lo.gcv, hi.gcv),
    pv: exact ? exact.pv : L(lo.pv, hi.pv),
    o2: exact ? exact.o2 : L(lo.o2, hi.o2),
    o3: exact ? exact.o3 : L(lo.o3, hi.o3),
    db: [0, 1, 2, 3].map(i => exact ? exact.db[i] : L(lo.db[i], hi.db[i])),
    exactFa: !!exact, faLabel: exact ? 'FA' + exact.fa : null
  };
}

/**
 * lead: { current_age, annual_contribution }
 * Devuelve { ok:false, reason, ... } o { ok:true, is_exact_projection, confidence_level,
 * interpolation_method, source_projection_ids, settlement, years, gcv, projected, ... }.
 */
export function project(lead) {
  const age = lead.current_age, annual = lead.annual_contribution;
  const stamp = SRC_DATE + ' 09:12', version = PROJECTION_VERSION;
  const fail = reason => ({
    ok: false, reason, is_exact_projection: false, confidence_level: 'No disponible',
    interpolation_method: 'No aplicable', source_projection_ids: [],
    calculation_timestamp: stamp, projection_version: version
  });

  if (age < REF_AGES[0] || age > REF_AGES[REF_AGES.length - 1]) {
    return fail('La edad de entrada (' + age + ') está fuera del rango cubierto por las ilustraciones disponibles (30–55).');
  }

  const years = PREMIUM_END_AGE - age;
  if (years < 5) {
    return fail('El periodo de aportación hasta los 65 años es demasiado corto para estimarlo sobre las ilustraciones disponibles.');
  }

  if (REF[age]) {
    const f = fitFace(age, annual);
    if (!f) return fail('La aportación anual (' + money(annual) + ') queda fuera del rango de primas ilustradas para la edad ' + age + '.');
    const ids = f.exactFa ? ['ILL-' + age + 'A-' + f.faLabel] : ['ILL-' + age + 'A-FA75000 … FA322500'];
    return {
      ok: true, is_exact_projection: f.exactFa, confidence_level: f.exactFa ? 'Alta' : 'Media',
      interpolation_method: f.exactFa ? 'Ninguna · ilustración directa' : 'Lineal sobre face amount dentro de la edad ' + age,
      source_projection_ids: ids, settlement: f.set, years, premium_end_age: PREMIUM_END_AGE,
      total: annual * years, gcv: f.gcv, projected: f.pv, income: f.o2, income3: f.o3,
      face: f.fa, db: f.db, rate: ILL_RATE, settleRate: SETTLE_RATE,
      calculation_timestamp: stamp, projection_version: version
    };
  }

  const lo = [...REF_AGES].reverse().find(x => x < age), hi = REF_AGES.find(x => x > age);
  if (lo === undefined || hi === undefined) return fail('No existen ilustraciones que acoten esta edad de entrada.');
  if (REF[lo].set !== REF[hi].set) {
    return fail('Las ilustraciones que acotan la edad ' + age + ' tienen edades de settlement distintas (' + REF[lo].set + ' y ' + REF[hi].set + '). No es válido interpolar entre ellas.');
  }
  const a = fitFace(lo, annual), b = fitFace(hi, annual);
  if (!a || !b) return fail('La aportación anual (' + money(annual) + ') queda fuera del rango de primas ilustradas para las edades ' + lo + ' y ' + hi + '.');
  const t = (age - lo) / (hi - lo), L = (x, y) => x + (y - x) * t;
  return {
    ok: true, is_exact_projection: false, confidence_level: 'Media',
    interpolation_method: 'Lineal sobre face amount dentro de cada edad, después lineal entre las edades ' + lo + ' y ' + hi + ' (t=' + t.toFixed(2) + ')',
    source_projection_ids: ['ILL-' + lo + 'A', 'ILL-' + hi + 'A'],
    settlement: REF[lo].set, years, premium_end_age: PREMIUM_END_AGE,
    total: annual * years, gcv: L(a.gcv, b.gcv), projected: L(a.pv, b.pv),
    income: L(a.o2, b.o2), income3: L(a.o3, b.o3), face: L(a.fa, b.fa),
    db: [0, 1, 2, 3].map(i => L(a.db[i], b.db[i])),
    rate: ILL_RATE, settleRate: SETTLE_RATE, calculation_timestamp: stamp, projection_version: version
  };
}
