"""
Central registry for Track A and Track B.

Single place for track metadata, data/model availability, and artifact paths.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Callable, Optional

import config
import config_track_b


@dataclass(frozen=True)
class TrackSpec:
    id: str
    name: str
    subtitle: str
    description: str
    scored_by: str
    raw_data_path: str
    model_path: str
    preprocessor_path: str
    scale_pos_weight_path: str
    feature_columns_path: str
    id_col: str
    target_col: str
    output_dir: str


TRACKS: dict[str, TrackSpec] = {
    "track-a": TrackSpec(
        id="track-a",
        name="Track A",
        subtitle="Bureau History",
        description="Applicants with conventional credit/bureau history.",
        scored_by="TRACK_A",
        raw_data_path=config.RAW_DATA_PATH,
        model_path=config.MODEL_PATH,
        preprocessor_path=config.PREPROCESSOR_PATH,
        scale_pos_weight_path=config.SCALE_POS_WEIGHT_PATH,
        feature_columns_path=config.FEATURE_COLUMNS_PATH,
        id_col=config.ID_COL,
        target_col=config.TARGET_COL,
        output_dir=config.OUTPUT_DIR,
    ),
    "track-b": TrackSpec(
        id="track-b",
        name="Track B",
        subtitle="Thin File / Alt Data",
        description="Applicants scored on consented bank/UPI transaction behaviour.",
        scored_by="TRACK_B",
        raw_data_path=config_track_b.RAW_DATA_PATH,
        model_path=config_track_b.MODEL_PATH,
        preprocessor_path=config_track_b.PREPROCESSOR_PATH,
        scale_pos_weight_path=config_track_b.SCALE_POS_WEIGHT_PATH,
        feature_columns_path=config_track_b.FEATURE_COLUMNS_PATH,
        id_col=config_track_b.ID_COL,
        target_col=config_track_b.TARGET_COL,
        output_dir=config_track_b.OUTPUT_DIR,
    ),
}


def get_track(track_id: str) -> TrackSpec:
    if track_id not in TRACKS:
        raise KeyError(f"Unknown track '{track_id}'. Valid: {list(TRACKS)}")
    return TRACKS[track_id]


def data_available(track_id: str) -> bool:
    spec = get_track(track_id)
    return os.path.isfile(spec.raw_data_path)


def model_available(track_id: str) -> bool:
    spec = get_track(track_id)
    return all(os.path.isfile(p) for p in (
        spec.model_path,
        spec.preprocessor_path,
        spec.scale_pos_weight_path,
        spec.feature_columns_path,
    ))


def tracks_with_data() -> list[str]:
    return [tid for tid in TRACKS if data_available(tid)]


def tracks_with_models() -> list[str]:
    return [tid for tid in TRACKS if model_available(tid)]


def resolve_train_tracks(track: str = "all") -> list[str]:
    if track == "all":
        available = tracks_with_data()
        if not available:
            raise FileNotFoundError(
                "No training data found. Place CSV files in data/:\n"
                f"  - {config.RAW_DATA_PATH}\n"
                f"  - {config_track_b.RAW_DATA_PATH}"
            )
        return available
    if track not in TRACKS:
        raise KeyError(f"Unknown track '{track}'")
    if not data_available(track):
        raise FileNotFoundError(f"No data for {track} at {get_track(track).raw_data_path}")
    return [track]
