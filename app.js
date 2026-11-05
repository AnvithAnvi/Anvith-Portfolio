/* Anvith Vattikuti portfolio v2 (rework): shared behavior. Every feature is guarded by element presence. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  function $(s, c) { return (c || d).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* reveal on load */
  requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('go'); }); });

  /* theme toggle */
  var tbtn = $('#theme');
  function isDark() { return root.getAttribute('data-theme') !== 'light'; }
  function paintTheme() {
    if (!tbtn) return;
    var dark = isDark();
    tbtn.textContent = dark ? 'Light' : 'Dark';
    tbtn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  }
  if (tbtn) {
    paintTheme();
    tbtn.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('av-theme', next); } catch (e) {}
      try { sessionStorage.setItem('av-theme', next); } catch (e) {}
      try { window.name = 'av-theme:' + next; } catch (e) {}
      paintTheme();
    });
  }

  /* scroll-triggered reveals, counters, trace */
  function countUp(el) {
    var to = parseFloat(el.getAttribute('data-count')), dec = parseInt(el.getAttribute('data-dec') || '0', 10),
      suf = el.getAttribute('data-suf') || '', comma = el.hasAttribute('data-comma');
    function fmt(v) { var s = v.toFixed(dec); if (comma) s = Number(s).toLocaleString('en-US', { minimumFractionDigits: dec }); return s + suf; }
    if (reduce) { el.textContent = fmt(to); return; }
    var t0 = null;
    (function step(t) {
      if (t0 === null) t0 = t;
      var p = clamp((t - t0) / 1400, 0, 1), e = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(to * e);
      if (p < 1) requestAnimationFrame(step);
    })(performance.now());
  }
  if (innerWidth <= 900) $$('.pcard').forEach(function (c) { c.classList.add('rv'); });
  var revealTargets = $$('.rv, .stat, .trace');
  if ('IntersectionObserver' in window) {
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var t = e.target; t.classList.add('in'); rio.unobserve(t);
        $$('[data-count]', t).forEach(countUp);
        if (t.hasAttribute('data-count')) countUp(t);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    revealTargets.forEach(function (t) { rio.observe(t); });
  } else {
    revealTargets.forEach(function (t) { t.classList.add('in'); $$('[data-count]', t).forEach(countUp); });
  }

  /* rotating hero word */
  var rot = $('#rot');
  if (rot) {
    var words = $$('span', rot), wi = 0;
    words[0].className = 'on';
    if (words.length > 1) {
      setInterval(function () {
        var cur = words[wi]; wi = (wi + 1) % words.length;
        cur.className = 'off';
        setTimeout(function () { cur.className = ''; }, 700);
        words[wi].className = 'on';
      }, 2600);
    }
  }

  /* cursor glow, spotlight cards, magnetic buttons (pointer devices only) */
  var glow = $('#glow');
  if (fine && !reduce) {
    if (glow) {
      var gx = 0, gy = 0, gt = false;
      addEventListener('mousemove', function (e) {
        gx = e.clientX; gy = e.clientY; glow.classList.add('on');
        if (!gt) { gt = true; requestAnimationFrame(function () { gt = false; glow.style.transform = 'translate(' + gx + 'px,' + gy + 'px)'; }); }
      }, { passive: true });
    }
    $$('.spot').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
    $$('.btn').forEach(function (b) {
      b.addEventListener('mousemove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.18) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.28) + 'px)';
      });
      b.addEventListener('mouseleave', function () { b.style.transform = ''; });
    });
  }

  /* career trace */
  var SPANS = [
    { id: 'tek', label: 'TekWissen', layer: 'ml', start: 0, len: 4, title: 'Computer Vision & IoT Summer Intern, TekWissen', when: 'May – Aug 2023',
      text: 'Real-time plant disease detection across 8 classes, tuned for sub-second inference on edge hardware and shipped as TensorFlow Lite. An automated pipeline generated 5,000+ synthetic training samples a week.', href: 'experience.html#tekwissen' },
    { id: 'upg', label: 'UpGrad', layer: 'ml', start: 8, len: 5, title: 'Data Science Intern, UpGrad', when: 'Jan – May 2024',
      text: 'A TensorFlow Human Activity Recognition pipeline over 6 activity classes that reached 97.5% accuracy, with preprocessing time cut 30% and training time cut 20%.', href: 'experience.html#upgrad' },
    { id: 'njit', label: 'NJIT, M.S.', layer: 'study', start: 15, len: 22, title: 'M.S. Data Science, New Jersey Institute of Technology', when: 'Aug 2024 – May 2026',
      text: 'M.S. in Data Science, the stretch in which the agent, retrieval and evaluation projects were built.', href: 'about.html' },
    { id: 'mcp', label: 'MCP Agent Browser', layer: 'agents', start: 30, len: 1, title: 'MCP Agent Browser', when: 'Nov 2025',
      text: 'An LLM agent that turns plain-language instructions into click, fill, navigate and extract actions, tested across 20+ real workflows.', href: 'mcp-agent-browser.html' },
    { id: 'raft', label: 'RAFT on arXiv', layer: 'llm', start: 34, len: 1, title: 'RAFT on arXiv', when: 'Mar 2026',
      text: 'Phi-2 fine-tuned with QLoRA on a QA set built from 200 ArXiv papers, taught to cite passages and refuse unsupported answers.', href: 'raft-arxiv.html' },
    { id: 'aw', label: 'AgentWatch', layer: 'agents', start: 37, len: 1, title: 'AgentWatch', when: 'Jun 2026',
      text: 'Observability and evaluation for AI agents: a Python SDK records every run, a dashboard shows tool calls, and rule-based evals flag failures.', href: 'agentwatch.html' },
    { id: 'enc', label: 'Enclavia AI', layer: 'llm', start: 40, len: 3, title: 'AI/ML Engineering Intern, Enclavia AI', when: 'Sep 2026 – present', live: true,
      text: 'Building the dashboard spec and metric engine, LLM on-task scoring in the guardrail pipeline, and agent demo evaluation packets for an on-prem AI platform.', href: 'experience.html#enclavia' }
  ];
  var TOTAL = 43;
  var rows = $('#rows'), detail = $('#detail'), ticks = $('#ticks');
  var byId = {}, rowEls = {};

  function select(id) {
    var s = byId[id]; if (!s || !detail) return;
    Object.keys(rowEls).forEach(function (k) { rowEls[k].setAttribute('aria-pressed', k === id ? 'true' : 'false'); });
    detail.innerHTML = '<h3>' + esc(s.title) + '</h3><div class="when mono">' + esc(s.when) + '</div><p>' + esc(s.text) +
      '</p><a href="' + esc(s.href) + '">Read more &rarr;</a>';
  }
  if (ticks) {
    [[0, '2023'], [8, '2024'], [20, '2025'], [32, '2026']].forEach(function (t) {
      var sp = d.createElement('span'); sp.className = 'mono'; sp.textContent = t[1];
      sp.style.left = (t[0] / TOTAL * 100) + '%'; ticks.appendChild(sp);
    });
  }
  if (rows) {
    SPANS.forEach(function (s, i) {
      byId[s.id] = s;
      var b = d.createElement('button');
      b.type = 'button'; b.className = 'tr-row'; b.setAttribute('aria-pressed', 'false');
      b.innerHTML = '<span class="tr-label">' + esc(s.label) + '</span><span class="tr-track"><span class="tr-bar l-' + s.layer +
        (s.live ? ' live' : '') + '" style="left:' + (s.start / TOTAL * 100) + '%;width:' + (s.len / TOTAL * 100) + '%;--d:' + (0.12 * i + 0.15) + 's"></span></span>';
      b.addEventListener('click', function () { select(s.id); });
      b.addEventListener('mouseenter', function () { select(s.id); });
      rows.appendChild(b); rowEls[s.id] = b;
    });
    var over = d.createElement('div'); over.className = 'over'; over.setAttribute('aria-hidden', 'true');
    over.innerHTML = '<div class="playhead"></div>'; rows.appendChild(over);
    select('enc');
  }

  /* stacking project cards: earlier cards recede as the next one slides over */
  var cards = $$('.pcard');
  function stack() {
    if (!cards.length) return;
    if (innerWidth <= 900 || reduce) { cards.forEach(function (c) { c.style.transform = ''; c.style.filter = ''; }); return; }
    cards.forEach(function (c, i) {
      var next = cards[i + 1], t = 0;
      if (next) {
        var stickTop = 96 + (i + 1) * 18, gap = next.getBoundingClientRect().top - stickTop;
        t = clamp(1 - gap / Math.max(c.offsetHeight, 1), 0, 1);
      }
      c.style.transform = 'scale(' + (1 - t * 0.06) + ')';
      c.style.filter = 'brightness(' + (1 - t * 0.4) + ')';
    });
  }

  /* scroll: progress bar, experience timeline fill, card stack */
  var prog = $('#progress'), xw = $('#xwrap'), xfill = $('#xfill'), xe = $$('.xentry'), tick = false;
  function onScroll() {
    tick = false;
    if (prog) {
      var max = root.scrollHeight - innerHeight;
      prog.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, scrollY / max) : 0) + ')';
    }
    if (xw && xfill) {
      var r = xw.getBoundingClientRect(), mid = innerHeight * 0.55;
      xfill.style.setProperty('--fill', clamp(mid - r.top, 0, r.height) + 'px');
      xe.forEach(function (e) { e.classList.toggle('on', e.getBoundingClientRect().top < mid); });
    }
    stack();
  }
  addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* case-study table of contents scroll-spy */
  var toc = $$('.toc a[href^="#"]');
  if (toc.length && 'IntersectionObserver' in window) {
    var map = {};
    toc.forEach(function (a) { var t = d.getElementById(a.getAttribute('href').slice(1)); if (t) map[t.id] = a; });
    var so = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        toc.forEach(function (a) { a.removeAttribute('aria-current'); });
        map[e.target.id].setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    Object.keys(map).forEach(function (k) { so.observe(d.getElementById(k)); });
  }

  /* mobile menu */
  var menu = $('#menu'), pill = $('.pill');
  function closeMenu() { if (pill) pill.classList.remove('open'); if (menu) { menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Open menu'); } }
  if (menu && pill) {
    menu.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !pill.classList.contains('open');
      pill.classList.toggle('open', open);
      menu.setAttribute('aria-expanded', open ? 'true' : 'false');
      menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    d.addEventListener('click', function (e) { if (!pill.contains(e.target)) closeMenu(); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
    addEventListener('resize', function () { if (innerWidth > 760) closeMenu(); });
  }

  /* page transitions: native cross-document view transitions where supported, a quick fade elsewhere */
  if (root.classList.contains('no-vt')) {
    d.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target && a.target !== '_self') return;
      var u; try { u = new URL(a.href, location.href); } catch (x) { return; }
      if (u.origin !== location.origin || !/\.html?$|\/$/.test(u.pathname) || (u.pathname === location.pathname && u.hash)) return;
      e.preventDefault(); root.classList.add('leaving');
      setTimeout(function () { location.href = a.href; }, 200);
    });
    addEventListener('pageshow', function (e) { if (e.persisted) root.classList.remove('leaving'); });
  }

  var yr = $('#yr'); if (yr) yr.textContent = new Date().getFullYear();
})();
