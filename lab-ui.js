/* Lab UI: ask box, trace, rule-based evals, eval harness with live threshold. Needs lab.js. */
(function () {
  'use strict';
  if (!window.Lab) return;
  var L = Lab, d = document, tau = L.TAU;
  function $(s) { return d.querySelector(s); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var q = $('#q'), form = $('#askform');

  function timing(text) {
    var n = 400, acc = null, t0 = performance.now(), i, r;
    for (i = 0; i < n; i++) {
      r = L.ask(text, tau);
      if (!acc) acc = r.spans.map(function (s) { return { n: s.n, ms: 0 }; });
      r.spans.forEach(function (s, j) { acc[j].ms += s.ms; });
    }
    var total = (performance.now() - t0) / n;
    acc.forEach(function (s) { s.ms /= n; });
    return { spans: acc, ms: total };
  }
  function fmt(v) { return v < 0.005 ? '<0.01' : v.toFixed(2); }
  function render(r) {
    var tm = timing(r.q); r.spans = tm.spans; r.ms = tm.ms;
    var a = $('#answer'), html;
    if (r.answered) {
      html = '<p class="a-text">' + r.cites.map(function (h, i) { return esc(h.d.x) + ' <a class="cite" href="' + esc(h.d.h) + '" aria-label="Source ' + (i + 1) + ': ' + esc(h.d.t) + '">[' + (i + 1) + ']</a>'; }).join(' ') + '</p>' +
        '<ul class="srcs mono">' + r.cites.map(function (h, i) { return '<li>[' + (i + 1) + '] <a href="' + esc(h.d.h) + '">' + esc(h.d.t) + '</a> <span>score ' + h.s.toFixed(2) + '</span></li>'; }).join('') + '</ul>';
    } else {
      html = '<p class="a-text refuse">I can\'t answer that from the portfolio material, so I won\'t guess.</p>' +
        (r.top.s > 0 ? '<p class="near mono">Closest passage: <a href="' + esc(r.top.d.h) + '">' + esc(r.top.d.t) + '</a>, but confidence ' + r.conf.toFixed(2) + ' is below the ' + tau.toFixed(1) + ' threshold.</p>'
          : '<p class="near mono">No passage shares a meaningful term with the question.</p>');
    }
    html += '<div class="gauge" aria-hidden="true"><i style="width:' + Math.min(100, r.conf / 9 * 100) + '%"></i><b style="left:' + Math.min(100, tau / 9 * 100) + '%"></b></div>' +
      '<p class="gl mono"><span>confidence ' + r.conf.toFixed(2) + '</span><span>threshold ' + tau.toFixed(1) + '</span></p>';
    a.innerHTML = html;
    var tot = r.spans.reduce(function (s, x) { return s + x.ms; }, 0) || 1;
    $('#trace').innerHTML = '<div class="tr-title mono">trace &middot; ' + fmt(r.ms) + ' ms per query, averaged over 400 runs in your browser</div>' +
      r.spans.map(function (s, i) { return '<div class="sp mono"><span>' + esc(s.n) + '</span><span class="bar"><i style="--w:' + Math.max(4, s.ms / tot * 100) + '%;--d:' + (i * 0.08) + 's"></i></span><span>' + fmt(s.ms) + 'ms</span></div>'; }).join('');
    var ev = [
      ['non_empty', 'pass'], ['cited', r.answered ? (r.cites.length ? 'pass' : 'flag') : 'n/a'],
      ['support', r.conf >= tau ? 'pass' : 'flag: low support'], ['fast_response', r.ms < 50 ? 'pass' : 'flag']
    ];
    $('#evals').innerHTML = ev.map(function (e) { return '<span class="chip-ev mono ' + (e[1] === 'pass' ? 'ok' : e[1] === 'n/a' ? 'na' : 'warn') + '">' + e[0] + ': ' + e[1] + '</span>'; }).join('');
    requestAnimationFrame(function () { requestAnimationFrame(function () { $('#trace').classList.add('in'); }); });
  }
  function run(text) {
    text = (text || '').trim(); if (!text) return;
    $('#trace').classList.remove('in');
    render(L.ask(text, tau));
  }
  if (form) form.addEventListener('submit', function (e) { e.preventDefault(); run(q.value); });
  Array.prototype.forEach.call(d.querySelectorAll('[data-q]'), function (b) {
    b.addEventListener('click', function () { q.value = b.getAttribute('data-q'); run(q.value); });
  });

  /* eval harness */
  var tauEl = $('#tau');
  function sweepSvg() {
    var W = 560, H = 180, pad = 28, pts = [], t;
    for (t = 0.5; t <= 7.001; t += 0.25) { var e = L.runEval(t); pts.push([t, e.hit / e.ans, e.ref / e.neg]); }
    function x(v) { return pad + (v - 0.5) / 6.5 * (W - pad * 2); }
    function y(v) { return H - pad - v * (H - pad * 2); }
    function line(i, cls) { return '<polyline class="' + cls + '" fill="none" points="' + pts.map(function (p) { return x(p[0]).toFixed(1) + ',' + y(p[i]).toFixed(1); }).join(' ') + '"/>'; }
    var grid = [0, 0.5, 1].map(function (v) { return '<line class="gr" x1="' + pad + '" x2="' + (W - pad) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="2" y="' + (y(v) + 4) + '">' + (v * 100) + '%</text>'; }).join('');
    var xs = [1, 2, 3, 4, 5, 6, 7].map(function (v) { return '<text x="' + (x(v) - 4) + '" y="' + (H - 8) + '">' + v + '</text>'; }).join('');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Answerable questions answered correctly and unanswerable questions refused, across confidence thresholds">' + grid + xs + line(1, 'l-hit') + line(2, 'l-ref') + '<line id="tmark" class="tm" y1="' + (pad - 6) + '" y2="' + (H - pad) + '"/></svg>';
  }
  function paintEval() {
    var e = L.runEval(tau);
    $('#tauv').textContent = tau.toFixed(1);
    $('#metrics').innerHTML =
      '<div class="m"><b>' + e.hit + '/' + e.ans + '</b><span>answerable questions answered with the right citation</span></div>' +
      '<div class="m"><b>' + e.ref + '/' + e.neg + '</b><span>unanswerable questions correctly refused</span></div>' +
      '<div class="m"><b>' + Math.round(e.total * 100) + '%</b><span>overall on this set</span></div>';
    var m = $('#tmark'); if (m) { var X = 28 + (tau - 0.5) / 6.5 * (560 - 56); m.setAttribute('x1', X); m.setAttribute('x2', X); }
    $('#erows').innerHTML = e.rows.map(function (r) {
      var out = r.r.answered ? 'answered from [' + r.r.cites.map(function (h) { return h.d.id; }).join(', ') + ']' : 'refused';
      var want = r.c.want ? 'expects ' + r.c.want : 'should refuse';
      return '<tr class="' + (r.pass ? 'p' : 'f') + '"><td class="mono">' + (r.pass ? 'pass' : 'FAIL') + '</td><td>' + esc(r.c.q) + '</td><td class="mono">' + want + '</td><td class="mono">' + out + '</td></tr>';
    }).join('');
    if (q && q.value) run(q.value);
  }
  if (tauEl) {
    tauEl.value = tau;
    $('#sweep').innerHTML = sweepSvg();
    tauEl.addEventListener('input', function () { tau = parseFloat(tauEl.value); paintEval(); });
    paintEval();
  }

  /* agent trace evals */
  var PRE = {
    ok: { run_id: 'run_ok', status: 'ok', output: 'Found 3 prices on the pricing page.', spans: [{ name: 'agent.plan', ms: 212, status: 'ok' }, { name: 'tool.navigate', ms: 88, status: 'ok' }, { name: 'tool.extract', ms: 140, status: 'ok' }] },
    slow: { run_id: 'run_slow', status: 'ok', output: 'Found 3 prices on the pricing page.', spans: [{ name: 'agent.plan', ms: 240, status: 'ok' }, { name: 'tool.navigate', ms: 4100, status: 'ok' }, { name: 'tool.extract', ms: 150, status: 'ok' }] },
    empty: { run_id: 'run_empty', status: 'ok', output: '', spans: [{ name: 'agent.plan', ms: 190, status: 'ok' }, { name: 'tool.extract', ms: 120, status: 'ok' }] },
    err: { run_id: 'run_err', status: 'failed', output: 'Could not complete the task.', spans: [{ name: 'agent.plan', ms: 205, status: 'ok' }, { name: 'tool.navigate', ms: 90, status: 'ok' }, { name: 'tool.fill', ms: 3100, status: 'error', error: 'timeout waiting for #email' }] }
  };
  var tj = $('#tjson'), slow = $('#slow');
  function evalTrace(t, slowMs) {
    var spans = Array.isArray(t.spans) ? t.spans : [], bad, out = [];
    var failed = t.status != null && t.status !== 'ok';
    out.push(['failed_run', !failed, failed ? 'run status is "' + t.status + '"' : 'run status is ok']);
    bad = spans.filter(function (s) { return +s.ms > slowMs; });
    out.push(['slow_response', !bad.length, bad.length ? bad.map(function (s) { return s.name + ' took ' + s.ms + ' ms'; }).join('; ') + ' (limit ' + slowMs + ' ms)' : 'no step over ' + slowMs + ' ms']);
    var empty = !String(t.output == null ? '' : t.output).trim();
    out.push(['empty_output', !empty, empty ? 'the run returned no output' : 'output has ' + String(t.output).length + ' characters']);
    bad = spans.filter(function (s) { return s.status != null && s.status !== 'ok'; });
    out.push(['tool_error', !bad.length, bad.length ? bad.map(function (s) { return s.name + ': ' + (s.error || s.status); }).join('; ') : 'every tool call succeeded']);
    return { out: out, spans: spans };
  }
  function paintTrace() {
    if (!tj) return;
    $('#slowv').textContent = slow.value + ' ms';
    var t;
    try { t = JSON.parse(tj.value); if (!t || typeof t !== 'object') throw new Error('not an object'); } catch (e) {
      $('#tview').innerHTML = '<p class="a-text refuse">That isn\'t valid JSON yet: ' + esc(e.message) + '</p>'; $('#tevals').innerHTML = ''; return;
    }
    var r = evalTrace(t, +slow.value), total = r.spans.reduce(function (s, x) { return s + (+x.ms || 0); }, 0) || 1, acc = 0, flags = r.out.filter(function (o) { return !o[1]; }).length;
    $('#tview').innerHTML = '<div class="tr-title mono">' + esc(t.run_id || 'run') + ' &middot; ' + total + ' ms across ' + r.spans.length + ' steps</div>' + r.spans.map(function (s) {
      var l = acc / total * 100, w = Math.max(1.5, (+s.ms || 0) / total * 100), bad = s.status != null && s.status !== 'ok' || +s.ms > +slow.value; acc += +s.ms || 0;
      return '<div class="wf mono"><span>' + esc(s.name) + '</span><span class="wfb"><i class="' + (bad ? 'bad' : '') + '" style="left:' + l + '%;width:' + w + '%"></i></span><span>' + esc(s.ms) + 'ms</span></div>';
    }).join('');
    $('#tevals').innerHTML = '<p class="tsum mono ' + (flags ? 'warn' : 'ok') + '">' + (flags ? 'Flagged by ' + flags + ' of 4 rules' : 'All 4 rules passed') + '</p>' + r.out.map(function (o) {
      return '<div class="ev mono ' + (o[1] ? 'ok' : 'warn') + '"><b>' + (o[1] ? 'pass' : 'FLAG') + '</b><span>' + o[0] + '</span><em>' + esc(o[2]) + '</em></div>';
    }).join('');
  }
  if (tj) {
    tj.value = JSON.stringify(PRE.err, null, 2);
    tj.addEventListener('input', paintTrace); slow.addEventListener('input', paintTrace);
    Array.prototype.forEach.call(d.querySelectorAll('[data-p]'), function (b) {
      b.addEventListener('click', function () { tj.value = JSON.stringify(PRE[b.getAttribute('data-p')], null, 2); paintTrace(); });
    });
    paintTrace();
  }

  var p = new URLSearchParams(location.search).get('q');
  if (p && q) { q.value = p; run(p); }
})();
