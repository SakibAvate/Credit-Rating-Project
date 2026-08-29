"""Unified FastAPI backend for Track A + Track B credit-risk scoring.

Track A:
    - Existing bureau-based model
    - Existing endpoints preserved

Track B:
    - Thin-file / no-bureau model
    - Uses alternative financial-behaviour features
    - Isolated model artifacts under models/track_b

Both tracks use the same API server and return the same response format.
"""

import io
import os

import numpy as np
import pandas as pd

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

import config

# ------------------------------------------------------------
# TRACK A
# ------------------------------------------------------------

from src import (
    preprocessing,
    train,
    scoring,
    explain,
)

# ------------------------------------------------------------
# TRACK B
# ------------------------------------------------------------

from src.track_b import (
    config as tb_config,
    preprocessing as tb_preprocessing,
    train as tb_train,
    scoring as tb_scoring,
    explain as tb_explain,
)

# ------------------------------------------------------------
# SCHEMAS
# ------------------------------------------------------------

from serve.schemas import (
    ApplicantRequest,
    TrackBApplicantRequest,
    ScoreResponse,
    ModelInfoResponse,
    FieldInfo,
)


# ============================================================
# APPLICATION
# ============================================================

app = FastAPI(
    title="Credit Risk API — Track A + Track B",
    description=(
        "Unified credit-risk scoring API supporting "
        "bureau-based and thin-file/no-bureau applicants."
    ),
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# MODEL ARTIFACTS
# ============================================================

# -------------------------
# Track A
# -------------------------

_preprocessor = None
_model = None
_scale_pos_weight = None
_explainer = None
_feature_columns = None
_field_options = None


# -------------------------
# Track B
# -------------------------

_tb_preprocessor = None
_tb_model = None
_tb_scale_pos_weight = None
_tb_explainer = None


# ============================================================
# READINESS HELPERS
# ============================================================

def _artifacts_ready():
    """Return True when all Track A artifacts are loaded."""

    return all(
        x is not None
        for x in (
            _preprocessor,
            _model,
            _scale_pos_weight,
        )
    )


def _track_b_ready():
    """Return True when all Track B artifacts are loaded."""

    return all(
        x is not None
        for x in (
            _tb_preprocessor,
            _tb_model,
            _tb_scale_pos_weight,
        )
    )


# ============================================================
# STARTUP — LOAD BOTH MODELS
# ============================================================

@app.on_event("startup")
def load_artifacts():

    global \
        _preprocessor, \
        _model, \
        _scale_pos_weight, \
        _explainer, \
        _feature_columns, \
        _field_options

    global \
        _tb_preprocessor, \
        _tb_model, \
        _tb_scale_pos_weight, \
        _tb_explainer

    print()
    print("=" * 65)
    print("CREDIT RISK API — MODEL INITIALIZATION")
    print("=" * 65)

    # ========================================================
    # TRACK A
    # ========================================================

    try:

        _preprocessor = (
            preprocessing.load_preprocessor()
        )

        _model = (
            train.load_model()
        )

        _scale_pos_weight = (
            train.load_scale_pos_weight()
        )

        _feature_columns = (
            preprocessing.load_feature_columns()
        )

        _field_options = (
            preprocessing.get_field_options(
                _preprocessor
            )
        )

        _explainer = (
            explain.build_explainer(
                _model
            )
        )

        print("✓ Track A model artifacts loaded")

    except (
        FileNotFoundError,
        OSError,
        ValueError,
    ) as exc:

        print(
            "⚠ Track A artifacts not available"
        )

        print(
            "  Run: python main.py train"
        )

        print(
            f"  Details: {exc}"
        )

    # ========================================================
    # TRACK B
    # ========================================================

    try:

        _tb_preprocessor = (
            tb_preprocessing.load_preprocessor()
        )

        _tb_model = (
            tb_train.load_model()
        )

        _tb_scale_pos_weight = (
            tb_train.load_scale_pos_weight()
        )

        _tb_explainer = (
            tb_explain.build_explainer(
                _tb_model
            )
        )

        print("✓ Track B model artifacts loaded")

    except (
        FileNotFoundError,
        OSError,
        ValueError,
    ) as exc:

        print(
            "⚠ Track B artifacts not available"
        )

        print(
            "  Run: python main.py train-track-b"
        )

        print(
            f"  Details: {exc}"
        )

    print("=" * 65)

    print(
        f"Track A ready: {_artifacts_ready()}"
    )

    print(
        f"Track B ready: {_track_b_ready()}"
    )

    print("=" * 65)
    print()


# ============================================================
# REQUIRE MODEL HELPERS
# ============================================================

def _require_artifacts():

    if not _artifacts_ready():

        raise HTTPException(
            status_code=503,
            detail=(
                "Track A model is not trained or loaded. "
                "Run `python main.py train` and restart the API."
            ),
        )


def _require_track_b():

    if not _track_b_ready():

        raise HTTPException(
            status_code=503,
            detail=(
                "Track B model is not trained or loaded. "
                "Run `python main.py train-track-b` "
                "and restart the API."
            ),
        )


# ============================================================
# SHAP COMPATIBILITY
# ============================================================

def _shap_array(values):
    """
    Convert SHAP output into a NumPy array.

    Supports:
        - numpy arrays
        - SHAP Explanation objects
        - list-based SHAP outputs
    """

    if values is None:
        return None

    # SHAP Explanation
    if hasattr(values, "values"):
        values = values.values

    # Older SHAP binary classification output
    if isinstance(values, list):

        if len(values) == 0:
            return None

        values = values[-1]

    return np.asarray(values)


# ============================================================
# TRACK A INTERNAL SCORING
# ============================================================

def _score_track_a(
    X_raw,
    with_reasons=True,
):

    X_raw = X_raw.reindex(
        columns=_feature_columns
    )

    X_enc = preprocessing.transform_new(
        _preprocessor,
        X_raw,
    )

    raw_probability = (
        _model.predict_proba(
            X_enc
        )[:, 1]
    )

    probability = (
        train.calibrate_probabilities(
            raw_probability,
            _scale_pos_weight,
        )
    )

    scores, ratings, decisions = (
        scoring.score_batch(
            probability
        )
    )

    reasons = None

    if (
        with_reasons
        and _explainer is not None
    ):

        shap_values = (
            _explainer.shap_values(
                X_enc
            )
        )

        shap_values = _shap_array(
            shap_values
        )

        if shap_values is not None:

            reasons = (
                explain.top_reasons_batch(
                    shap_values,
                    X_enc,
                )
            )

    return (
        probability,
        scores,
        ratings,
        decisions,
        reasons,
    )


# ============================================================
# TRACK B INTERNAL SCORING
# ============================================================

def _score_track_b(
    X_raw,
    with_reasons=True,
):

    X_raw = X_raw.reindex(
        columns=tb_config.FEATURE_COLUMNS
    )

    X_enc = (
        tb_preprocessing.transform_new(
            _tb_preprocessor,
            X_raw,
        )
    )

    raw_probability = (
        _tb_model.predict_proba(
            X_enc
        )[:, 1]
    )

    probability = (
        tb_train.calibrate_probabilities(
            raw_probability,
            _tb_scale_pos_weight,
        )
    )

    scores, ratings, decisions = (
        tb_scoring.score_batch(
            probability
        )
    )

    reasons = None

    if (
        with_reasons
        and _tb_explainer is not None
    ):

        shap_values = (
            _tb_explainer.shap_values(
                X_enc
            )
        )

        shap_values = _shap_array(
            shap_values
        )

        if shap_values is not None:

            reasons = (
                tb_explain.top_reasons_batch(
                    shap_values,
                    X_enc,
                )
            )

    return (
        probability,
        scores,
        ratings,
        decisions,
        reasons,
    )


# ============================================================
# HEALTH
# ============================================================

@app.get("/api/health")
def health():

    track_a_loaded = _artifacts_ready()
    track_b_loaded = _track_b_ready()

    return {
        "status": "ok",
        "service": "credit-risk-api",
        "version": "1.1.0",

        "track_a_loaded": track_a_loaded,
        "track_b_loaded": track_b_loaded,

        # Backward compatibility
        "model_loaded": (
            track_a_loaded
            or track_b_loaded
        ),

        "available_tracks": [
            track
            for track, loaded in [
                ("TRACK_A", track_a_loaded),
                ("TRACK_B", track_b_loaded),
            ]
            if loaded
        ],
    }


# ============================================================
# TRACK A MODEL INFO
# ============================================================

@app.get(
    "/api/model/info",
    response_model=ModelInfoResponse,
)
def model_info():

    _require_artifacts()

    fields = []

    for col in _feature_columns:

        if col in config.ORDINAL_COLS:

            fields.append(
                FieldInfo(
                    name=col,
                    type="ordinal",
                    options=_field_options.get(
                        col,
                        [],
                    ),
                )
            )

        elif col in config.ONEHOT_COLS:

            fields.append(
                FieldInfo(
                    name=col,
                    type="onehot",
                    options=_field_options.get(
                        col,
                        [],
                    ),
                )
            )

        else:

            fields.append(
                FieldInfo(
                    name=col,
                    type="numeric",
                )
            )

    return ModelInfoResponse(
        fields=fields,
        rating_bands=[
            {
                "min_score": minimum,
                "rating": rating,
            }
            for minimum, rating
            in config.RATING_BANDS
        ],
        decision_policy=(
            config.RATING_TO_DECISION
        ),
    )


# ============================================================
# TRACK B MODEL INFO
# ============================================================

@app.get("/api/track-b/model/info")
def track_b_model_info():

    _require_track_b()

    return {

        "track": "TRACK_B",

        "name": (
            "Thin-File / No-Bureau "
            "Alternative Financial Behaviour Model"
        ),

        "model": "XGBoost",

        "target": "default",

        "fields": [
            {
                "name": column,
                "type": "numeric",
            }
            for column
            in tb_config.FEATURE_COLUMNS
        ],

        "rating_bands": [
            {
                "min_score": minimum,
                "rating": rating,
            }
            for minimum, rating
            in config.RATING_BANDS
        ],

        "decision_policy": (
            config.RATING_TO_DECISION
        ),

        "scored_by": "TRACK_B",
    }


# ============================================================
# TRACK B HEALTH
# ============================================================

@app.get("/api/track-b/health")
def track_b_health():

    return {

        "status": "ok",

        "model_loaded": (
            _track_b_ready()
        ),

        "track": "TRACK_B",

        "model_type": "XGBoost",

        "message": (
            "Track B model is ready."
            if _track_b_ready()
            else
            "Track B model is not trained."
        ),
    }


# ============================================================
# TRACK A PREDICTION
# ============================================================

@app.post(
    "/api/predict",
    response_model=ScoreResponse,
)
def predict(
    applicant: ApplicantRequest
):

    _require_artifacts()

    X = pd.DataFrame([
        applicant.model_dump()
    ])

    (
        probability,
        scores,
        ratings,
        decisions,
        reasons,
    ) = _score_track_a(X)

    return ScoreResponse(

        pred_default_prob=float(
            probability[0]
        ),

        creditworthiness_score=float(
            scores[0]
        ),

        rating=str(
            ratings[0]
        ),

        decision=str(
            decisions[0]
        ),

        scored_by="TRACK_A",

        top_reasons=(
            reasons[0]
            if reasons
            else None
        ),
    )


# ============================================================
# TRACK B PREDICTION
# ============================================================

@app.post(
    "/api/track-b/predict",
    response_model=ScoreResponse
)
def track_b_predict(
    applicant: TrackBApplicantRequest
):

    _require_track_b()

    # Pydantic has already validated the values.
    raw = applicant.model_dump()

    X = pd.DataFrame([
        {
            column: raw[column]
            for column
            in tb_config.FEATURE_COLUMNS
        }
    ])

    (
        probability,
        scores,
        ratings,
        decisions,
        reasons,
    ) = _score_track_b(X)

    return ScoreResponse(

        pred_default_prob=float(
            probability[0]
        ),

        creditworthiness_score=float(
            scores[0]
        ),

        rating=str(
            ratings[0]
        ),

        decision=str(
            decisions[0]
        ),

        scored_by="TRACK_B",

        top_reasons=(
            reasons[0]
            if reasons
            else None
        ),
    )


# ============================================================
# UNIFIED TRACK PREDICTION
# ============================================================

@app.post(
    "/api/predict/{track}",
    response_model=ScoreResponse,
)
def predict_by_track(
    track: str,
    applicant: ApplicantRequest,
):

    normalized_track = (
        track
        .strip()
        .upper()
        .replace("-", "_")
    )

    if normalized_track == "TRACK_A":

        return predict(applicant)

    if normalized_track == "TRACK_B":

        # For backwards compatibility this endpoint can still
        # accept the generic schema, while the dedicated endpoint
        # above provides strict Track B validation.

        raw = applicant.model_dump()

        missing = [
            column
            for column
            in tb_config.FEATURE_COLUMNS
            if column not in raw
        ]

        if missing:

            raise HTTPException(
                status_code=422,
                detail={
                    "message": (
                        "Missing Track B fields"
                    ),
                    "missing_fields": missing,
                },
            )

        validated = (
            TrackBApplicantRequest(
                **{
                    column: raw[column]
                    for column
                    in tb_config.FEATURE_COLUMNS
                }
            )
        )

        return track_b_predict(
            validated
        )

    raise HTTPException(
        status_code=400,
        detail=(
            "track must be TRACK_A or TRACK_B"
        ),
    )


# ============================================================
# TRACK A BATCH PREDICTION
# ============================================================

@app.post("/api/predict/batch")
async def predict_batch(
    file: UploadFile = File(...)
):

    _require_artifacts()

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="No file supplied.",
        )

    if not file.filename.lower().endswith(
        ".csv"
    ):

        raise HTTPException(
            status_code=400,
            detail="Please upload a .csv file.",
        )

    try:

        contents = await file.read()

        df = pd.read_csv(
            io.BytesIO(contents)
        )

    except Exception as exc:

        raise HTTPException(
            status_code=400,
            detail=(
                f"Could not read CSV: {exc}"
            ),
        )

    missing = [
        column
        for column
        in _feature_columns
        if column not in df.columns
    ]

    if missing:

        raise HTTPException(
            status_code=422,
            detail={
                "message": (
                    "Missing Track A fields"
                ),
                "missing_fields": missing,
            },
        )

    ids = (
        df[config.ID_COL]
        if config.ID_COL in df.columns
        else None
    )

    X = df[
        _feature_columns
    ]

    (
        probability,
        scores,
        ratings,
        decisions,
        _,
    ) = _score_track_a(
        X,
        with_reasons=False,
    )

    result = pd.DataFrame({

        "pred_default_prob":
            probability,

        "creditworthiness_score":
            scores,

        "rating":
            ratings,

        "decision":
            decisions,

        "scored_by":
            "TRACK_A",
    })

    if ids is not None:

        result.insert(
            0,
            config.ID_COL,
            ids.to_numpy(),
        )

    buffer = io.StringIO()

    result.to_csv(
        buffer,
        index=False,
    )

    buffer.seek(0)

    return StreamingResponse(

        iter([
            buffer.getvalue()
        ]),

        media_type="text/csv",

        headers={
            "Content-Disposition":
                "attachment; "
                "filename=track_a_scored.csv"
        },
    )


# ============================================================
# TRACK B BATCH PREDICTION
# ============================================================

@app.post(
    "/api/track-b/predict/batch"
)
async def track_b_predict_batch(
    file: UploadFile = File(...)
):

    _require_track_b()

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="No file supplied.",
        )

    if not file.filename.lower().endswith(
        ".csv"
    ):

        raise HTTPException(
            status_code=400,
            detail="Please upload a .csv file.",
        )

    try:

        contents = await file.read()

        df = pd.read_csv(
            io.BytesIO(contents)
        )

    except Exception as exc:

        raise HTTPException(
            status_code=400,
            detail=(
                f"Could not read CSV: {exc}"
            ),
        )

    missing = [
        column
        for column
        in tb_config.FEATURE_COLUMNS
        if column not in df.columns
    ]

    if missing:

        raise HTTPException(
            status_code=422,
            detail={
                "message": (
                    "Missing Track B fields"
                ),
                "missing_fields": missing,
            },
        )

    ids = (
        df[tb_config.ID_COL]
        if tb_config.ID_COL in df.columns
        else None
    )

    X = df[
        tb_config.FEATURE_COLUMNS
    ]

    (
        probability,
        scores,
        ratings,
        decisions,
        _,
    ) = _score_track_b(
        X,
        with_reasons=False,
    )

    result = pd.DataFrame({

        "pred_default_prob":
            probability,

        "creditworthiness_score":
            scores,

        "rating":
            ratings,

        "decision":
            decisions,

        "scored_by":
            "TRACK_B",
    })

    if ids is not None:

        result.insert(
            0,
            tb_config.ID_COL,
            ids.to_numpy(),
        )

    buffer = io.StringIO()

    result.to_csv(
        buffer,
        index=False,
    )

    buffer.seek(0)

    return StreamingResponse(

        iter([
            buffer.getvalue()
        ]),

        media_type="text/csv",

        headers={
            "Content-Disposition":
                "attachment; "
                "filename=track_b_scored.csv"
        },
    )


# ============================================================
# FRONTEND
# ============================================================

_frontend_dir = os.path.join(
    os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    ),
    "frontend",
)

if os.path.isdir(_frontend_dir):

    app.mount(
        "/",
        StaticFiles(
            directory=_frontend_dir,
            html=True,
        ),
        name="frontend",
    )


@app.post(
    "/api/predict/auto",
    response_model=ScoreResponse,
)
def predict_auto(applicant: ApplicantRequest):

    raw = applicant.model_dump()

    # --------------------------------------------------------
    # Determine whether bureau features are available
    # --------------------------------------------------------

    track_a_available = (
        _artifacts_ready()
        and _feature_columns is not None
        and all(
            column in raw
            for column in _feature_columns
        )
    )

    # --------------------------------------------------------
    # Determine whether Track B features are available
    # --------------------------------------------------------

    track_b_available = (
        _track_b_ready()
        and all(
            column in raw
            for column
            in tb_config.FEATURE_COLUMNS
        )
    )

    # --------------------------------------------------------
    # Prefer Track A when bureau data is available
    # --------------------------------------------------------

    if track_a_available:

        X = pd.DataFrame([
            {
                column: raw[column]
                for column in _feature_columns
            }
        ])

        (
            probability,
            scores,
            ratings,
            decisions,
            reasons,
        ) = _score_track_a(X)

        return ScoreResponse(

            pred_default_prob=float(
                probability[0]
            ),

            creditworthiness_score=float(
                scores[0]
            ),

            rating=str(
                ratings[0]
            ),

            decision=str(
                decisions[0]
            ),

            scored_by="TRACK_A",

            top_reasons=(
                reasons[0]
                if reasons
                else None
            ),
        )

    # --------------------------------------------------------
    # Otherwise use Track B
    # --------------------------------------------------------

    if track_b_available:

        X = pd.DataFrame([
            {
                column: raw[column]
                for column
                in tb_config.FEATURE_COLUMNS
            }
        ])

        (
            probability,
            scores,
            ratings,
            decisions,
            reasons,
        ) = _score_track_b(X)

        return ScoreResponse(

            pred_default_prob=float(
                probability[0]
            ),

            creditworthiness_score=float(
                scores[0]
            ),

            rating=str(
                ratings[0]
            ),

            decision=str(
                decisions[0]
            ),

            scored_by="TRACK_B",

            top_reasons=(
                reasons[0]
                if reasons
                else None
            ),
        )

    # --------------------------------------------------------
    # Neither model can score the applicant
    # --------------------------------------------------------

    raise HTTPException(
        status_code=422,
        detail={
            "message": (
                "Insufficient data for credit scoring."
            ),
            "track_a_available": False,
            "track_b_available": False,
            "required_track_b_fields": (
                tb_config.FEATURE_COLUMNS
            ),
        },
    )
