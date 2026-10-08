// Contrast guard for every theme pack: run with `npm test` in /frontend.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast, over } from './color.js';
import { resolveTheme } from './engine.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'packs');
const packs = await Promise.all(fs.readdirSync(dir).filter((f) => f.endsWith('.js')).map(async (f) => (await import(path.join(dir, f))).default));

test('there are four light and four dark themes with unique ids', () => {
  assert.equal(packs.filter((p) => p.mode === 'light').length, 4);
  assert.equal(packs.filter((p) => p.mode === 'dark').length, 4);
  assert.equal(new Set(packs.map((p) => p.id)).size, packs.length);
});

const AA = 4.5;
for (const def of packs) {
  test(`${def.name}: readable text, buttons, links and chips (WCAG AA)`, () => {
    const { tokens: t } = resolveTheme(def);
    const f = t.families;
    const fails = [];
    const check = (label, fg, bg, min = AA) => { const c = contrast(fg, bg); if (c < min) fails.push(`${label}: ${c.toFixed(2)} < ${min} (${fg} on ${bg})`); };

    // body text on the surfaces it sits on
    for (const [name, bg] of [['page', t.page], ['card', t.card], ['inset', t.inset]]) check(`text on ${name}`, t.text, bg);
    // secondary and muted text (text-slate-300 / text-slate-400)
    for (const [name, bg] of [['page', t.page], ['card', t.card], ['inset', t.inset]]) { check(`text-slate-300 on ${name}`, t.text2, bg); check(`text-slate-400 on ${name}`, t.muted, bg); }
    // solid buttons: white text on bg-{blue,purple}-600/700 and semantic fills
    for (const [fam, step] of [['blue', 600], ['blue', 700], ['purple', 600], ['red', 600], ['green', 600], ['emerald', 600]]) check(`white on ${fam}-${step}`, '#ffffff', f[fam][step], ['green', 'emerald', 'red'].includes(fam) ? 3 : AA);
    // links / accents used as text on cards
    check('text-blue-400 on card', f.blue[400], t.card);
    check('text-purple-400 on card', f.purple[400], t.card);
    // status chips: text-{family}-300 over a 20% tint of the 500 shade
    for (const fam of ['green', 'red', 'yellow', 'orange', 'amber', 'emerald', 'sky', 'cyan', 'pink', 'blue', 'purple']) {
      check(`chip text-${fam}-300`, f[fam][300], over(f[fam][500], t.card, 0.2));
    }
    assert.deepEqual(fails, [], `\n${fails.join('\n')}`);
  });
}
