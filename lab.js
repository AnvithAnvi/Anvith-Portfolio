/* Lab engine: BM25F-style retrieval over passages from the resume, extractive answers with citations, and a
   thresholded refusal gate. No LLM, no network.
   The settings in lab-model.js (BM25 parameters, learned query filler words, per-passage learned aliases, threshold)
   are produced by lab-eval/train.js from the questions in lab-eval/questions.json. */
(function (root) {
  'use strict';
  var DOCS = [
    { id: 'p1', t: 'Current role', h: 'experience.html#enclavia', x: 'Anvith currently works as an AI/ML Engineering Intern at Enclavia AI, from Sep 2026 to the present, on an on-premises AI agent platform. He started there in Sep 2026 and is employed there now.' },
    { id: 'p2', t: 'Enclavia: metrics', h: 'experience.html#enclavia', x: 'At Enclavia he built the dashboard specification and metric engine: a versioned widget contract, a DuckDB metric compiler with a SQL guard, and a semantic data model for column roles, status meanings and joins that grounds agent-generated dashboards in customer data.' },
    { id: 'p3', t: 'Enclavia: guardrails', h: 'experience.html#enclavia', x: 'He added LLM on-task relevance scoring to the guardrail pipeline, logged next to guardrail decisions as a non-blocking signal for monitoring and evaluation.' },
    { id: 'p4', t: 'Enclavia: wireframes', h: 'experience.html#enclavia', x: 'He prototyped wireframe-to-dashboard generation that renders uploaded HTML layouts, binds CSV data in place of sample figures, and runs section controls without executing untrusted scripts.' },
    { id: 'p5', t: 'Enclavia: eval packets', h: 'experience.html#enclavia', x: 'He prepared customer evaluation packets for judiciary, financial services and U.S. Air Force agent demos, and built a spec-driven Vue dashboard designer with join validation, tests, YAML upload and automated data profiling.' },
    { id: 'p6', t: 'UpGrad internship', h: 'experience.html#upgrad', x: 'Data Science Intern at UpGrad, Jan to May 2024. He developed a TensorFlow training pipeline for a Human Activity Recognition system across 6 activity classes, modularizing preprocessing and feature extraction into 4 stages to support faster model iteration on time-series sensor data.' },
    { id: 'p7', t: 'UpGrad: results', h: 'experience.html#upgrad', x: 'The activity recognition model reached 97.5% accuracy on accelerometer and gyroscope time series using ensemble classification and threshold tuning, which improved fall-detection reliability. Better feature engineering and model iteration workflows cut preprocessing time 30% and model-training time 20%.' },
    { id: 'p8', t: 'TekWissen internship', h: 'experience.html#tekwissen', x: 'Computer Vision and IoT Summer Intern at TekWissen, May to Aug 2023. He built a real-time plant disease detection pipeline with TensorFlow and OpenCV across 8 classes, tuned for sub-second inference on edge hardware.' },
    { id: 'p9', t: 'TekWissen: deployment', h: 'experience.html#tekwissen', x: 'He converted the vision model to TensorFlow Lite with post-training quantization for IoT devices, and automated a pipeline that generates 5,000+ synthetic training samples weekly for underrepresented classes.' },
    { id: 'p10', t: 'AgentWatch', h: 'agentwatch.html', x: 'AgentWatch (June 2026) is an observability and tracing platform for AI agents. Its tech stack: a Python SDK records every run as spans with tool calls, latency, inputs, outputs, statuses and evaluation results, stored through SQLite and SQLAlchemy behind a FastAPI backend, and a React and Vite dashboard lets engineers monitor runs, inspect tool calls and debug failures.' },
    { id: 'p11', t: 'AgentWatch: evals', h: 'agentwatch.html#evals', x: 'AgentWatch runs rule-based evaluations over recorded traces from simulated agent workflows. They flag failed runs, slow responses, empty outputs and tool-execution errors, in line with eval-driven LLM engineering.' },
    { id: 'p12', t: 'RAFT ArXiv', h: 'raft-arxiv.html', x: 'RAFT ArXiv (March 2026) is retrieval-augmented fine-tuning. It fine-tunes Phi-2 (2.7B parameters) with QLoRA, a LoRA-based PEFT method, on a custom question-answer dataset built from 200 ArXiv papers, using an 80/20 mix of oracle and distractor context so the model learns to give citation-grounded answers and refuse unsupported ones.' },
    { id: 'p13', t: 'RAFT: evaluation', h: 'raft-arxiv.html#eval', x: 'A FastAPI side-by-side evaluation interface benchmarks the fine-tuned model against Llama-3 on citation precision, answer faithfulness and refusal accuracy.' },
    { id: 'p14', t: 'MCP Agent Browser', h: 'mcp-agent-browser.html', x: 'MCP Agent Browser (Nov 2025) is an LLM browser automation agent that turns plain-language instructions into click, fill, navigate and extract actions. It plans with LangChain ReAct, drives pages with Playwright through a structured tool-calling interface, and was validated across 20+ real-world workflows.' },
    { id: 'p15', t: 'MCP: failure analysis', h: 'mcp-agent-browser.html#failures', x: 'Failures in the browser agent clustered around ambiguous instructions, prompt structure, tool execution and multi-step planning, where an early wrong step carries through the rest of the task. Iterative prompt refinement and documenting these failure patterns improved reliability and informed tool-calling and orchestration design.' },
    { id: 'p16', t: 'Other projects', h: 'projects.html', x: 'Other projects on his GitHub include a Multi-Agent Research Pipeline with LangGraph planner, worker, critic and final agents behind a CLI, FastAPI and Streamlit; a Local RAG Assistant that runs offline on local models and a local vector store; a medical-diagnosis-agent with citation-backed RAG answers on LangChain; explain-my-model, an interactive SHAP dashboard; and Blog_to_Podcast.' },
    { id: 'p17', t: 'Education', h: 'about.html', x: 'Anvith earned a master\'s degree (M.S. in Data Science) at the New Jersey Institute of Technology in Newark (Aug 2024, finished May 2026) and a bachelor\'s degree (B.Tech in Computer Science) at Lovely Professional University in Punjab, India (Jul 2020 to Jul 2024).' },
    { id: 'p18', t: 'Skills: LLM systems', h: 'about.html', x: 'Generative AI and LLM skills: RAG, LangChain, Hugging Face Transformers, ChromaDB as the vector database, fine-tuning with QLoRA, LoRA and PEFT, Llama-3, Ollama, and prompt engineering.' },
    { id: 'p19', t: 'Skills: machine learning', h: 'about.html', x: 'Machine learning skills: PyTorch, TensorFlow, TensorFlow Lite, scikit-learn, computer vision, OpenCV, time-series, feature engineering and model quantization.' },
    { id: 'p20', t: 'Certifications and service', h: 'about.html', x: 'Certifications: Google Data Analytics, and Neural Networks and Deep Learning (Coursera and DataCamp, 2025). National Service Scheme recognition for 470+ hours of community service.' },
    { id: 'p21', t: 'What he is looking for', h: 'about.html', x: 'Anvith is looking for entry-level AI/ML engineering roles, especially LLM systems, RAG, agents and evaluation. Email is the fastest way to reach him.' },
    { id: 'p22', t: 'Summary', h: 'about.html', x: 'Anvith Vattikuti is an AI/ML engineer with an M.S. in Data Science who builds and deploys LLM applications: RAG, QLoRA and PEFT fine-tuning, tool-calling AI agents, guardrails and LLM evaluation. He works at Enclavia AI on an on-premises AI agent platform, and has a computer vision and time-series machine learning foundation in Python, PyTorch and TensorFlow.' },
    { id: 'p23', t: 'Contact', h: 'about.html', x: 'To contact Anvith, email vattikutianvith@gmail.com, find him on LinkedIn at linkedin.com/in/anvithvattikuti, or see his code on GitHub at github.com/AnvithAnvi.' },
    { id: 'p24', t: 'Skills: engineering and data', h: 'about.html', x: 'Engineering and data skills: Python, SQL, DuckDB, FastAPI, REST APIs, Docker, Git, CI/CD, unit testing, Vue, React, Pandas, NumPy, Tableau and Power BI.' },
    { id: 'p25', t: 'Skills: agents and evaluation', h: 'about.html', x: 'AI agents and evaluation skills: agentic AI, ReAct agents, Model Context Protocol (MCP), function calling, guardrails, LLM evaluation, observability and Playwright.' }
  ];

  var BASE_STOP = ('a an the of and or to in on at for with is are was were be been by from as it its his he him her what which who whom how did does do has have had this that these those about me my you your there their them can could would should will any some also than then so if into over under per via'
    + ' anvith krishna vattikuti tell whats where when now right why moment many much please give show list').split(' ');

  /* small domain lexicon: every word in a group is rewritten to the first one, on both the passage and the query side */
  var GROUPS = {
    1: [
      ['role', 'work', 'works', 'working', 'worked', 'job', 'employer', 'company', 'employed', 'employ', 'employment', 'position', 'title', 'career'],
      ['current', 'currently', 'present'],
      ['education', 'studied', 'study', 'degree', 'masters', 'master', 'university', 'school', 'college', 'graduate', 'graduated', 'graduation', 'educational', 'bachelor', 'bachelors', 'undergrad', 'undergraduate'],
      ['accuracy', 'accurate', 'accurately'],
      ['fail', 'failure', 'failures', 'failed', 'fails', 'failing', 'break', 'breaks'],
      ['contact', 'reach', 'email', 'mail', 'touch'],
      ['seeking', 'hire', 'hiring', 'hired', 'available', 'availability', 'opportunity', 'opportunities', 'open', 'seek', 'looking', 'want', 'wants', 'hoping', 'hope'],
      ['certification', 'certifications', 'certified', 'certificate', 'certificates', 'course', 'courses', 'credential'],
      ['volunteer', 'volunteering', 'community', 'service'],
      ['stack', 'tech', 'technology', 'technologies'],
      ['test', 'tested', 'tests', 'testing', 'validate', 'validated'],
      ['start', 'started', 'begin', 'began', 'since'],
      ['finish', 'finished', 'complete', 'completed', 'end', 'ended'],
      ['build', 'built', 'create', 'created', 'develop', 'developed', 'made', 'make', 'implement', 'implemented', 'construct']
    ],
    2: [['skill', 'know', 'knows', 'familiar', 'proficient', 'expertise', 'experience', 'experienced', 'capable', 'comfortable']]
  };

  /* intent routes: a few phrasings that carry no content words ("who is he", "short bio") but clearly ask for one passage */
  var ROUTES = [
    ['p22', /\bwho (is|'s|s) (he|anvith|krishna|this)\b|\bwho are you\b|\bintroduce (him|yourself|anvith)\b|\b(short |quick )?bio\b|\btell me about (him|yourself|anvith|krishna)\b|\bwhat (does|do) (he|anvith|you) do\b|\bwhat (is|are|s) (his|your) (specialty|speciality|specialization|expertise|area of expertise)\b|\bfield of expertise\b|\bknown for\b|\bwhat (kind|sort|type) of (engineer|developer|person|professional)\b|\bsummar(y|ize|ise)\b/i],
    ['p23', /e-?mail|\blinkedin\b|\bcontact\b|get in touch|reach (him|out)|\bgithub (username|profile|handle|account|link)\b|\bwhere (can|do) i (find|see) (his )?(code|github)\b/i]
  ];

  function stemmer(mode) {
    if (mode === 0) return function (w) { return w; };
    if (mode === 2) return function (w) { return w.length > 3 && /[^s]s$/.test(w) ? w.slice(0, -1) : w; };
    return function (w) { if (w.length > 4) w = w.replace(/(ing|ed|es|s)$/, ''); return w; };
  }

  function build(docs, M) {
    var P = M.params, stem = stemmer(P.stem), STOP = {}, ALIAS = {}, FILL = {};
    BASE_STOP.forEach(function (w) { STOP[w] = 1; });
    for (var lv = 1; lv <= (P.syn || 0); lv++) GROUPS[lv].forEach(function (g) { g.slice(1).forEach(function (w) { ALIAS[w] = g[0]; }); });
    (M.filler || []).forEach(function (w) { FILL[w] = 1; });
    function tok(s, isQuery) {
      return s.toLowerCase().replace(/[^a-z0-9+%.]+/g, ' ').replace(/\.(?=\s|$)/g, '').split(/\s+/)
        .filter(function (w) { return w && !STOP[w] && w.length > 1; })
        .map(function (w) { return stem(ALIAS[w] || w); })
        .filter(function (w) { return !(isQuery && FILL[w]); });
    }
    var N = docs.length, df = {}, avg = 0, D = docs.map(function (d) {
      var tf = {}, dl = 0;
      function add(list, wt) { list.forEach(function (w) { tf[w] = (tf[w] || 0) + wt; dl += wt; }); }
      add(tok(d.x), 1); add(tok(d.t), P.tw); add(tok((M.aliases && M.aliases[d.id]) || ''), P.aw);
      Object.keys(tf).forEach(function (w) { if (tf[w] > 0) df[w] = (df[w] || 0) + 1; });
      avg += dl; return { d: d, tf: tf, dl: dl };
    });
    avg /= N;
    function idf(w) { var n = df[w] || 0; return Math.log(1 + (N - n + 0.5) / (n + 0.5)); }
    var MAXIDF = idf('zzzunknown');

    function score(q) {
      var qt = []; tok(q, true).forEach(function (w) { if (qt.indexOf(w) < 0) qt.push(w); });
      var hits = D.map(function (e) {
        var s = 0; qt.forEach(function (w) { var f = e.tf[w]; if (f) s += idf(w) * f * (P.k1 + 1) / (f + P.k1 * (1 - P.b + P.b * e.dl / avg)); });
        return { d: e.d, s: s, e: e };
      }).sort(function (a, b) { return b.s - a.s; });
      var route = null;
      if (P.rt !== 0) ROUTES.some(function (r) { if (r[1].test(q)) { route = r[0]; return true; } });
      if (route) {
        var at = hits.map(function (h) { return h.d.id; }).indexOf(route), hr = hits.splice(at, 1)[0];
        hr.s = Math.max(hr.s, hits[0].s, 3); hits.unshift(hr);
      }
      var top = hits[0], tot = 0, got = 0;
      qt.forEach(function (w) { var i = (df[w] ? idf(w) : MAXIDF); tot += i; if (top.e.tf[w]) got += i; });
      var cov = route ? 1 : (tot ? got / tot : 0);
      return { q: q, qt: qt, hits: hits, top: top, cov: cov, routed: route, conf: top.s * Math.pow(cov, P.g || 1) };
    }
    function finish(r, tau) {
      var ok = r.conf >= tau && (r.qt.length > 0 || r.routed) && r.cov >= (P.mc || 0), cites = [];
      if (ok) { cites.push(r.top); if (P.r2 < 1.5 && r.hits[1].s >= P.r2 * r.top.s && r.hits[1].s * Math.pow(r.cov, P.g || 1) >= tau) cites.push(r.hits[1]); }
      r.answered = ok; r.cites = cites; return r;
    }
    function ask(q, tau) {
      var t0 = performance.now(), spans = [], t = t0;
      function lap(n) { var now = performance.now(); spans.push({ n: n, ms: now - t }); t = now; }
      var r = score(q); lap('retrieve (BM25)');
      lap('rank + coverage');
      finish(r, tau); lap('support gate');
      lap('compose');
      r.hits = r.hits.slice(0, 4); r.spans = spans; r.ms = performance.now() - t0;
      return r;
    }
    return { ask: ask, score: score, finish: finish, tok: tok, docs: docs };
  }

  var M = root.LabModel || (typeof require !== 'undefined' ? require('./lab-model.js') : null);
  var DATA = root.LabData || (typeof require !== 'undefined' ? require('./lab-data.js') : []);
  var engine = build(DOCS, M);

  function rowsFor(split) { return DATA.filter(function (r) { return split === 'all' || r.split === split; }); }
  function runEval(tau, split) {
    split = split || 'test';
    var ans = 0, hit = 0, neg = 0, ref = 0, rows = rowsFor(split).map(function (c) {
      var r = engine.ask(c.q, tau), pass;
      if (c.want) { ans++; pass = r.answered && r.cites.some(function (h) { return c.want.indexOf(h.d.id) >= 0; }); if (pass) hit++; }
      else { neg++; pass = !r.answered; if (pass) ref++; }
      return { c: c, r: r, pass: pass };
    });
    return { rows: rows, hit: hit, ans: ans, ref: ref, neg: neg, total: rows.length ? (hit + ref) / rows.length : 0, split: split };
  }
  var api = { DOCS: DOCS, SET: rowsFor('test'), ask: engine.ask, runEval: runEval, TAU: M.tau, build: build, MODEL: M, DATA: DATA };
  if (typeof module !== 'undefined') module.exports = api; else root.Lab = api;
})(this);
