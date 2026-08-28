"""
Pydantic request/response models for the API.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class ApplicantRequest(BaseModel):
    """
    A single applicant record. Field names must match the raw columns the
    model was trained on -- call GET /api/model/info to see exactly which
    fields are required and, for categorical fields, which values are valid.
    """
    model_config = ConfigDict(extra="allow")


class ScoreResponse(BaseModel):
    pred_default_prob: float
    creditworthiness_score: float
    rating: str
    decision: str
    top_reasons: Optional[str] = Field(
        default=None, description="Top SHAP-derived drivers for this applicant"
    )


class FieldInfo(BaseModel):
    name: str
    type: str                              # "numeric" | "ordinal" | "onehot"
    options: Optional[List[str]] = None    # valid categories, for ordinal/onehot fields


class ModelInfoResponse(BaseModel):
    fields: List[FieldInfo]
    rating_bands: List[Dict[str, Any]]
    decision_policy: Dict[str, str]
