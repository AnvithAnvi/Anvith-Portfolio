# Lab evaluation

`questions.json` holds 432 questions written from the résumé. `want` is the list of passage ids that count as a correct
citation (`null` means the Lab should refuse). Splits: `train` and `dev` (used for tuning, 5-fold cross-validation),
`test` (never used for any choice), `holdout` (written after the model was frozen, scored once).

Reproduce: `node lab-eval/train.js --samples 2500 --seed 11` (add `--write` to regenerate `lab-model.js`,
`lab-data.js` and `report.json`). Add `--showtest` or `--showhold` to list misses on those sets.

The Lab has no neural model. "Training" here means choosing BM25 settings, learned query filler words and per-passage
aliases, and the refusal threshold, on the tuning questions only.
