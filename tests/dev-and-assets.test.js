import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {CARDS} from '../shared/cards.js';

const root=path.resolve('.');

 test('DEV has a genuinely separate frontend entry and no pathname-gated normal App',()=>{
  const main=fs.readFileSync(path.join(root,'client/src/main.jsx'),'utf8');
  const dev=fs.readFileSync(path.join(root,'client/src/dev-main.jsx'),'utf8');
  const html=fs.readFileSync(path.join(root,'client/dev.html'),'utf8');
  assert.doesNotMatch(main,/import\.meta\.env\.DEV\s*&&\s*location\.pathname/);
  assert.match(html,/src="\/src\/dev-main\.jsx"/);
  assert.match(dev,/class DevErrorBoundary/);
  assert.match(dev,/\/api\/dev-standalone\/state/);
  assert.match(dev,/DEV_API_BASE/);
  assert.match(dev,/\/api\/dev-standalone\/action/);
  assert.match(dev,/RÉESSAYER/);
  assert.match(dev,/RESET DEV/);
 });

 test('DEV backend is isolated inside its own API namespace',()=>{
  const api=fs.readFileSync(path.join(root,'server/dev-api.js'),'utf8');
  const normal=fs.readFileSync(path.join(root,'server/index.js'),'utf8');
  assert.match(api,/from '\.\/game-engine\.js'/);
  assert.match(api,/\/api\/dev-standalone\/health/);
  assert.match(api,/\/api\/dev-standalone\/debug\/fail/);
  assert.match(api,/\/api\/dev-standalone\/reset/);
  assert.match(api,/\/api\/dev-standalone\/action/);
  assert.match(normal,/mountDevApi\(app\)/);
  assert.doesNotMatch(normal,/api\/dev\/(state|reset|action)/);
 });

 test('Vite builds both the normal and DEV HTML entries and proxies the isolated DEV API to the main backend',()=>{
  const vite=fs.readFileSync(path.join(root,'vite.config.js'),'utf8');
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  assert.match(vite,/root:\s*['"]client['"]/);
  assert.match(vite,/plugins:\s*\[react\(\),/);
  assert.match(vite,/['"]\/api['"]:/);
  assert.match(vite,/localhost:10000/);
  assert.doesNotMatch(vite,/localhost:10001/);
  assert.match(pkg.scripts.dev,/node server\/index\.js/);
  assert.doesNotMatch(pkg.scripts.dev,/node server\/dev-server\.js/);
 });

 test('all 42 physical card assets are present in EN and FR',()=>{
  assert.equal(CARDS.length,42);
  for(const card of CARDS){
    for(const dir of ['', 'fr/']){
      const file=path.join(root,'client/public/assets/cards',dir,`${card.id}.png`);
      assert.ok(fs.existsSync(file),`missing ${dir}${card.id}.png`);
      const buf=fs.readFileSync(file);
      assert.equal(buf.readUInt32BE(16),246,`${dir}${card.id} width`);
      assert.equal(buf.readUInt32BE(20),346,`${dir}${card.id} height`);
    }
  }
 });

 test('poster menu keeps compact three-column button geometry and round-headed nobles are explicitly elevated',()=>{
  const css=fs.readFileSync(path.join(root,'client/src/style.css'),'utf8');
  assert.match(css,/grid-template-columns:28px minmax\(0,1fr\) 20px/);
  assert.match(css,/\.court-noble--2,\.court-noble--4,\.court-noble--5,\.court-noble--7\{transform:translateY\(-68px\)/);
  assert.match(css,/\.figure--noble\.figure--rounded/);
 });

test('standalone DEV entry renders DevApp directly and does not reference an undefined App',()=>{
  const s=fs.readFileSync(path.join(root,'client/src/dev-main.jsx'),'utf8');
  assert.match(s,/function DevApp\(/);
  assert.match(s,/render\(<DevErrorBoundary><DevApp\/>/);
  assert.doesNotMatch(s,/render\(<DevErrorBoundary><App\/>/);
});

test('poster header uses the compact banner copy',()=>{
  const s=fs.readFileSync(path.join(root,'client/src/main.jsx'),'utf8');
  const css=fs.readFileSync(path.join(root,'client/src/style.css'),'utf8');
  assert.match(s,/homeBandTitle/);
  assert.match(s,/homeBandSubtitle/);
  assert.match(css,/\.home-header\{height:74px/);
  assert.match(css,/V19 — thinner home banner/);
  assert.match(css,/height:54px!important/);
  assert.match(css,/V20 — keep the home menu fully below/);
  assert.match(css,/\.home-menu\{margin:8px 0 0 auto!important\}/);
});

test('normal Game and DEV import every game UI component they render',()=>{
  const main=fs.readFileSync(path.join(root,'client/src/main.jsx'),'utf8');
  for(const name of ['RoundTracker','GoldCharacterCard','KingReveal']){
    assert.match(main,new RegExp('function ' + name + '\\('),`${name} must be defined`);
    assert.match(main,new RegExp('<' + name + '\\b'),`${name} must be rendered intentionally`);
  }
  const dev=fs.readFileSync(path.join(root,'client/src/dev-main.jsx'),'utf8');
  assert.match(dev,/import \{Game,I18N\} from '\.\/main\.jsx'/);
});

test('DEV crown reveal is self-resolving instead of waiting for a manual refresh',()=>{
  const api=fs.readFileSync(path.join(root,'server/dev-api.js'),'utf8');
  const ui=fs.readFileSync(path.join(root,'client/src/dev-main.jsx'),'utf8');
  assert.match(api,/tick\(g\);/);
  assert.match(ui,/state\?\.phase!=='kingReveal'/);
  assert.match(ui,/setInterval\(async\(\)=>/);
});

test('production build no longer depends on a missing nested Vite config path',()=>{
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  assert.equal(pkg.scripts.build,'vite build');
  assert.ok(fs.existsSync(path.join(root,'vite.config.js')));
});
