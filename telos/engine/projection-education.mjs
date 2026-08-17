// Motor de proyección — educación (Education 15).
//
// Puerto directo de la constante EDU_REF y los métodos eduBand/eduInterpAge/eduCurve/
// eduFace/projectEducation(lead) de `Telos Advisor.dc.html` (fuente de verdad). No se
// reinventa la mecánica aquí — ver PROJECTIONS-model.md §2 y PROMPT-claude-code.md §5
// para el razonamiento detrás de cada constante.
//
// EDU_REF ya está normalizado a $100,000 de face amount interno (el valor proyectado
// escala linealmente en FA — verificado, 200k = 2×100k sin desviación) y NO depende de
// la edad del hijo: la curva es la misma para un hijo de 0 y uno de 3 años del mismo
// padre; la edad del hijo solo decide en qué año se lee (`18 − edad_hijo`).
//
// La ancla de la edad 32 es derivada de EDU-REF-32-02-070 (FA 70,000), normalizada a la
// base de $100,000 (×100/70) — su `rate` (prima por $1,000 de FA) quita el factor de
// banda de FA pequeño: 4,443.80 / 70 / 1.009 = 62.9166. Ver el test de consistencia en
// telos/test/edu-curves-consistency.test.mjs, que re-deriva esta tabla desde
// telos/data/edu-curves.json (el dataset crudo) y confirma que no hay desviación.
//
// Fuente de los datos: 12 ilustraciones reales, `uploads/education 15 *.pdf`.

export const EDU_REF = {
  30: { rate: 62.65, c: { 1: { p: 149, g: 0, d: 100149 }, 5: { p: 24235, g: 23312, d: 100923 }, 10: { p: 62006, g: 58258, d: 103748 }, 15: { p: 113043, g: 100000, d: 113043 }, 16: { p: 117655, g: 104080, d: 117655 }, 17: { p: 122456, g: 108326.46, d: 122456 }, 18: { p: 127452, g: 112746.18, d: 127452 } } },
  // Derivada de EDU-REF-32-02-070 (FA 70,000), normalizada × 100/70 a la base de $100,000.
  32: { rate: 62.9166, c: { 1: { p: 150, g: 0, d: 100150 }, 5: { p: 24291.43, g: 23328, d: 100964.29 }, 10: { p: 62165.71, g: 58256, d: 103908.57 }, 15: { p: 113315.71, g: 100000, d: 113315.71 }, 16: { p: 117940, g: 104080, d: 117940 }, 17: { p: 122751.43, g: 108326.46, d: 122751.43 }, 18: { p: 127760, g: 112746.18, d: 127760 } } },
  35: { rate: 63.31, c: { 1: { p: 160, g: 0, d: 100160 }, 5: { p: 24425, g: 23338, d: 101087 }, 10: { p: 62527, g: 58232, d: 104295 }, 15: { p: 113919, g: 100000, d: 113919 }, 16: { p: 118567, g: 104080, d: 118567 }, 17: { p: 123405, g: 108326.46, d: 123405 }, 18: { p: 128440, g: 112746.18, d: 128440 } } },
  40: { rate: 63.69, c: { 1: { p: 222, g: 0, d: 100222 }, 5: { p: 24826, g: 23296, d: 101530 }, 10: { p: 63474, g: 58108, d: 105366 }, 15: { p: 115430, g: 100000, d: 115430 }, 16: { p: 120139, g: 104080, d: 120139 }, 17: { p: 125041, g: 108326.46, d: 125041 }, 18: { p: 130143, g: 112746.18, d: 130143 } } },
  45: { rate: 64.96, c: { 1: { p: 314, g: 0, d: 100314 }, 5: { p: 25430, g: 23194, d: 102236 }, 10: { p: 64897, g: 57977, d: 106920 }, 15: { p: 117844, g: 100000, d: 117844 }, 16: { p: 122652, g: 104080, d: 122652 }, 17: { p: 127656, g: 108326.46, d: 127656 }, 18: { p: 132865, g: 112746.18, d: 132865 } } }
};

export const EDU_AGES = [30, 32, 35, 40, 45];
export const EDU_YEARS_PT = [1, 5, 10, 15, 16, 17, 18];
export const EDU_CONTRIB_YEARS = 15;
export const EDU_TARGET_AGE = 18;
export const EDU_FUNDING_YEARS = 4;
// Anualidad anticipada a 4 años al 4.25%. Se calcula con precisión completa en vez de
// usar la constante redondeada a 6 decimales (3.761993): con el valor redondeado los
// dos anchors obligatorios (§5) quedan a ~$0.10–0.15 del valor real — con precisión
// completa reproducen exacto al centavo: $21,945.38 y $34,141.63.
export const EDU_ANNUITY_DUE_4 = 1 + 1 / 1.0425 + 1 / Math.pow(1.0425, 2) + 1 / Math.pow(1.0425, 3);
export const EDU_EXACT_FA = [70000, 100000, 200000];
export const EDU_EXACT_CHILD = [0, 2, 3];
export const ILL_RATE = 0.0408;
export const SETTLE_RATE = 0.0425;
export const SRC_DATE = '2026-08-14';
export const PROJECTION_VERSION = 'education-ref-2026.08';

// Combinaciones que existen como ilustración real (no toda combinación existe).
export const EDU_EXACT_IDS = {
  '30-0-100': 1, '30-0-200': 1, '30-3-100': 1, '30-3-200': 1, '32-2-70': 1, '35-0-100': 1,
  '40-0-100': 1, '40-0-200': 1, '40-3-100': 1, '40-3-200': 1, '45-0-100': 1, '45-3-100': 1
};

function money(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

export function eduBand(fa) {
  // Épsilon en los umbrales: eduFace() itera en punto flotante y puede entregar
  // p.ej. 99999.99999999999 para un FA que conceptualmente es 100,000 exacto —
  // sin el margen, la comparación cae al lado equivocado de la banda y el FA
  // resuelto converge a un valor ~1% desviado (así se detectó: el anchor
  // EDU-REF-35-00-100 fallaba por $304 en la financiación anual antes de este fix).
  const EPS = 1e-6;
  return fa >= 200000 - EPS ? 0.9881 : fa >= 100000 - EPS ? 1 : 1.009;
}

export function eduInterpAge(pick, parentAge) {
  if (EDU_REF[parentAge]) return pick(parentAge);
  const lo = [...EDU_AGES].reverse().find(x => x < parentAge), hi = EDU_AGES.find(x => x > parentAge);
  if (lo === undefined || hi === undefined) return null;
  const t = (parentAge - lo) / (hi - lo), a = pick(lo), b = pick(hi);
  return a + (b - a) * t;
}

// Valor por $100,000 de FA en un año dado, interpolando dentro de la curva real.
export function eduCurve(parentAge, year, key) {
  const at = age => {
    const c = EDU_REF[age].c;
    if (c[year]) return c[year][key];
    const lo = [...EDU_YEARS_PT].reverse().find(y => y < year), hi = EDU_YEARS_PT.find(y => y > year);
    if (lo === undefined) return c[EDU_YEARS_PT[0]][key] * (year / EDU_YEARS_PT[0]);
    if (hi === undefined) return c[18][key] * Math.pow(1.0408, year - 18);
    return c[lo][key] + (c[hi][key] - c[lo][key]) * (year - lo) / (hi - lo);
  };
  return eduInterpAge(at, parentAge);
}

// Resuelve el face amount interno a partir de la aportación anual y la edad del padre.
export function eduFace(parentAge, annual) {
  const rate = eduInterpAge(a => EDU_REF[a].rate, parentAge);
  if (rate === null) return null;
  let fa = annual / (rate / 1000);
  for (let i = 0; i < 3; i++) fa = annual / (rate / 1000 * eduBand(fa));
  return fa;
}

/**
 * lead: { parent_age, child_age, annual_contribution }
 * Devuelve { ok:false, reason, ... } o { ok:true, is_exact_projection, confidence_level,
 * interpolation_method, source_projection_ids, face_amount, annual_funding, ... }.
 *
 * is_exact_projection exige TRES condiciones simultáneas: curva real para esa edad del
 * padre, FA resuelto dentro de ±500 de un FA ilustrado, y edad del hijo entre las
 * probadas (0, 2, 3). Ninguna por sí sola basta.
 */
export function projectEducation(lead) {
  const stamp = SRC_DATE + ' 09:12', version = PROJECTION_VERSION;
  const fail = reason => ({
    ok: false, reason, is_exact_projection: false,
    confidence_level: 'Validation required', interpolation_method: 'No aplicable',
    source_projection_ids: [], calculation_timestamp: stamp, projection_version: version
  });

  const parentAge = lead.parent_age, childAge = lead.child_age, annual = lead.annual_contribution;
  if (parentAge < EDU_AGES[0] || parentAge > EDU_AGES[EDU_AGES.length - 1]) {
    return fail('La edad del padre (' + parentAge + ') está fuera del rango cubierto por las ilustraciones educativas disponibles (30–45).');
  }

  const readYear = EDU_TARGET_AGE - childAge;
  if (readYear < 1) return fail('El hijo ya alcanzó la edad educativa objetivo.');

  const childAtEnd = childAge + EDU_CONTRIB_YEARS;
  const yearsAfter = EDU_TARGET_AGE - childAtEnd;
  if (yearsAfter < 0) {
    return fail('Con ' + EDU_CONTRIB_YEARS + ' años de aportación el periodo terminaría a los ' + childAtEnd + ' años del hijo, después de la edad educativa objetivo. Requiere una estructura distinta.');
  }

  const fa = eduFace(parentAge, annual);
  if (fa === null || fa < 25000) {
    return fail('La aportación anual (' + money(annual) + ') queda por debajo del rango de las ilustraciones educativas de referencia.');
  }

  const per100k = v => v / 100000 * fa;
  const settlement = per100k(eduCurve(parentAge, readYear, 'p'));
  const gcvAtEdu = per100k(eduCurve(parentAge, readYear, 'g'));
  const gcv15 = per100k(eduCurve(parentAge, 15, 'g'));
  const proj15 = per100k(eduCurve(parentAge, 15, 'p'));
  const annualFunding = settlement / EDU_ANNUITY_DUE_4;
  const protection = [1, 5, 10, 15].map(y => ({ year: y, value: per100k(eduCurve(parentAge, y, 'd')) }));

  const faLabel = Math.round(fa / 1000);
  const exactAge = EDU_REF[parentAge] !== undefined;
  const exactChild = EDU_EXACT_CHILD.includes(childAge);
  const exactFa = EDU_EXACT_FA.some(x => Math.abs(x - fa) < 500);
  const key = parentAge + '-' + childAge + '-' + (exactFa ? Math.round(EDU_EXACT_FA.find(x => Math.abs(x - fa) < 500) / 1000) : faLabel);
  // Sin curva real para esa edad, o sin FA de ilustración, NO se puede afirmar exactitud.
  const isExact = !!EDU_EXACT_IDS[key] && exactAge && exactFa && exactChild;

  const pad = n => String(n).padStart(2, '0'), pad3 = n => String(n).padStart(3, '0');
  const ids = isExact
    ? ['EDU-REF-' + parentAge + '-' + pad(childAge) + '-' + pad3(faLabel)]
    : exactAge
      ? ['EDU-REF-' + parentAge + '-00-100', 'EDU-REF-' + parentAge + '-03-100']
      : ['EDU-REF-' + [...EDU_AGES].reverse().find(x => x < parentAge) + '-00-100', 'EDU-REF-' + EDU_AGES.find(x => x > parentAge) + '-00-100'];

  const confidence = isExact ? 'Exact illustration'
    : exactAge ? 'Estimated — high confidence'
    : 'Estimated — moderate confidence';
  const method = isExact ? 'Ninguna · ilustración directa'
    : exactAge
      ? 'Lineal sobre face amount dentro de la edad ' + parentAge + (exactChild ? '' : '; lectura de curva interpolada al año ' + readYear)
      : 'Lineal sobre edad del padre entre ' + [...EDU_AGES].reverse().find(x => x < parentAge) + ' y ' + EDU_AGES.find(x => x > parentAge) + ', y sobre face amount';

  return {
    ok: true, is_exact_projection: isExact, confidence_level: confidence,
    interpolation_method: method, source_projection_ids: ids,
    calculation_timestamp: stamp, projection_version: version,
    face_amount: fa, annual_premium: annual, monthly_premium: annual / 12,
    total_premiums: annual * EDU_CONTRIB_YEARS, contribution_years: EDU_CONTRIB_YEARS,
    child_age_at_end: childAtEnd, years_after_contributions: yearsAfter, read_year: readYear,
    gcv_at_year_15: gcv15, projected_at_year_15: proj15,
    gcv_at_education: gcvAtEdu, settlement, annual_funding: annualFunding,
    funding_years: EDU_FUNDING_YEARS, total_funding: annualFunding * EDU_FUNDING_YEARS,
    protection, rate: ILL_RATE, settleRate: SETTLE_RATE
  };
}
