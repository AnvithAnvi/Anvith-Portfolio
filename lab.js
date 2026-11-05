/* Lab engine: BM25 retrieval over hand-written passages from the resume, extractive answers with citations,
   a thresholded refusal gate, and a small eval set. No LLM, no network. */
(function (root) {
  'use strict';
  var DOCS = [
    { id: 'p1', t: 'Current role', h: 'experience.html#enclavia', x: 'Anvith currently works as an AI/ML Engineering Intern at Enclavia AI, from Sep 2026 to the present, on an on-premises AI agent platform.' },
    { id: 'p2', t: 'Enclavia: metrics', h: 'experience.html#enclavia', x: 'At Enclavia he built the dashboard specification and metric engine: a versioned widget contract, a DuckDB metric compiler with a SQL guard, and a semantic data model for column roles, status meanings and joins.' },
    { id: 'p3', t: 'Enclavia: guardrails', h: 'experience.html#enclavia', x: 'He added LLM on-task relevance scoring to the guardrail pipeline, logged next to guardrail decisions as a non-blocking signal for monitoring and evaluation.' },
    { id: 'p4', t: 'Enclavia: wireframes', h: 'experience.html#enclavia', x: 'He prototyped wireframe-to-dashboard generation that renders uploaded HTML layouts and binds CSV data in place of sample figures, without running untrusted scripts.' },
    { id: 'p5', t: 'Enclavia: eval packets', h: 'experience.html#enclavia', x: 'He prepared customer evaluation packets for judiciary, financial services and U.S. Air Force agent demos, and built a spec-driven Vue dashboard designer with YAML upload and data profiling.' },
    { id: 'p6', t: 'UpGrad internship', h: 'experience.html#upgrad', x: 'Data Science Intern at UpGrad, Jan to May 2024. He developed a TensorFlow training pipeline for Human Activity Recognition across 6 activity classes, split into 4 preprocessing and feature stages.' },
    { id: 'p7', t: 'UpGrad: results', h: 'experience.html#upgrad', x: 'The activity recognition model reached 97.5% accuracy on accelerometer and gyroscope time series using ensemble classification and threshold tuning. Preprocessing time dropped 30% and model-training time dropped 20%.' },
    { id: 'p8', t: 'TekWissen internship', h: 'experience.html#tekwissen', x: 'Computer Vision and IoT Summer Intern at TekWissen, May to Aug 2023. He built a real-time plant disease detection pipeline with TensorFlow and OpenCV across 8 classes, tuned for sub-second inference on edge hardware.' },
    { id: 'p9', t: 'TekWissen: deployment', h: 'experience.html#tekwissen', x: 'He converted the vision model to TensorFlow Lite with post-training quantization for IoT devices, and automated a pipeline that generates 5,000+ synthetic training samples weekly for underrepresented classes.' },
    { id: 'p10', t: 'AgentWatch', h: 'agentwatch.html', x: 'AgentWatch is observability and evaluation for AI agents. A Python SDK records every run as spans with tool calls, latency, inputs, outputs and statuses, and a dashboard lets engineers inspect tool calls and debug failures.' },
    { id: 'p11', t: 'AgentWatch: evals', h: 'agentwatch.html#evals', x: 'AgentWatch runs rule-based evals over recorded traces that flag failed runs, slow responses, empty outputs and tool-execution errors.' },
    { id: 'p12', t: 'RAFT ArXiv', h: 'raft-arxiv.html', x: 'RAFT ArXiv fine-tunes Phi-2 (2.7B parameters) with QLoRA on a question-answer dataset built from 200 ArXiv papers, using an 80/20 mix of oracle and distractor context so the model learns to cite passages and refuse unsupported answers.' },
    { id: 'p13', t: 'RAFT: evaluation', h: 'raft-arxiv.html#eval', x: 'A side-by-side evaluation interface compares the fine-tuned model with Llama-3 on citation precision, faithfulness and refusal accuracy.' },
    { id: 'p14', t: 'MCP Agent Browser', h: 'mcp-agent-browser.html', x: 'MCP Agent Browser is an LLM agent that turns plain-language instructions into click, fill, navigate and extract actions. It plans with LangChain ReAct, drives pages with Playwright through a structured tool-calling interface, and was tested across 20+ real workflows.' },
    { id: 'p15', t: 'MCP: failure analysis', h: 'mcp-agent-browser.html#failures', x: 'Failures in the browser agent clustered around ambiguous instructions, prompt structure, and multi-step planning, where an early wrong step carries through the rest of the task.' },
    { id: 'p16', t: 'Other projects', h: 'projects.html', x: 'Other projects include a Multi-Agent Research Pipeline with LangGraph planner, worker, critic and final agents behind a CLI, FastAPI and Streamlit; a Local RAG Assistant that runs offline on local models and a local vector store; a medical-diagnosis-agent with citation-backed RAG answers on LangChain; explain-my-model, an interactive SHAP dashboard; and Blog_to_Podcast.' },
    { id: 'p17', t: 'Education', h: 'about.html', x: 'Anvith earned an M.S. in Data Science at the New Jersey Institute of Technology in Newark (Aug 2024 to May 2026) and a B.Tech in Computer Science at Lovely Professional University in Punjab, India (Jul 2020 to Jul 2024).' },
    { id: 'p18', t: 'Skills: LLM systems', h: 'about.html', x: 'LLM skills: RAG, LangChain, ChromaDB as the vector database, Hugging Face, QLoRA and PEFT fine-tuning, Llama-3, Ollama, and prompt engineering.' },
    { id: 'p19', t: 'Skills: ML and tooling', h: 'about.html', x: 'Machine learning and tooling skills: PyTorch, TensorFlow, TensorFlow Lite, scikit-learn, Pandas, NumPy, model evaluation, Python, SQL, FastAPI, Docker and Git.' },
    { id: 'p20', t: 'Certifications and service', h: 'about.html', x: 'Certifications: Google Data Analytics, and Neural Networks and Deep Learning (Coursera and DataCamp, 2025). National Service Scheme recognition for 470+ hours of community service.' },
    { id: 'p21', t: 'What he is looking for', h: 'about.html', x: 'Anvith is looking for entry-level AI/ML engineering roles, especially LLM systems, RAG, agents and evaluation. Email is the fastest way to reach him.' }
  ];
  var STOP = {}; ('a an the of and or to in on at for with is are was were be been by from as it its his he him her what which who whom how did does do has have had this that these those about me my you your there their them can could would should will any some also than then so if into over under per via'
    + ' anvith krishna tell whats where when now right why').split(' ').forEach(function (w) { STOP[w] = 1; });
  var ALIAS = { work: 'role', works: 'role', working: 'role', job: 'role', employer: 'role', company: 'role', currently: 'current', today: 'current', studied: 'education', study: 'education', degree: 'education', masters: 'education', master: 'education', university: 'education', school: 'education', college: 'education', accurate: 'accuracy', accurately: 'accuracy', failures: 'fail', failure: 'fail', failed: 'fail', fails: 'fail', failing: 'fail' };
  function stem(w) { if (w.length > 4) w = w.replace(/(ing|ed|es|s)$/, ''); return w; }
  function tok(s) {
    return s.toLowerCase().replace(/[^a-z0-9+%.]+/g, ' ').replace(/\.(?=\s|$)/g, '').split(/\s+/).filter(function (w) { return w && !STOP[w] && w.length > 1; })
      .map(function (w) { return stem(ALIAS[w] || w); });
  }
  var N = DOCS.length, df = {}, avg = 0;
  DOCS.forEach(function (d) { d.k = tok(d.t + ' ' + d.t + ' ' + d.x + ' ' + (d.a || '')); avg += d.k.length; var seen = {}; d.k.forEach(function (w) { if (!seen[w]) { seen[w] = 1; df[w] = (df[w] || 0) + 1; } }); });
  avg /= N;
  function idf(w) { var n = df[w] || 0; return Math.log(1 + (N - n + 0.5) / (n + 0.5)); }
  var MAXIDF = idf('zzzunknown');

  function ask(q, tau) {
    var t0 = performance.now(), spans = [], t = t0;
    function lap(n) { var now = performance.now(); spans.push({ n: n, ms: now - t }); t = now; }
    var qt = []; tok(q).forEach(function (w) { if (qt.indexOf(w) < 0) qt.push(w); }); lap('tokenize');
    var hits = DOCS.map(function (d) {
      var tf = {}; d.k.forEach(function (w) { tf[w] = (tf[w] || 0) + 1; });
      var s = 0; qt.forEach(function (w) { if (tf[w]) s += idf(w) * (tf[w] * 2.5) / (tf[w] + 1.5 * (0.25 + 0.75 * d.k.length / avg)); });
      return { d: d, s: s };
    }).sort(function (a, b) { return b.s - a.s; }); lap('retrieve (BM25)');
    var top = hits[0], tot = 0, got = 0;
    qt.forEach(function (w) { var i = (df[w] ? idf(w) : MAXIDF); tot += i; if (top.d.k.indexOf(w) >= 0) got += i; });
    var cov = tot ? got / tot : 0; lap('rank + coverage');
    var conf = top.s * cov, ok = conf >= tau && qt.length > 0; lap('support gate');
    var cites = [];
    if (ok) { cites.push(top); if (hits[1].s >= 0.75 * top.s && hits[1].s * cov >= tau) cites.push(hits[1]); }
    lap('compose');
    return { q: q, qt: qt, hits: hits.slice(0, 4), top: top, cov: cov, conf: conf, answered: ok, cites: cites, spans: spans, ms: performance.now() - t0 };
  }


  var SET = [
    ['Where does Anvith work right now?', 'p1'], ['What did he build for metrics at Enclavia?', 'p2'], ['How accurate was the activity recognition model?', 'p7'],
    ['Which model did he fine-tune with QLoRA?', 'p12'], ['What does AgentWatch flag?', 'p11'], ['What does the browser agent use for planning?', 'p14'],
    ['Why did the browser agent fail?', 'p15'], ['Where did he do his master\'s degree?', 'p17'], ['What did he do with TensorFlow Lite?', 'p9'],
    ['Which vector database does he use?', 'p18'], ['How does he score guardrail relevance?', 'p3'], ['Which agents were demoed to the Air Force?', 'p5'],
    [null, 'What is his salary expectation?'], [null, 'Does he know Rust?'], [null, 'What is his favorite food?'], [null, 'Has he published a research paper?'],
    [null, 'What is his GPA?'], [null, 'Which cloud provider does he deploy on?'], [null, 'Is he open to relocating to London?'], [null, 'Does he have a PhD?']
  ].map(function (r) { return r[0] ? { q: r[0], want: r[1] } : { q: r[1], want: null }; });

  function runEval(tau) {
    var ans = 0, hit = 0, neg = 0, ref = 0, rows = SET.map(function (c) {
      var r = ask(c.q, tau), pass;
      if (c.want) { ans++; pass = r.answered && r.cites.some(function (h) { return h.d.id === c.want; }); if (pass) hit++; }
      else { neg++; pass = !r.answered; if (pass) ref++; }
      return { c: c, r: r, pass: pass };
    });
    return { rows: rows, hit: hit, ans: ans, ref: ref, neg: neg, total: (hit + ref) / SET.length };
  }
  var api = { DOCS: DOCS, SET: SET, ask: ask, runEval: runEval, TAU: 2.0 };
  if (typeof module !== 'undefined') module.exports = api; else root.Lab = api;
})(this);
