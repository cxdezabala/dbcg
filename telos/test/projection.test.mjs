// Tests de anchors — Fase 1 (PROMPT-claude-code.md §12, §4, §5).
// "Si los motores mienten, el resto no importa." Estos dos anchors son obligatorios:
//   EDU-REF-32-02-070 → financiación $21,945.38 / año × 4
//   EDU-REF-35-00-100 → financiación $34,141.63 / año × 4
// Correr con: node --test telos/test

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { project } from '../engine/projection-retirement.mjs';
import { projectEducation, eduCurve, EDU_AGES } from '../engine/projection-education.mjs';

function assertClose(actual, expected, tolerance, msg) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    (msg ? msg + ' — ' : '') + `esperado ${expected} ± ${tolerance}, obtenido ${actual}`
  );
}

describe('Educación — anchor EDU-REF-32-02-070 (padre 32, hijo 2, FA 70,000)', () => {
  const lead = { parent_age: 32, child_age: 2, annual_contribution: 4443.8 };
  const r = projectEducation(lead);

  test('proyecta ok y como ilustración exacta', () => {
    assert.equal(r.ok, true, r.reason);
    assert.equal(r.is_exact_projection, true);
    assert.equal(r.confidence_level, 'Exact illustration');
    assert.deepEqual(r.source_projection_ids, ['EDU-REF-32-02-070']);
  });

  test('resuelve el face amount interno a 70,000', () => {
    assertClose(r.face_amount, 70000, 5);
  });

  test('prima anual $4,443.80 · mensual $370.32 · total 15 años $66,657', () => {
    assertClose(r.annual_premium, 4443.8, 0.01);
    assertClose(r.monthly_premium, 370.32, 0.01);
    assertClose(r.total_premiums, 66657, 1);
  });

  test('hijo al terminar las aportaciones: 17 años', () => {
    assert.equal(r.child_age_at_end, 17);
  });

  test('año 15: GCV $70,000 · proyectado $79,321', () => {
    assertClose(r.gcv_at_year_15, 70000, 1);
    assertClose(r.projected_at_year_15, 79321, 1);
  });

  test('año 16 (hijo 18): GCV $72,856 · settlement $82,558', () => {
    assert.equal(r.read_year, 16);
    assertClose(r.gcv_at_education, 72856, 1);
    assertClose(r.settlement, 82558, 1);
  });

  test('financiación $21,945.38 / año × 4 — EL ANCHOR OBLIGATORIO', () => {
    assertClose(r.annual_funding, 21945.38, 0.01);
    assertClose(r.total_funding, 21945.38 * 4, 0.05);
    assert.equal(r.funding_years, 4);
  });

  test('protección: año 1 $70,105 · año 5 $70,675 · año 10 $72,736 · año 15 $79,321', () => {
    const byYear = Object.fromEntries(r.protection.map(p => [p.year, p.value]));
    assertClose(byYear[1], 70105, 1);
    assertClose(byYear[5], 70675, 1);
    assertClose(byYear[10], 72736, 1);
    assertClose(byYear[15], 79321, 1);
  });
});

describe('Educación — anchor EDU-REF-35-00-100 (padre 35, hijo 0, FA 100,000)', () => {
  const lead = { parent_age: 35, child_age: 0, annual_contribution: 6331 };
  const r = projectEducation(lead);

  test('proyecta ok y como ilustración exacta', () => {
    assert.equal(r.ok, true, r.reason);
    assert.equal(r.is_exact_projection, true);
    assert.deepEqual(r.source_projection_ids, ['EDU-REF-35-00-100']);
  });

  test('prima anual $6,331 · mensual $527.58 · total $94,965', () => {
    assertClose(r.annual_premium, 6331, 0.01);
    assertClose(r.monthly_premium, 527.58, 0.01);
    assertClose(r.total_premiums, 94965, 1);
  });

  test('año 15: GCV $100,000 · proyectado $113,919', () => {
    assertClose(r.gcv_at_year_15, 100000, 1);
    assertClose(r.projected_at_year_15, 113919, 1);
  });

  test('año 18 (hijo 18): GCV $112,746.18 · settlement $128,440', () => {
    assert.equal(r.read_year, 18);
    assertClose(r.gcv_at_education, 112746.18, 1);
    assertClose(r.settlement, 128440, 1);
  });

  test('financiación $34,141.63 / año × 4 — EL ANCHOR OBLIGATORIO', () => {
    assertClose(r.annual_funding, 34141.63, 0.01);
    assert.equal(r.funding_years, 4);
  });
});

describe('Educación — sistema de confianza (triple condición de is_exact_projection)', () => {
  test('edad del padre real + FA exacto, pero edad del hijo NO probada (1) → no es exacta', () => {
    // Mismo padre/FA que el anchor 32-02-070, pero hijo de 1 año en vez de 2.
    // La curva no depende del hijo, así que el FA resuelto es el mismo; solo cambia
    // is_exact_projection porque 1 no está en EDU_EXACT_CHILD [0,2,3].
    const r = projectEducation({ parent_age: 32, child_age: 1, annual_contribution: 4443.8 });
    assert.equal(r.ok, true, r.reason);
    assert.equal(r.is_exact_projection, false);
    assert.equal(r.confidence_level, 'Estimated — high confidence');
  });

  test('edad del padre entre anclas (38) → interpolación, confianza moderada', () => {
    const r = projectEducation({ parent_age: 38, child_age: 0, annual_contribution: 6350 });
    assert.equal(r.ok, true, r.reason);
    assert.equal(r.is_exact_projection, false);
    assert.equal(r.confidence_level, 'Estimated — moderate confidence');
  });

  test('edad del padre fuera de 30–45 → VALIDATION REQUIRED, sin cifras', () => {
    const r = projectEducation({ parent_age: 50, child_age: 0, annual_contribution: 8000 });
    assert.equal(r.ok, false);
    assert.equal(r.confidence_level, 'Validation required');
    assert.equal(r.face_amount, undefined);
  });

  test('hijo de 4+ años → el periodo de 15 años terminaría después de los 18 → rechazado', () => {
    const r = projectEducation({ parent_age: 35, child_age: 4, annual_contribution: 6331 });
    assert.equal(r.ok, false);
    assert.match(r.reason, /después de la edad educativa objetivo/);
  });
});

describe('Educación — invariante estructural: GCV año 15 = FA, y crece al 4.08% después', () => {
  for (const age of EDU_AGES) {
    test('edad ' + age, () => {
      assertClose(eduCurve(age, 15, 'g'), 100000, 0.5);
      assertClose(eduCurve(age, 16, 'g'), 100000 * 1.0408, 0.5);
      assertClose(eduCurve(age, 17, 'g'), 100000 * Math.pow(1.0408, 2), 0.5);
      assertClose(eduCurve(age, 18, 'g'), 100000 * Math.pow(1.0408, 3), 0.5);
    });
  }
});

describe('Retiro (Abundance) — anchor de ilustración exacta (edad 30, FA 75,000)', () => {
  test('reproduce gcv y valor proyectado de la ilustración', () => {
    const r = project({ current_age: 30, annual_contribution: 2437.5 });
    assert.equal(r.ok, true, r.reason);
    assert.equal(r.is_exact_projection, true);
    assert.equal(r.confidence_level, 'Alta');
    assertClose(r.gcv, 107925, 1);
    assertClose(r.projected, 163924, 1);
    assert.equal(r.settlement, 65);
  });
});

describe('Retiro — rechazo de interpolación entre anclas con settlement distinto (45↔50)', () => {
  test('edad 47 cae entre 45→65 y 50→70: no debe interpolar', () => {
    const r = project({ current_age: 47, annual_contribution: 12000 });
    assert.equal(r.ok, false);
    assert.match(r.reason, /edades de settlement distintas/);
  });

  test('edad 52 cae entre 50→70 y 55→75: no debe interpolar', () => {
    const r = project({ current_age: 52, annual_contribution: 25000 });
    assert.equal(r.ok, false);
    assert.match(r.reason, /edades de settlement distintas/);
  });
});

describe('Retiro (Abundance) — anchors de las 6 ilustraciones FA 25,000/40,000 (35/40/50, agregadas 2026-08-20)', () => {
  test('edad 35, FA 25,000: reproduce gcv y valor proyectado', () => {
    const r = project({ current_age: 35, annual_contribution: 1119 });
    assert.equal(r.ok, true, r.reason);
    assert.equal(r.is_exact_projection, true);
    assertClose(r.gcv, 35975, 1);
    assertClose(r.projected, 51347, 1);
    assert.equal(r.settlement, 65);
  });

  test('edad 35, FA 40,000: reproduce gcv y valor proyectado', () => {
    const r = project({ current_age: 35, annual_contribution: 1700.4 });
    assert.equal(r.ok, true, r.reason);
    assert.equal(r.is_exact_projection, true);
    assertClose(r.gcv, 57560, 1);
    assertClose(r.projected, 82156, 1);
  });

  test('edad 40, FA 25,000: reproduce gcv y valor proyectado', () => {
    const r = project({ current_age: 40, annual_contribution: 1422 });
    assert.equal(r.ok, true, r.reason);
    assert.equal(r.is_exact_projection, true);
    assertClose(r.gcv, 35975, 1);
    assertClose(r.projected, 48261, 1);
  });

  test('edad 40, FA 40,000: reproduce gcv y valor proyectado', () => {
    const r = project({ current_age: 40, annual_contribution: 2185.2 });
    assert.equal(r.ok, true, r.reason);
    assert.equal(r.is_exact_projection, true);
    assertClose(r.gcv, 57560, 1);
    assertClose(r.projected, 77218, 1);
  });

  test('edad 50, FA 25,000: reproduce gcv y valor proyectado al settlement (70)', () => {
    const r = project({ current_age: 50, annual_contribution: 2780.75 });
    assert.equal(r.ok, true, r.reason);
    assert.equal(r.is_exact_projection, true);
    assertClose(r.gcv, 43937.69, 1);
    assertClose(r.projected, 52097, 1);
    assert.equal(r.settlement, 70);
  });

  test('edad 50, FA 40,000: reproduce gcv y valor proyectado al settlement (70)', () => {
    const r = project({ current_age: 50, annual_contribution: 4359.2 });
    assert.equal(r.ok, true, r.reason);
    assert.equal(r.is_exact_projection, true);
    assertClose(r.gcv, 70300.3, 1);
    assertClose(r.projected, 83356, 1);
  });

  test('edad 50: una aportación de $3,750/año ahora sí resuelve (antes rechazada por debajo del piso de $8,042.25)', () => {
    const r = project({ current_age: 50, annual_contribution: 3750 });
    assert.equal(r.ok, true, r.reason);
    assert.equal(r.is_exact_projection, false); // interpola entre FA25000 y FA40000
    assert.equal(r.settlement, 70);
  });
});

describe('Retiro — topes de edad', () => {
  test('edad 29 (fuera de 30–55) → rechazado', () => {
    const r = project({ current_age: 29, annual_contribution: 5000 });
    assert.equal(r.ok, false);
  });

  test('edad 56 (fuera de 30–55) → rechazado', () => {
    const r = project({ current_age: 56, annual_contribution: 40000 });
    assert.equal(r.ok, false);
  });

  test('edad 55 con settlement propio a los 75 → sí anclado', () => {
    const r = project({ current_age: 55, annual_contribution: 36296 });
    assert.equal(r.ok, true, r.reason);
    assert.equal(r.settlement, 75);
  });
});
