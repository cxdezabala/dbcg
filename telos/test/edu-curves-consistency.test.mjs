// Re-deriva EDU_REF a partir del dataset crudo (telos/data/edu-curves.json) y confirma
// que coincide con la tabla normalizada que usa el motor. Esto es lo que
// PROJECTIONS-model.md pide cargar explícitamente para la edad 32 ("Cárgala. Sin ella
// los valores se desvían ~0.08%") y lo que evita que la tabla operativa se desvíe del
// origen real sin que nadie lo note.
//
// normalize(v, fa) = v / fa * 100000   (el valor proyectado escala linealmente en FA)
// rate = prem / (fa/1000) / eduBand(fa)  (quita el factor de banda para dejar la tasa base)

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { EDU_REF, EDU_AGES, EDU_YEARS_PT, eduBand } from '../engine/projection-education.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(path.join(here, '../data/edu-curves.json'), 'utf8'));

// Una entrada representativa por edad ancla (todas las variantes de FA/hijo de esa edad
// deben normalizar al mismo resultado — eso se comprueba aparte, abajo).
const REP_KEY = { 30: '30-0-100', 32: '32-2-70', 35: '35-0-100', 40: '40-0-100', 45: '45-0-100' };

function normalize(entry) {
  const fa = entry.fa;
  const rate = entry.prem / (fa / 1000) / eduBand(fa);
  const c = {};
  for (const y of EDU_YEARS_PT) {
    const pt = entry.y[String(y)];
    c[y] = { p: pt.proj / fa * 100000, g: pt.gcv / fa * 100000, d: pt.db / fa * 100000 };
  }
  return { rate, c };
}

describe('edu-curves.json → EDU_REF (consistencia dato crudo ↔ tabla del motor)', () => {
  for (const age of EDU_AGES) {
    test('edad ' + age + ': tasa y curva re-derivadas coinciden con EDU_REF', () => {
      const derived = normalize(raw[REP_KEY[age]]);
      const expected = EDU_REF[age];
      assert.ok(Math.abs(derived.rate - expected.rate) < 0.001, `rate: ${derived.rate} vs ${expected.rate}`);
      for (const y of EDU_YEARS_PT) {
        for (const key of ['p', 'g', 'd']) {
          const dv = derived.c[y][key], ev = expected.c[y][key];
          assert.ok(Math.abs(dv - ev) < 0.5, `año ${y} [${key}]: derivado ${dv} vs EDU_REF ${ev}`);
        }
      }
    });
  }

  test('la curva no depende de la edad del hijo (30: hijo 0 vs hijo 3, mismo FA)', () => {
    const a = normalize(raw['30-0-100']), b = normalize(raw['30-3-100']);
    for (const y of EDU_YEARS_PT) assert.deepEqual(a.c[y], b.c[y]);
  });

  test('el valor proyectado escala linealmente en FA (30: 100k vs 200k)', () => {
    // Tolerancia 1.0: el PDF fuente redondea cada ilustración a dólar entero, así que
    // normalizar la de 200k (÷2) puede diferir en 50¢ de la de 100k sin que eso sea
    // una desviación real de la linealidad — es granularidad de redondeo del origen.
    const a = normalize(raw['30-0-100']), b = normalize(raw['30-0-200']);
    for (const y of EDU_YEARS_PT) {
      assert.ok(Math.abs(a.c[y].p - b.c[y].p) < 1.0, `año ${y}: ${a.c[y].p} vs ${b.c[y].p}`);
    }
  });

  test('ancla 32 (FA 70,000): la tasa base sin banda es 62.9166', () => {
    const derived = normalize(raw['32-2-70']);
    assert.ok(Math.abs(derived.rate - 62.9166) < 0.001);
  });
});
