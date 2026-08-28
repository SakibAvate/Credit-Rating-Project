"""
FastAPI backend for Track A credit-risk scoring.

Serves:
  - a small JSON API under /api/*
  - the static frontend (frontend/) at "/"

Run locally (from the project root, after `python main.py train`):
    uvicorn serve.app:app --reload --port 8000
Then open http://localhost:8000 in a browser.
"""

import io
import os

import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

import config
from src import preprocessing, train, scoring, explain
from serve.schemas import ApplicantRequest, ScoreResponse, ModelInfoResponse, FieldInfo

app = FastAPI(title="Track A Credit Risk API")

# Allow the frontend to call the API even if served from a different origin
# (e.g. a static host) during development. Same-origin deployments (the
# default here, frontend served by this same app) don't need this, but it's
# harmless to leave on.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_preprocessor = None
_model = None
_scale_pos_weight = None
_explainer = None
_feature_columns = None
_field_options = None


def _artifacts_ready() -> bool:
    return all(x is not None for x in (_preprocessor, _model, _scale_pos_weight))


@app.on_event("startup")
def load_artifacts():
    """
    Load whatever's already been trained. If `python main.py train` hasn't
    been run yet, the API still starts (so /health works) but /predict and
    /model/info will return a clear 503 instead of crashing.
    """
    global _preprocessor, _model, _scale_pos_weight, _explainer, _feature_columns, _field_options
    try:
        _preprocessor = preprocessing.load_preprocessor()
        _model = train.load_model()
        _scale_pos_weight = train.load_scale_pos_weight()
        _feature_columns = preprocessing.load_feature_columns()
        _field_options = preprocessing.get_field_options(_preprocessor)
        _explainer = explain.build_explainer(_model)
        print("Model artifacts loaded successfully.")
    except FileNotFoundError:
        print("No trained artifacts found yet -- run `python main.py train` first.")


def _require_artifacts():
    if not _artifacts_ready():
        raise HTTPException(
            status_code=503,
            detail="Model not trained yet. Run `python main.py train` then restart the API.",
        )


def _score_dataframe(X_raw: pd.DataFrame, with_reasons: bool):
    X_enc = preprocessing.transform_new(_preprocessor, X_raw)
    pred_proba_raw = _model.predict_proba(X_enc)[:, 1]
    pred_proba = train.calibrate_probabilities(pred_proba_raw, _scale_pos_weight)
    scores, ratings, decisions = scoring.score_batch(pred_proba)

    reasons = None
    if with_reasons:
        shap_values = _explainer.shap_values(X_enc)
        reasons = explain.top_reasons_batch(shap_values, X_enc)

    return pred_proba, scores, ratings, decisions, reasons


@app.get("/api/health")
def health():
    return {"status": "ok", "model_loaded": _artifacts_ready()}


@app.get("/api/model/info", response_model=ModelInfoResponse)
def model_info():
    _require_artifacts()
    fields = []
    for col in _feature_columns:
        if col in config.ORDINAL_COLS:
            fields.append(FieldInfo(name=col, type="ordinal", options=_field_options[col]))
        elif col in config.ONEHOT_COLS:
            fields.append(FieldInfo(name=col, type="onehot", options=_field_options[col]))
        else:
            fields.append(FieldInfo(name=col, type="numeric"))

    rating_bands = [{"min_score": cutoff, "rating": rating} for cutoff, rating in config.RATING_BANDS]
    return ModelInfoResponse(
        fields=fields,
        rating_bands=rating_bands,
        decision_policy=config.RATING_TO_DECISION,
    )


@app.post("/api/predict", response_model=ScoreResponse)
def predict(applicant: ApplicantRequest):
    _require_artifacts()
    X_new = pd.DataFrame([applicant.model_dump()])
    pred_proba, scores, ratings, decisions, reasons = _score_dataframe(X_new, with_reasons=True)

    return ScoreResponse(
        pred_default_prob=float(pred_proba[0]),
        creditworthiness_score=float(scores[0]),
        rating=str(ratings[0]),
        decision=str(decisions[0]),
        top_reasons=reasons[0] if reasons else None,
    )


@app.post("/api/predict/batch")
async def predict_batch(file: UploadFile = File(...)):
    """
    Upload a CSV of applicants (same raw columns as training, SK_ID_CURR
    optional, TARGET not needed) and get back a scored CSV to download.
    SHAP reasons are skipped here for speed -- use /api/predict for a
    single applicant if you need the explanation.
    """
    _require_artifacts()
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file")

    raw_bytes = await file.read()
    X_new = pd.read_csv(io.BytesIO(raw_bytes))

    id_col = X_new[config.ID_COL] if config.ID_COL in X_new.columns else None
    drop_cols = [c for c in [config.ID_COL, config.TARGET_COL] if c in X_new.columns]
    X_features = X_new.drop(columns=drop_cols)

    pred_proba, scores, ratings, decisions, _ = _score_dataframe(X_features, with_reasons=False)

    result = pd.DataFrame({
        "pred_default_prob": pred_proba,
        "creditworthiness_score": scores,
        "rating": ratings,
        "decision": decisions,
    })
    if id_col is not None:
        result.insert(0, config.ID_COL, id_col.to_numpy())

    buffer = io.StringIO()
    result.to_csv(buffer, index=False)
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=scored_applicants.csv"},
    )


# Serve the static frontend last, so it doesn't shadow the /api/* routes above.
_frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
if os.path.isdir(_frontend_dir):
    app.mount("/", StaticFiles(directory=_frontend_dir, html=True), name="frontend")
