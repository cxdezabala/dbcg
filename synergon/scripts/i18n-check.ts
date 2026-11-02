import fs from 'node:fs';
import { makeDict, translate } from '../src/i18n/translate';
const es = makeDict(JSON.parse(fs.readFileSync('messages/es.json', 'utf8')).dict);
const list = fs.readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean);
const out = list.filter(s => translate(s, 'es', es) === s);
fs.writeFileSync(process.argv[3], out.join('\n') + '\n');
console.log(out.length, 'untranslated');
