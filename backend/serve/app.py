"""
Unified FastAPI backend for Track A + Track B credit-risk scoring.

Track A:
    - Existing bureau-based model
    - Existing endpoints preserved
    - Supports Single Assessment and Bulk Assessment

Track B:
    - Thin-file / no-bureau model
    - Uses alternative financial-behaviour features
    - Isolated model artifacts under models/track_b

Both tracks use the same API server and return the same response format.
"""

from __future__ import annotations

import io
import os
import math
import uuid

import numpy as np
import pandas as pd

from fastapi import (
    FastAPI,
    UploadFile,
    File,
    HTTPException,
)

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

import config

from serve.database import (
    database_status,
    get_assessment,
    get_assessments,
    save_assessment,
    save_assessments,
)


# ------------------------------------------------------------
# TRACK A
# ------------------------------------------------------------

from src import (
    preprocessing,
    train,
    scoring,
    explain,
)

from src.track_a.input_mapper import (
    build_track_a_payload,
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
    version="1.2.0",
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

# ------------------------------------------------------------
# Track A
# ------------------------------------------------------------

_preprocessor = None
_model = None
_scale_pos_weight = None
_explainer = None
_feature_columns = None
_field_options = None


# ------------------------------------------------------------
# Track B
# ------------------------------------------------------------

_tb_preprocessor = None
_tb_model = None
_tb_scale_pos_weight = None
_tb_explainer = None


# ============================================================
# READINESS HELPERS
# ============================================================

def _artifacts_ready():
    """
    Return True when all Track A artifacts are loaded.
    """

    return all(
        x is not None
        for x in (
            _preprocessor,
            _model,
            _scale_pos_weight,
        )
    )


def _track_b_ready():
    """
    Return True when all Track B artifacts are loaded.
    """

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

    if values is None:
        return None

    if hasattr(values, "values"):
        values = values.values

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

    print("\n========== TRACK A DEBUG ==========")

    if len(X_raw) > 0:

        print("RAW MODEL INPUT:")
        print(
            X_raw.iloc[0].to_dict()
        )

    X_raw = X_raw.reindex(
        columns=_feature_columns
    )

    X_enc = preprocessing.transform_new(
        _preprocessor,
        X_raw,
    )

    if len(X_enc) > 0:

        print("\nENCODED MODEL INPUT:")
        print(
            X_enc.iloc[0].to_dict()
        )

    nan_columns = (
        X_enc.columns[
            X_enc.isna().any()
        ].tolist()
    )

    print("\nNaN COLUMNS:")
    print(nan_columns)

    print("===================================\n")

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
        "version": "1.2.0",

        "track_a_loaded":
            track_a_loaded,

        "track_b_loaded":
            track_b_loaded,

        "model_loaded":
            (
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
        "history_database_connected": database_status(),
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

        "model_loaded":
            _track_b_ready(),

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
# TRACK A SINGLE PREDICTION
# ============================================================

@app.post(
    "/api/predict",
    response_model=ScoreResponse,
)
def predict(
    applicant: ApplicantRequest
):

    _require_artifacts()

    form_data = (
        applicant.model_dump()
    )

    # --------------------------------------------------------
    # Accept either:
    #
    # 1. Exact Track A model features
    #
    # OR
    #
    # 2. User-friendly frontend fields
    # --------------------------------------------------------

    if (
        _feature_columns
        and all(
            column in form_data
            for column in _feature_columns
        )
    ):

        model_payload = {
            column: form_data[column]
            for column in _feature_columns
        }

    else:

        model_payload = (
            build_track_a_payload(
                form_data
            )
        )

    X = pd.DataFrame([
        model_payload
    ])

    (
        probability,
        scores,
        ratings,
        decisions,
        reasons,
    ) = _score_track_a(X)

    save_assessment(
        track="TRACK_A",
        applicant_id=(
            form_data.get("applicantId")
            or form_data.get("applicant_id")
            or form_data.get(config.ID_COL)
        ),
        probability=probability[0],
        score=scores[0],
        rating=ratings[0],
        decision=decisions[0],
        scored_by="TRACK_A",
        top_reasons=(reasons[0] if reasons else None),
        source="single",
    )

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
# TRACK B SINGLE PREDICTION
# ============================================================

@app.post(
    "/api/track-b/predict",
    response_model=ScoreResponse,
)
def track_b_predict(
    applicant: TrackBApplicantRequest
):

    _require_track_b()

    raw = (
        applicant.model_dump()
    )

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

    save_assessment(
        track="TRACK_B",
        applicant_id=(
            raw.get("applicant_id")
            or raw.get("applicantId")
        ),
        probability=probability[0],
        score=scores[0],
        rating=ratings[0],
        decision=decisions[0],
        scored_by="TRACK_B",
        top_reasons=(reasons[0] if reasons else None),
        source="single",
    )

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
# TRACK A BATCH PREDICTION
# ============================================================

@app.post("/api/predict/batch")
async def predict_batch(
    file: UploadFile = File(...)
):

    _require_artifacts()

    # --------------------------------------------------------
    # Validate file
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # Read CSV
    # --------------------------------------------------------

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

    if df.empty:

        raise HTTPException(
            status_code=400,
            detail="The uploaded CSV is empty.",
        )

    print()
    print("=" * 65)
    print("TRACK A BULK ASSESSMENT")
    print("=" * 65)

    print(
        f"Rows received: {len(df)}"
    )

    print(
        f"Columns received: {len(df.columns)}"
    )

    print(
        "CSV columns:"
    )

    print(
        list(df.columns)
    )

    # --------------------------------------------------------
    # Applicant IDs
    # --------------------------------------------------------

    ids = None

    if config.ID_COL in df.columns:

        ids = df[
            config.ID_COL
        ].copy()

    # --------------------------------------------------------
    # IMPORTANT:
    #
    # First determine whether this CSV is already in the
    # exact trained-model format.
    #
    # If yes:
    #     score it directly.
    #
    # Otherwise:
    #     treat it as user-friendly/raw Track A data and
    #     convert EVERY ROW using the same mapper used by
    #     Single Assessment.
    # --------------------------------------------------------

    is_model_format = (
        _feature_columns
        and all(
            column in df.columns
            for column in _feature_columns
        )
    )

    # ========================================================
    # CASE 1 — CSV ALREADY CONTAINS MODEL FEATURES
    # ========================================================

    if is_model_format:

        print(
            "Bulk input detected as MODEL-FORMAT CSV."
        )

        X = df[
            _feature_columns
        ].copy()

    # ========================================================
    # CASE 2 — CSV CONTAINS RAW / USER-FRIENDLY DATA
    # ========================================================

    else:

        print(
            "Bulk input detected as RAW/USER-FRIENDLY CSV."
        )

        print(
            "Running Track A input mapper on every row..."
        )

        mapped_rows = []

        mapper_errors = []

        for index, row in df.iterrows():

            try:

                # Convert pandas NaN values to None
                # so the mapper can safely process them.
                row_data = {}

                for key, value in row.to_dict().items():

                    if pd.isna(value):

                        row_data[key] = None

                    else:

                        row_data[key] = value

                mapped = (
                    build_track_a_payload(
                        row_data
                    )
                )

                mapped_rows.append(
                    mapped
                )

            except Exception as exc:

                mapper_errors.append(
                    {
                        "row": int(index) + 2,
                        "error": str(exc),
                    }
                )

                # Keep processing so we can report
                # all problematic rows instead of
                # stopping at the first one.
                mapped_rows.append(
                    None
                )

        # ----------------------------------------------------
        # Report mapper errors
        # ----------------------------------------------------

        if mapper_errors:

            preview = (
                mapper_errors[:10]
            )

            raise HTTPException(
                status_code=422,
                detail={
                    "message": (
                        "Track A bulk input could not "
                        "be converted."
                    ),
                    "mapper_errors": preview,
                    "total_errors": len(
                        mapper_errors
                    ),
                },
            )

        X = pd.DataFrame(
            mapped_rows
        )

        # Make absolutely sure the model receives
        # the exact expected feature order.
        X = X.reindex(
            columns=_feature_columns
        )

    # --------------------------------------------------------
    # Final safety check
    # --------------------------------------------------------

    missing_after_mapping = [
        column
        for column
        in _feature_columns
        if column not in X.columns
    ]

    if missing_after_mapping:

        raise HTTPException(
            status_code=422,
            detail={
                "message": (
                    "Track A model features could "
                    "not be constructed."
                ),
                "missing_features":
                    missing_after_mapping,
            },
        )

    # --------------------------------------------------------
    # Score complete batch
    # --------------------------------------------------------

    try:

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

    except Exception as exc:

        print(
            "\nTRACK A BULK MODEL ERROR:"
        )

        print(
            repr(exc)
        )

        raise HTTPException(
            status_code=500,
            detail={
                "message": (
                    "Track A bulk prediction failed."
                ),
                "error": str(exc),
            },
        )

    # --------------------------------------------------------
    # Build results
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # Preserve applicant ID when available
    # --------------------------------------------------------

    if ids is not None:

        result.insert(
            0,
            config.ID_COL,
            ids.to_numpy(),
        )

    batch_id = str(uuid.uuid4())

    save_assessments(
        track="TRACK_A",
        applicant_ids=(ids.to_numpy() if ids is not None else None),
        probabilities=probability,
        scores=scores,
        ratings=ratings,
        decisions=decisions,
        scored_by="TRACK_A",
        source="bulk",
        batch_id=batch_id,
    )

    # --------------------------------------------------------
    # Return CSV
    # --------------------------------------------------------

    buffer = io.StringIO()

    result.to_csv(
        buffer,
        index=False,
    )

    buffer.seek(0)

    print(
        f"Successfully scored {len(result)} applicants."
    )

    print("=" * 65)
    print()

    return StreamingResponse(

        iter([
            buffer.getvalue()
        ]),

        media_type="text/csv",

        headers={
            "Content-Disposition":
                "attachment; "
                "filename=track_a_scored.csv",
            "X-Processed-Count": str(len(result)),
            "X-Batch-ID": batch_id,
        },
    )


# ============================================================
# UNIFIED TRACK PREDICTION
# ============================================================
# NOTE: This route is intentionally registered AFTER the static
# /api/predict/batch route above. Otherwise the dynamic {track}
# route can capture "batch" and FastAPI returns 422 for multipart uploads.

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

        return predict(
            applicant
        )

    if normalized_track == "TRACK_B":

        raw = (
            applicant.model_dump()
        )

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
                    "message":
                        "Missing Track B fields",

                    "missing_fields":
                        missing,
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

    if df.empty:

        raise HTTPException(
            status_code=400,
            detail="The uploaded CSV is empty.",
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
                "message":
                    "Missing Track B fields",

                "missing_fields":
                    missing,
            },
        )

    ids = None

    if tb_config.ID_COL in df.columns:

        ids = df[
            tb_config.ID_COL
        ]

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

    batch_id = str(uuid.uuid4())

    save_assessments(
        track="TRACK_B",
        applicant_ids=(ids.to_numpy() if ids is not None else None),
        probabilities=probability,
        scores=scores,
        ratings=ratings,
        decisions=decisions,
        scored_by="TRACK_B",
        source="bulk",
        batch_id=batch_id,
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
                "filename=track_b_scored.csv",
            "X-Processed-Count": str(len(result)),
            "X-Batch-ID": batch_id,
        },
    )


# ============================================================
# ASSESSMENT HISTORY
# ============================================================

@app.get("/api/history")
def assessment_history(
    track: str | None = None,
    decision: str | None = None,
    search: str | None = None,
    skip: int = 0,
    limit: int = 50,
):
    """Return paginated completed assessment history."""

    normalized_track = None
    if track:
        normalized_track = track.strip().upper().replace("-", "_")
        if normalized_track not in {"TRACK_A", "TRACK_B"}:
            raise HTTPException(status_code=400, detail="track must be TRACK_A or TRACK_B")

    normalized_decision = None
    if decision:
        normalized_decision = decision.strip().upper()
        if normalized_decision not in {"APPROVE", "REFER", "REJECT"}:
            raise HTTPException(status_code=400, detail="decision must be APPROVE, REFER, or REJECT")

    try:
        items, total = get_assessments(
            track=normalized_track,
            decision=normalized_decision,
            search=search,
            skip=max(skip, 0),
            limit=max(min(limit, 100), 1),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail={"message": "Assessment history database is unavailable.", "error": str(exc)},
        )

    return {
        "items": items,
        "total": total,
        "skip": max(skip, 0),
        "limit": max(min(limit, 100), 1),
    }


@app.get("/api/history/{assessment_id}")
def assessment_history_detail(assessment_id: str):
    """Return one assessment history record."""

    try:
        item = get_assessment(assessment_id)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail={"message": "Assessment history database is unavailable.", "error": str(exc)},
        )

    if item is None:
        raise HTTPException(status_code=404, detail="Assessment record not found.")

    return item


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


# ============================================================
# AUTOMATIC TRACK PREDICTION
# ============================================================

@app.post(
    "/api/predict/auto",
    response_model=ScoreResponse,
)
def predict_auto(
    applicant: ApplicantRequest
):

    raw = (
        applicant.model_dump()
    )

    # --------------------------------------------------------
    # Track A
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
    # Track B
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
    # Prefer Track A
    # --------------------------------------------------------

    if track_a_available:

        X = pd.DataFrame([
            {
                column: raw[column]
                for column
                in _feature_columns
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
    # Otherwise Track B
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
    # Neither model can score
    # --------------------------------------------------------

    raise HTTPException(
        status_code=422,
        detail={
            "message":
                "Insufficient data for credit scoring.",

            "track_a_available":
                False,

            "track_b_available":
                False,

            "required_track_b_fields":
                tb_config.FEATURE_COLUMNS,
        },
    )