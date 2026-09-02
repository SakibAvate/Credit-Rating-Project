"""
Pydantic API schemas for the unified Credit Risk Platform.

Supports:
- Track A bureau-based scoring
- Track B thin-file / no-bureau scoring
- Single assessment
- Bulk assessment
- Existing technical SHAP reasons
- New customer-friendly SHAP explanations
"""

from __future__ import annotations

from typing import Optional, List, Dict, Any

from pydantic import BaseModel, Field, ConfigDict


# ============================================================
# TRACK A
# ============================================================

class ApplicantRequest(BaseModel):
    """
    Track A applicant.

    Track A fields are intentionally allowed dynamically because
    the exact feature set comes from the existing Track A model.
    """

    model_config = ConfigDict(extra="allow")


# ============================================================
# TRACK B
# ============================================================

class TrackBApplicantRequest(BaseModel):
    """
    Track B thin-file / no-bureau applicant.

    These are consented financial-summary features.

    applicant_id is optional metadata used by Assessment History.
    It is not passed to the Track B model itself.
    """

    applicant_id: Optional[str] = None

    monthly_income: float = Field(gt=0)
    income_stability: float = Field(ge=0, le=1)

    avg_monthly_balance: float = Field(ge=0)
    min_monthly_balance: float = Field(ge=0)

    monthly_expense: float = Field(ge=0)
    emi_amount: float = Field(ge=0)

    emi_to_income_ratio: float = Field(ge=0, le=1)
    bounce_rate_6m: float = Field(ge=0, le=1)

    savings_rate: float = Field(ge=-1, le=1)
    savings_trend: float = Field(ge=-1, le=1)

    transaction_volatility: float = Field(ge=0)
    cash_flow_surplus: float

    salary_credit_frequency: float = Field(ge=0, le=1)


# ============================================================
# OUTPUT
# ============================================================

class ScoreResponse(BaseModel):
    """
    Common scoring response used by Track A and Track B.

    Existing fields are preserved.

    New customer-friendly SHAP explanations are optional so that
    existing clients and existing functionality remain compatible.
    """

    # --------------------------------------------------------
    # Existing scoring fields
    # --------------------------------------------------------

    pred_default_prob: float
    creditworthiness_score: float
    rating: str
    decision: str

    # --------------------------------------------------------
    # Existing metadata
    # --------------------------------------------------------

    scored_by: Optional[str] = None

    # --------------------------------------------------------
    # Existing technical SHAP explanation
    # --------------------------------------------------------

    top_reasons: Optional[str] = Field(
        default=None,
        description="Top SHAP-derived risk drivers"
    )

    # --------------------------------------------------------
    # Risk level
    #
    # Used by the newer unified engine.
    # Optional so existing API responses remain compatible.
    # --------------------------------------------------------

    risk_level: Optional[str] = None

    # --------------------------------------------------------
    # New customer-friendly SHAP explanation
    #
    # This does NOT replace top_reasons.
    # --------------------------------------------------------

    customer_explanations: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description=(
            "Customer-friendly explanations generated from "
            "the existing SHAP risk drivers."
        )
    )


# ============================================================
# MODEL / FIELD INFORMATION
# ============================================================

class FieldInfo(BaseModel):
    """
    Metadata describing an input field.
    """

    name: str
    type: str

    options: Optional[List[str]] = None

    # Used by Track B model metadata.
    # Optional so Track A existing fields remain compatible.
    default: Optional[Any] = None


class ModelInfoResponse(BaseModel):
    """
    Model metadata returned to the frontend.

    The original fields are preserved.

    Additional metadata fields are optional so both the existing
    API implementation and the newer unified engine can use this
    schema safely.
    """

    # --------------------------------------------------------
    # Existing fields
    # --------------------------------------------------------

    fields: List[FieldInfo]
    rating_bands: List[Dict[str, Any]]
    decision_policy: Dict[str, str]

    # --------------------------------------------------------
    # Additional metadata used by unified engine
    # --------------------------------------------------------

    track: Optional[str] = None
    name: Optional[str] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None


# ============================================================
# SYSTEM STATUS
# ============================================================

class TrackStatus(BaseModel):
    """
    Runtime status of one scoring track.
    """

    id: str
    name: str
    subtitle: str
    description: str

    data_available: bool
    model_loaded: bool


class SystemResponse(BaseModel):
    """
    Overall API/model system status.
    """

    status: str

    tracks: List[TrackStatus]

    any_model_loaded: bool
    all_models_loaded: bool