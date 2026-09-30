import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const main=fs.readFileSync(new URL('../client/src/main.jsx',import.meta.url),'utf8');
const server=fs.readFileSync(new URL('../server/index.js',import.meta.url),'utf8');

test('French and English translation dictionaries expose the same keys',()=>{
  const fr=main.match(/fr:\{(.*?)\},\nen:\{/s)?.[1]||'';
  const en=main.match(/en:\{(.*?)\n\};/s)?.[1]||'';
  const keys=x=>new Set([...x.matchAll(/(?<![\w])([A-Za-z_][A-Za-z0-9_]*):/g)].map(m=>m[1]));
  assert.deepEqual([...keys(fr)].sort(),[...keys(en)].sort());
});

test('multi-target UI uses the actual server effect ids',()=>{
  assert.match(main,/const TWO_TARGETS=new Set\(\['bad_blood','anchor','shifting_tides','we_ride'\]\)/);
  assert.doesNotMatch(main,/TWO_TARGETS=new Set\([^\n]*shifting-tides/);
  assert.doesNotMatch(main,/TWO_TARGETS=new Set\([^\n]*we-ride/);
});

test('production server hardening is present',()=>{
  assert.match(server,/express\.json\(\{limit:'32kb'\}\)/);
  assert.match(server,/maxPayload:32\*1024/);
  assert.match(server,/WS_MESSAGES_PER_WINDOW=80/);
  assert.match(server,/r\.sockets\.get\(p\.id\)!==ws/);
  assert.match(server,/NODE_ENV!=='production' \|\| process\.env\.OKOC_DEV_MODE==='1'/);
  assert.match(server,/X-Content-Type-Options/);
});


test('free deployment is configured for production and the lobby has QR join support',()=>{
  const render=fs.readFileSync(new URL('../render.yaml',import.meta.url),'utf8');
  assert.match(render,/NODE_ENV\s*\n\s*value: production/);
  assert.match(main,/quickchart\.io\/qr/);
  assert.match(main,/new URLSearchParams\(location\.search\)\.get\('join'\)/);
});

test('game UI keeps unavailable card actions visible and greyed instead of removing them',()=>{
  assert.match(main,/physical-card \$\{selected===c\.instanceId\?'selected':''\} \$\{!st\.ok\?'unavailable':''\}/);
  assert.match(main,/action-status/);
  assert.match(main,/disabled=\{!cardPlayStatus\(card,state,me\)\.ok\}/);
});
