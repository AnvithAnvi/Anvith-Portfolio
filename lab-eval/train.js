/* Tunes the Lab retriever on lab-eval/questions.json and writes lab-model.js and lab-data.js.
   Usage: node lab-eval/train.js [--samples N] [--seed S]
   Protocol: the "test" split is never used for any choice. Settings are picked by 5-fold cross-validation
   over train+dev (aliases and filler words are re-learned inside every fold), then the final model is fitted on
   train+dev and scored once on test. */
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const Lab = require(path.join(root, 'lab.js'));
const Q = JSON.parse(fs.readFileSync(path.join(__dirname, 'questions.json'), 'utf8'));
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? +process.argv[i + 1] : d; };
const SAMPLES = arg('samples', 1500), SEED = arg('seed', 11);

function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const R = rng(SEED);
const pick = a => a[Math.floor(R() * a.length)];

const SPACE = {
  k1: [0.6, 0.9, 1.2, 1.5, 2.0, 2.5], b: [0, 0.25, 0.5, 0.75, 1], tw: [0, 1, 2, 3], aw: [0, 0.3, 0.6, 1, 1.5],
  stem: [0, 1, 2], syn: [0, 1, 2], r2: [0.6, 0.75, 0.9, 2], T: [5, 7, 10, 999], fdf: [0.2, 0.4, 1], g: [1, 1.5, 2, 3], mc: [0, 0.3, 0.4, 0.5, 0.6], cap: [0, 1], um: [99, 4, 3, 2]
};
const BASELINE = { k1: 1.5, b: 0.75, tw: 2, aw: 0, stem: 1, syn: 1, r2: 0.75, T: 999, fdf: 1, g: 1, mc: 0, cap: 0, um: 99 };

/* learn query filler words and passage aliases from labelled rows */
function learn(cfg, rows) {
  const probe = Lab.build(Lab.DOCS, { params: cfg, filler: [], aliases: {} });
  const spread = {}, alias = {}, N = Lab.DOCS.length, pdf = {};
  Lab.DOCS.forEach(d => new Set(probe.tok(d.x + ' ' + d.t, false)).forEach(w => pdf[w] = (pdf[w] || 0) + 1));
  rows.filter(r => r.want).forEach(r => {
    new Set(probe.tok(r.q, false)).forEach(w => { (spread[w] = spread[w] || new Set()).add(r.key); });
  });
  const filler = cfg.T >= 999 ? [] : Object.keys(spread).filter(w => spread[w].size >= cfg.T && (pdf[w] || 0) / N <= cfg.fdf);
  const fset = new Set(filler);
  if (cfg.aw > 0) rows.filter(r => r.want).forEach(r => {
    const words = r.q.toLowerCase().replace(/[^a-z0-9+%.]+/g, ' ').split(/\s+/).filter(Boolean);
    const keep = words.filter(w => { const t = probe.tok(w, false); return t.length && !fset.has(t[0]); });
    r.want.forEach(id => { (alias[id] = alias[id] || new Set()); keep.forEach(w => alias[id].add(w)); });
  });
  const aliases = {}; Object.keys(alias).forEach(id => aliases[id] = [...alias[id]].join(' '));
  return { filler, aliases };
}
function model(cfg, tau, rows) {
  const l = learn(cfg, rows);
  const params = { k1: cfg.k1, b: cfg.b, tw: cfg.tw, aw: cfg.aw, stem: cfg.stem, syn: cfg.syn, r2: cfg.r2, g: cfg.g, mc: cfg.mc, cap: cfg.cap, um: cfg.um };
  return { tau, params, filler: l.filler, aliases: l.aliases, cfg };
}
function scoreAll(M, rows) { const e = Lab.build(Lab.DOCS, M); return rows.map(r => ({ r, s: e.score(r.q), e })); }
function tally(scored, tau) {
  let pos = 0, ok = 0, neg = 0, ref = 0, e;
  for (const x of scored) {
    e = x.e; const s = e.finish(Object.assign({}, x.s), tau);
    if (x.r.want) { pos++; if (s.answered && s.cites.some(h => x.r.want.includes(h.d.id))) ok++; }
    else { neg++; if (!s.answered) ref++; }
  }
  return { pos, ok, neg, ref, J: 0.5 * ok / (pos || 1) + 0.5 * ref / (neg || 1), acc: (ok + ref) / ((pos + neg) || 1) };
}
const TAUS = []; for (let t = 0.4; t <= 8.01; t += 0.1) TAUS.push(+t.toFixed(2));

/* shuffled folds over train+dev */
const dev = Q.filter(r => r.split === 'train' || r.split === 'dev'), test = Q.filter(r => r.split === 'test'), hold = Q.filter(r => r.split === 'holdout');
const order = dev.map((r, i) => [R(), i]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
const fold = new Array(dev.length); const cnt = {};
order.forEach(i => { const k = dev[i].key; cnt[k] = (cnt[k] || 0); fold[i] = cnt[k]++ % 5; });

function cv(cfg) {
  // for each fold: fit on the other four, score the held-out one (tau chosen afterwards on the pooled predictions)
  const per = [];
  for (let f = 0; f < 5; f++) {
    const tr = dev.filter((_, i) => fold[i] !== f), te = dev.filter((_, i) => fold[i] === f);
    per.push(scoreAll(model(cfg, 2, tr), te));
  }
  const pooled = [].concat(...per);
  let best = null;
  for (const t of TAUS) { const m = tally(pooled, t); if (!best || m.J > best.J + 1e-9) best = Object.assign({ tau: t }, m); }
  return best;
}

console.log('questions', Q.length, 'train+dev', dev.length, 'test', test.length, '(test is not touched during tuning)');
const results = [];
const base = cv(BASELINE); results.push({ cfg: BASELINE, cv: base });
console.log('baseline settings, CV:', JSON.stringify({ tau: base.tau, J: +base.J.toFixed(3), pos: base.ok + '/' + base.pos, neg: base.ref + '/' + base.neg }));
for (let i = 0; i < SAMPLES; i++) {
  const cfg = {}; Object.keys(SPACE).forEach(k => cfg[k] = pick(SPACE[k]));
  results.push({ cfg, cv: cv(cfg) });
}
results.sort((a, b) => b.cv.J - a.cv.J || b.cv.ok - a.cv.ok);
const top = results.slice(0, 5);
top.forEach((x, i) => console.log('#' + (i + 1), JSON.stringify(x.cfg), 'tau', x.cv.tau, 'J', x.cv.J.toFixed(3), 'pos', x.cv.ok + '/' + x.cv.pos, 'neg', x.cv.ref + '/' + x.cv.neg));
const win = results[0];
if (process.argv.includes('--cvmiss')) {
  const per = [];
  for (let f = 0; f < 5; f++) { const tr = dev.filter((_, i) => fold[i] !== f), te = dev.filter((_, i) => fold[i] === f); per.push(scoreAll(model(win.cfg, 2, tr), te)); }
  console.log('\nCV misses (train+dev only) for the chosen settings:');
  [].concat(...per).forEach(x => { const s = x.e.finish(Object.assign({}, x.s), win.cv.tau); const bad = x.r.want ? !(s.answered && s.cites.some(h => x.r.want.includes(h.d.id))) : s.answered; if (bad) console.log('  ', x.r.q, '| want', x.r.want ? x.r.want.join('/') : 'refuse', '| got', s.answered ? s.cites.map(h => h.d.id).join(',') : 'refused(top ' + s.top.d.id + ')', '| conf', s.conf.toFixed(2)); });
}

/* final fit on train+dev, one look at test */
const finalM = model(win.cfg, win.cv.tau, dev);
const baseM = model(BASELINE, 2.0, dev);
const tScored = scoreAll(finalM, test), bScored = scoreAll(baseM, test);
const tFinal = tally(tScored, finalM.tau), tBase = tally(bScored, 2.0);
console.log('\nTEST  baseline settings:', tBase.ok + '/' + tBase.pos, 'answered right;', tBase.ref + '/' + tBase.neg, 'refused;', (tBase.acc * 100).toFixed(1) + '%');
console.log('TEST  tuned settings   :', tFinal.ok + '/' + tFinal.pos, 'answered right;', tFinal.ref + '/' + tFinal.neg, 'refused;', (tFinal.acc * 100).toFixed(1) + '%');
const wrong = tScored.filter(x => { const s = x.e.finish(Object.assign({}, x.s), finalM.tau); return x.r.want ? !(s.answered && s.cites.some(h => x.r.want.includes(h.d.id))) : s.answered; });
if (process.argv.includes('--showtest')) wrong.forEach(x => { const s = x.e.finish(Object.assign({}, x.s), finalM.tau); console.log('  miss:', x.r.q, '| want', x.r.want ? x.r.want.join('/') : 'refuse', '| got', s.answered ? s.cites.map(h => h.d.id).join(',') : 'refused', '| conf', s.conf.toFixed(2)); });

const hFinal = tally(scoreAll(finalM, hold), finalM.tau), hBase = tally(scoreAll(baseM, hold), 2.0);
console.log('\nHOLDOUT (fresh questions, never used for any setting)  baseline:', hBase.ok + '/' + hBase.pos, hBase.ref + '/' + hBase.neg, (hBase.acc * 100).toFixed(1) + '%', ' tuned:', hFinal.ok + '/' + hFinal.pos, hFinal.ref + '/' + hFinal.neg, (hFinal.acc * 100).toFixed(1) + '%');
if (process.argv.includes('--showhold')) scoreAll(finalM, hold).forEach(x => { const s = x.e.finish(Object.assign({}, x.s), finalM.tau); const bad = x.r.want ? !(s.answered && s.cites.some(h => x.r.want.includes(h.d.id))) : s.answered; if (bad) console.log('  miss:', x.r.q, '| want', x.r.want ? x.r.want.join('/') : 'refuse', '| got', s.answered ? s.cites.map(h => h.d.id).join(',') : 'refused(top ' + s.top.d.id + ')', '| conf', s.conf.toFixed(2)); });
if (process.argv.includes('--write')) {
  const out = { tau: finalM.tau, params: finalM.params, filler: finalM.filler, aliases: finalM.aliases };
  fs.writeFileSync(path.join(root, 'lab-model.js'), '/* Generated by lab-eval/train.js. Do not edit by hand. */\n(function (root) {\n  var M = ' + JSON.stringify(out, null, 2) + ';\n  if (typeof module !== \'undefined\') module.exports = M; else root.LabModel = M;\n})(this);\n');
  const data = Q.map(r => ({ q: r.q, want: r.want, split: r.split }));
  fs.writeFileSync(path.join(root, 'lab-data.js'), '/* Generated by lab-eval/train.js from lab-eval/questions.json. */\n(function (root) {\n  var D = ' + JSON.stringify(data) + ';\n  if (typeof module !== \'undefined\') module.exports = D; else root.LabData = D;\n})(this);\n');
  const rep = { questions: Q.length, split: { train: Q.filter(r => r.split === 'train').length, dev: Q.filter(r => r.split === 'dev').length, test: test.length, holdout: hold.length },
    cv: { baseline: base, tuned: win.cv }, test: { baseline: tBase, tuned: tFinal }, holdout: { baseline: hBase, tuned: hFinal }, config: win.cfg, tau: finalM.tau, filler: finalM.filler };
  fs.writeFileSync(path.join(__dirname, 'report.json'), JSON.stringify(rep, null, 1));
  console.log('\nwrote lab-model.js, lab-data.js, lab-eval/report.json');
}
