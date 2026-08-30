"""
Unified scoring engine and model runtime for both tracks.

Training still delegates to each track's pipeline module; inference and
API-facing logic live here so serve/app.py stays thin.
"""

from __future__ import annotations

import io
from typing import Optional

import pandas as pd

import config
import config_track_b
from src import preprocessing as prep_a, train, scoring, explain as explain_a
from src import pipeline as pipeline_a
from src.registry import TRACKS, TrackSpec, get_track, model_available, tracks_with_data, tracks_with_models
from src.track_b import pipeline as pipeline_b
from src.track_b import preprocessing as prep_b, explain as explain_b
from serve.schemas import FieldInfo, ModelInfoResponse, ScoreResponse, SystemResponse, TrackStatus


_TRAIN_HANDLERS = {
    "track-a": pipeline_a.run_training_pipeline,
    "track-b": pipeline_b.run_training_pipeline,
}

_SCORE_HANDLERS = {
    "track-a": pipeline_a.score_new_applicants,
    "track-b": pipeline_b.score_new_applicants,
}


def train_tracks(track: str = "all") -> list[str]:
    """Train one or all tracks that have data on disk. Returns trained track ids."""
    from src.registry import resolve_train_tracks

    trained = []
    for track_id in resolve_train_tracks(track):
        print(f"\n{'=' * 60}\nTraining {TRACKS[track_id].name} ({track_id})\n{'=' * 60}")
        _TRAIN_HANDLERS[track_id]()
        trained.append(track_id)
    return trained


def score_applicants(track_id: str, input_csv: str, output_csv: str) -> pd.DataFrame:
    if track_id not in _SCORE_HANDLERS:
        raise KeyError(f"Unknown track '{track_id}'")
    if not model_available(track_id):
        raise FileNotFoundError(f"Model for {track_id} not trained yet. Run: python main.py train")
    return _SCORE_HANDLERS[track_id](input_csv, output_csv)


class TrackRuntime:
    def __init__(self, spec: TrackSpec):
        self.spec = spec
        self.preprocessor = None
        self.model = None
        self.scale_pos_weight = None
        self.explainer = None
        self.feature_columns = None
        self.field_options = None

    @property
    def ready(self) -> bool:
        return all(x is not None for x in (self.preprocessor, self.model, self.scale_pos_weight))

    def load(self) -> None:
        spec = self.spec
        if spec.id == "track-a":
            self.preprocessor = prep_a.load_preprocessor(spec.preprocessor_path)
            self.model = train.load_model(spec.model_path)
            self.scale_pos_weight = train.load_scale_pos_weight(spec.scale_pos_weight_path)
            self.feature_columns = prep_a.load_feature_columns(spec.feature_columns_path)
            self.field_options = prep_a.get_field_options(self.preprocessor)
            self.explainer = explain_a.build_explainer(self.model)
        else:
            self.preprocessor = prep_b.load_preprocessor(spec.preprocessor_path)
            self.model = train.load_model(spec.model_path)
            self.scale_pos_weight = train.load_scale_pos_weight(spec.scale_pos_weight_path)
            self.feature_columns = prep_b.load_feature_columns(spec.feature_columns_path)
            self.field_options = prep_b.get_field_options()
            self.explainer = explain_b.build_explainer(self.model)

    def transform(self, X_raw: pd.DataFrame) -> pd.DataFrame:
        if self.spec.id == "track-a":
            return prep_a.transform_new(self.preprocessor, X_raw)
        return prep_b.transform_new(self.preprocessor, X_raw)

    def score_dataframe(self, X_raw: pd.DataFrame, with_reasons: bool = False):
        X_enc = self.transform(X_raw)

        pred_proba_raw = self.model.predict_proba(X_enc)[:, 1]
        pred_proba = train.calibrate_probabilities(
            pred_proba_raw,
            self.scale_pos_weight,
        )

        scores, ratings, decisions = scoring.score_batch(pred_proba)

        reasons = None

        if with_reasons:
            shap_values = self.explainer.shap_values(X_enc)

            if self.spec.id == "track-a":
                reasons = explain_a.top_reasons_batch(
                    shap_values,
                    X_enc,
                )
        else:
            reasons = explain_b.top_reasons_batch(
                shap_values,
                X_enc,
            )

        return (
            pred_proba,
            scores,
            ratings,
            decisions,
            reasons,
        )

    def build_model_info(self) -> ModelInfoResponse:
        fields = []
        for col in self.feature_columns:
            if self.spec.id == "track-a":
                if col in config.ORDINAL_COLS:
                    fields.append(FieldInfo(name=col, type="ordinal", options=self.field_options[col]))
                elif col in config.ONEHOT_COLS:
                    fields.append(FieldInfo(name=col, type="onehot", options=self.field_options[col]))
                else:
                    fields.append(FieldInfo(name=col, type="numeric"))
            else:
                default = config_track_b.FEATURE_DEFAULTS.get(col)
                fields.append(FieldInfo(name=col, type="numeric", default=default))

        rating_bands = [{"min_score": cutoff, "rating": rating} for cutoff, rating in config.RATING_BANDS]
        return ModelInfoResponse(
            track=self.spec.id,
            name=self.spec.name,
            subtitle=self.spec.subtitle,
            description=self.spec.description,
            fields=fields,
            rating_bands=rating_bands,
            decision_policy=config.RATING_TO_DECISION,
        )


class CreditRiskEngine:
    """Loads and serves both track models from one place."""

    def __init__(self):
        self._runtimes: dict[str, TrackRuntime] = {
            tid: TrackRuntime(spec) for tid, spec in TRACKS.items()
        }

    def load_all(self) -> None:
        for track_id, rt in self._runtimes.items():
            if model_available(track_id):
                rt.load()

    def reload(self, track_id: Optional[str] = None) -> None:
        ids = [track_id] if track_id else list(TRACKS)
        for tid in ids:
            if model_available(tid):
                self._runtimes[tid].load()

    def runtime(self, track_id: str) -> TrackRuntime:
        rt = self._runtimes[track_id]
        if not rt.ready:
            raise RuntimeError(f"Model for {track_id} is not loaded. Run: python main.py train")
        return rt

    def system_status(self) -> SystemResponse:
        tracks = []
        for tid, spec in TRACKS.items():
            tracks.append(TrackStatus(
                id=tid,
                name=spec.name,
                subtitle=spec.subtitle,
                description=spec.description,
                data_available=tid in tracks_with_data(),
                model_loaded=self._runtimes[tid].ready,
            ))
        return SystemResponse(
            status="ok",
            tracks=tracks,
            any_model_loaded=any(t.model_loaded for t in tracks),
            all_models_loaded=all(t.model_loaded for t in tracks if t.data_available),
        )

    def predict_one(self, track_id: str, payload: dict) -> ScoreResponse:
        rt = self.runtime(track_id)
        X_new = pd.DataFrame([payload])
        pred_proba, scores, ratings, decisions, reasons = rt.score_dataframe(X_new, with_reasons=True)
        return _to_score_response(pred_proba, scores, ratings, decisions, reasons, rt.spec.scored_by)

    def predict_batch_csv(self, track_id: str, raw_bytes: bytes) -> str:
        rt = self.runtime(track_id)
        spec = rt.spec
        X_new = pd.read_csv(io.BytesIO(raw_bytes))

        id_col = X_new[spec.id_col] if spec.id_col in X_new.columns else None
        drop_cols = [c for c in [spec.id_col, spec.target_col] if c in X_new.columns]
        X_features = X_new.drop(columns=drop_cols)

        pred_proba, scores, ratings, decisions, _ = rt.score_dataframe(X_features, with_reasons=False)

        result = pd.DataFrame({
            "pred_default_prob": pred_proba,
            "creditworthiness_score": scores,
            "rating": ratings,
            "decision": decisions,
            "scored_by": spec.scored_by,
        })
        if id_col is not None:
            result.insert(0, spec.id_col, id_col.to_numpy())

        buffer = io.StringIO()
        result.to_csv(buffer, index=False)
        return buffer.getvalue()


def _to_score_response(pred_proba, scores, ratings, decisions, reasons, scored_by) -> ScoreResponse:
    rating = str(ratings[0])
    if isinstance(reasons, list) and reasons and isinstance(reasons[0], str) and ";" in reasons[0]:
        top = [r.strip() for r in reasons[0].split(";")]
    elif isinstance(reasons, list) and reasons:
        top = reasons[0] if isinstance(reasons[0], list) else reasons
    else:
        top = None

    return ScoreResponse(
        creditworthiness_score=float(scores[0]),
        default_probability=float(pred_proba[0]),
        risk_level=scoring.rating_to_risk_level(rating),
        rating=rating,
        decision=str(decisions[0]),
        scored_by=scored_by,
        top_reasons=top,
    )
