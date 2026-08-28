# Track A — Credit Risk Pipeline

Default-risk model on credit-history + applicant data (the "Bureau history"
branch in your diagram). Predicts probability of default (PD), converts it
to a FICO-style creditworthiness score, assigns a rating band, explains the
decision with SHAP, and applies an approve/refer/reject policy.

This is your original two scripts (`encode_and_prepare.py` +
`xgb_credit_risk_pipeline.py`) reorganized into a package that's easier to
test, reuse for inference on new applicants, and deploy as an API.

## File structure

```
credit_risk_track_a/
├── config.py                  # all tunables in one place (paths, columns,
│                               #   hyperparameter grid, scorecard params,
│                               #   rating bands, decision policy)
├── main.py                    # CLI: `python main.py train` / `score`
├── requirements.txt
├── Dockerfile
├── .gitignore
├── data/
│   └── track_a_final.csv      # <- put your raw data here (gitignored)
├── models/                    # saved preprocessor + model (created by `train`)
├── outputs/                   # scored CSVs + SHAP report (created by `train`)
├── src/
│   ├── data_loader.py         # load raw CSV, single leakage-safe split
│   ├── preprocessing.py       # ordinal/one-hot encoding (fit on train only)
│   ├── train.py               # hyperparameter search, fit, calibration, eval
│   ├── scoring.py             # PD -> score -> rating -> decision
│   ├── explain.py             # SHAP global + per-applicant reasons
│   └── pipeline.py            # orchestrates the steps above
├── serve/
│   └── app.py                 # FastAPI service for real-time scoring
└── tests/
    └── test_scoring.py        # fast unit tests for the scorecard logic
```

## What changed vs. the original two scripts (and why)

- **Single train/test split.** The original split `SK_ID_CURR` and the
  feature matrix separately (two `train_test_split` calls relying on
  identical `random_state`/row order to stay aligned). Now the raw
  dataframe is split once, with the ID and target still attached, so they
  can't drift out of sync.
- **`scale_pos_weight` is persisted.** It's needed again at inference time
  to undo the calibration distortion it introduces (see
  `train.calibrate_probabilities`). The original script only used it
  in-memory during the one training run; now it's saved to
  `models/scale_pos_weight.joblib` alongside the model.
- **Everything is a function**, not top-level script code, so it can be
  unit-tested, imported, and reused for scoring new applicants without
  retraining.
- **One config file** instead of constants scattered across two scripts.

Everything else — the hyperparameter grid, scorecard formula (base score
600 / base odds 50:1 / PDO 40), rating cutoffs, SHAP logic, and the
APPROVE/REFER/REJECT policy — is unchanged from your original code. See
the docstring at the top of `src/pipeline.py` / `config.py` for the
assumptions that were already documented (TARGET definition, why these
scorecard defaults, etc.) — none of that is business-policy-derived, so
revisit it against your actual risk appetite before using this for real
decisions.

## Running it

```bash
pip install -r requirements.txt

# 1. Put your raw data at data/track_a_final.csv, then train end-to-end:
python main.py train
#   -> models/preprocessor.joblib, models/xgb_default_risk_model.joblib,
#      models/scale_pos_weight.joblib
#   -> outputs/shap_global_feature_importance.csv
#   -> outputs/credit_decisions_with_shap.csv     (sample, with SHAP reasons)
#   -> outputs/credit_decisions_full_test_set.csv (whole test set)

# 2. Score a new batch of applicants (same raw columns, no TARGET needed):
python main.py score --input new_applicants.csv --output scored.csv

# 3. Run the test suite:
pytest
```

## Deploying as an API

`serve/app.py` is a FastAPI service that loads the trained model +
preprocessor once at startup and scores one applicant per request.

```bash
# locally
uvicorn serve.app:app --reload --port 8000

# or via Docker (make sure models/ + the preprocessor are already trained
# and present in the build context, or mount them as a volume)
docker build -t track-a-credit-risk .
docker run -p 8000:8000 -v $(pwd)/models:/app/models track-a-credit-risk
```

Example request:

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"NAME_EDUCATION_TYPE": "Higher education", "NAME_INCOME_TYPE": "Working", "NAME_FAMILY_STATUS": "Married", "...": "...rest of the raw applicant fields..."}'
```

Response:

```json
{
  "pred_default_prob": 0.031,
  "creditworthiness_score": 712.4,
  "rating": "AA",
  "decision": "APPROVE"
}
```

## Where this fits in the bigger picture

Per your architecture diagram: this whole package is **Track A**
(bureau-history applicants -> XGBoost A). Track B (thin/no-bureau
applicants, transaction/cash-flow data) would be a parallel package with
its own model, following the same shape — `data_loader` / `preprocessing`
/ `train` / `scoring` / `explain` / `pipeline` — so the two tracks can
share the `scoring.py` (creditworthiness score + rating + decision logic)
and just plug in different feature pipelines and models upstream.
