# Lab evaluation

`questions.json` holds 510 questions written from the résumé. `want` is the list of passage ids that count as a
correct citation (`null` means the Lab should refuse). Splits: `train` (294) and `dev` (86), used for tuning
by 5-fold cross-validation; `test` (60), never used for any choice; `holdout` (70), fresh questions written
after the first model was frozen and also never used to choose a setting.

Reproduce: `node lab-eval/train.js --samples 2500 --seed 11` (add `--write` to regenerate `lab-model.js`,
`lab-data.js` and `report.json`). Add `--showtest` or `--showhold` to list misses on those sets, `--cvmiss` for the
cross-validation misses.

The Lab has no neural model. "Training" here means choosing BM25 settings, learned query filler words, per-passage
aliases, a few refusal rules and the confidence threshold, on the tuning questions only.
