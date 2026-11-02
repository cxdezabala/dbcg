// Test helper: evaluates the read-only prototype files in a sandbox so ports can be compared 1:1.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

export function loadReference() {
  const ctx: Record<string, any> = { window: {}, console, Date, Math, requestAnimationFrame: () => 0, document: { documentElement: {} } };
  vm.createContext(ctx);
  for (const f of ['synergon-data.js', 'synergon-ai.js', 'synergon-radar.js', 'synergon-pipeline.js', 'synergon-i18n.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../../reference', f), 'utf8'), ctx);
  return ctx.window as { SYN: any; SYNAI: any; SYNR: any; SYNP: any; SYNI18N: any };
}
