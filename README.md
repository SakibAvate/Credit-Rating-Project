# Credit Risk Platform — Track A + Track B

A unified credit-risk prototype with two independent assessment tracks:

- **Track A — Bureau / conventional history:** your existing pipeline is preserved.
- **Track B — Thin-File / No-Bureau:** XGBoost trained on the included synthetic, consented-financial-behaviour prototype data.

Both tracks expose the same result contract: default probability, 300–850 creditworthiness score, rating, decision, track identifier, and SHAP-based top reasons.

> **Prototype limitation:** Track B uses synthetic data and is not a validated production credit-risk model. Production use requires real consented data, observed repayment outcomes, calibration, monitoring, and fairness/validation work.

## Structure

```text
credit_risk_track_a/
├── config.py                    # Track A configuration — unchanged
├── main.py                      # unified CLI
├── requirements.txt
├── Dockerfile
├── data/
│   ├── track_a_final.csv        # provide your existing Track A data here
│   └── track_b_synthetic.csv    # included synthetic Track B data
├── models/
│   ├── *.joblib                 # Track A artifacts, created by Track A training
│   └── track_b/                 # isolated Track B artifacts
├── outputs/
│   └── track_b/                 # Track B reports
├── src/
│   ├── ...                      # existing Track A code
│   └── track_b/                 # Track B-only pipeline
├── serve/
│   ├── app.py                   # one FastAPI service for both tracks
│   └── schemas.py
├── frontend/
│   ├── index.html               # existing Track A UI
│   ├── track-b.html             # Track B UI
│   ├── dashboard.html           # unified entry page
│   └── js/
└── tests/
```

## Important integration safety

Track B does **not** overwrite Track A model files. Track B uses:

```text
models/track_b/
```

and its own configuration under:

```text
src/track_b/config.py
```

Your existing Track A commands remain available:

```bash
python main.py train
python main.py score --input new_applicants.csv --output scored.csv
```

New Track B commands are:

```bash
python main.py train-track-b
python main.py score-track-b --input track_b_input.csv --output track_b_scored.csv
```

To train both sequentially:

```bash
python main.py train-all
```

`train-all` first runs your original Track A pipeline and only then runs Track B. It requires your existing `data/track_a_final.csv`.

## Track B data

The included `data/track_b_synthetic.csv` contains 30,000 synthetic applicants and these fields:

```text
applicant_id
monthly_income
income_stability
avg_monthly_balance
min_monthly_balance
monthly_expense
emi_amount
emi_to_income_ratio
bounce_rate_6m
savings_rate
savings_trend
transaction_volatility
cash_flow_surplus
salary_credit_frequency
default
```

`default` is the supervised training target and must not be entered by the frontend applicant form.

## Train Track B

From the project root:

```bash
pip install -r requirements.txt
python main.py train-track-b
```

The training pipeline performs:

1. Required-column validation
2. Stratified train/test split
3. Median imputation fitted on training data only
4. XGBoost hyperparameter search
5. Final model fit
6. ROC-AUC / PR-AUC evaluation
7. PD → common creditworthiness score → rating → decision
8. SHAP global and per-applicant explanations
9. Saved model/preprocessor/report artifacts

A pre-trained Track B model is included in this integration ZIP so Track B can be tested without retraining. Re-running `train-track-b` replaces only the files inside `models/track_b/`.

## One API for both tracks

Start the service:

```bash
uvicorn serve.app:app --reload --port 8000
```

Open:

```text
http://localhost:8000/dashboard.html
```

### API endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/health` | GET | Reports Track A and Track B model readiness |
| `/api/model/info` | GET | Track A input metadata |
| `/api/predict` | POST | Existing Track A single-applicant endpoint |
| `/api/predict/track-a` | POST | Unified Track A endpoint |
| `/api/track-b/model/info` | GET | Track B input metadata |
| `/api/track-b/health` | GET | Track B readiness |
| `/api/track-b/predict` | POST | Track B single-applicant endpoint |
| `/api/predict/track-b` | POST | Unified Track B endpoint |
| `/api/predict/batch` | POST | Existing Track A batch endpoint |
| `/api/track-b/predict/batch` | POST | Track B batch endpoint |

### Track B request

```json
{
  "monthly_income": 45000,
  "income_stability": 0.90,
  "avg_monthly_balance": 75000,
  "min_monthly_balance": 25000,
  "monthly_expense": 27000,
  "emi_amount": 6000,
  "emi_to_income_ratio": 0.13,
  "bounce_rate_6m": 0.02,
  "savings_rate": 0.40,
  "savings_trend": 0.10,
  "transaction_volatility": 0.18,
  "cash_flow_surplus": 12000,
  "salary_credit_frequency": 1.0
}
```

### Common response

```json
{
  "pred_default_prob": 0.08,
  "creditworthiness_score": 780,
  "rating": "AAA",
  "decision": "APPROVE",
  "scored_by": "TRACK_B",
  "top_reasons": "..."
}
```

The frontend calls the same backend service that hosts the pages, so no separate frontend server or CORS configuration is required for the normal deployment.

## Docker

Track B artifacts are included in this integration package. Track A artifacts are still generated from your existing Track A data.

```bash
docker build -t credit-risk-platform .
docker run -p 8000:8000 credit-risk-platform
```

Then open `http://localhost:8000/dashboard.html`.

## Validation performed on this integration

The included Track B model was trained and the integrated API was exercised for:

- health endpoint
- Track B model metadata
- unified Track B prediction endpoint
- backward-compatible Track B prediction endpoint
- Track B batch scoring endpoint
- frontend dashboard serving
- Python compilation
- automated tests

The original Track A implementation is retained as the base project. Because the original ZIP does not contain `data/track_a_final.csv` or trained Track A artifacts, Track A training still requires you to place your existing Track A data in `data/track_a_final.csv` and run `python main.py train`.
