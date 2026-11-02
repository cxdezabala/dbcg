import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadReference } from './reference';
import { makeDict, translate } from '@/i18n/translate';

const es = JSON.parse(fs.readFileSync(path.join(__dirname, '../../messages/es.json'), 'utf8'));
const D = makeDict(es.dict);
const ref = loadReference();

describe('EN → ES translation', () => {
  it('contains the full prototype dictionary', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../reference/synergon-i18n.js'), 'utf8');
    for (const k of ['Home', 'Commercial Intelligence AI', 'Mark all read', 'Reset demo data', 'Why we lose']) expect(src).toContain(`'${k}'`);
    for (const k of ['Home', 'Why we lose', 'Estimated ±20%']) expect(D.has(k)).toBe(true);
  });
  it('applies the same pattern rules as the prototype', () => {
    ref.SYNI18N.set('es');
    for (const s of ['Good morning, Javier.', '12 Nov', 'Step 3: Frame the solution', '€1.6M of €14.8M', 'Viewing as Laura Bennett — Commercial Team Leader', 'Commercial performance · YTD 2026 · CRM-synced today 08:12', 'Lead with Retail Banking, open with Elena Vidal (Chief Operating Officer) and pitch “Reach the 42% cost-to-income target”.'])
      expect(translate(s, 'es', D)).toBe(ref.SYNI18N.t(s));
  });
  it('leaves English untouched', () => { expect(translate('Home', 'en', D)).toBe('Home'); });
});
