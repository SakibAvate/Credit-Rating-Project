"""
Central configuration for the Track A credit-risk pipeline.
Change values here rather than hunting through the code.
"""

import os

# ---------------------------------------------------------------
# Reproducibility
# ---------------------------------------------------------------
RANDOM_STATE = 42

# ---------------------------------------------------------------
# Paths
# ---------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODEL_DIR = os.path.join(BASE_DIR, "models")
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")

RAW_DATA_PATH = os.path.join(DATA_DIR, "track_a_final.csv")

PREPROCESSOR_PATH = os.path.join(MODEL_DIR, "preprocessor.joblib")
MODEL_PATH = os.path.join(MODEL_DIR, "xgb_default_risk_model.joblib")
SCALE_POS_WEIGHT_PATH = os.path.join(MODEL_DIR, "scale_pos_weight.joblib")
FEATURE_COLUMNS_PATH = os.path.join(MODEL_DIR, "feature_columns.joblib")

GLOBAL_SHAP_PATH = os.path.join(OUTPUT_DIR, "shap_global_feature_importance.csv")
SHAP_REPORT_PATH = os.path.join(OUTPUT_DIR, "credit_decisions_with_shap.csv")
FULL_REPORT_PATH = os.path.join(OUTPUT_DIR, "credit_decisions_full_test_set.csv")

# ---------------------------------------------------------------
# Columns
# ---------------------------------------------------------------
ID_COL = "SK_ID_CURR"
TARGET_COL = "TARGET"

ORDINAL_COLS = ["NAME_EDUCATION_TYPE"]
EDUCATION_ORDER = [
    "Lower secondary",
    "Secondary / secondary special",
    "Incomplete higher",
    "Higher education",
    "Academic degree",
]

ONEHOT_COLS = ["NAME_INCOME_TYPE", "NAME_FAMILY_STATUS"]

TEST_SIZE = 0.2

# ---------------------------------------------------------------
# Hyperparameter search
# ---------------------------------------------------------------
SEARCH_SAMPLE_N = 40000
SEARCH_N_ITER = 15
SEARCH_CV_FOLDS = 3

PARAM_DIST = {
    "n_estimators": [200, 300, 400, 600],
    "max_depth": [3, 4, 5, 6, 8],
    "learning_rate": [0.01, 0.03, 0.05, 0.1],
    "subsample": [0.6, 0.7, 0.8, 1.0],
    "colsample_bytree": [0.6, 0.7, 0.8, 1.0],
    "min_child_weight": [1, 3, 5, 10],
    "gamma": [0, 0.1, 0.5, 1],
    "reg_lambda": [0.5, 1, 2, 5],
    "reg_alpha": [0, 0.1, 0.5, 1],
}

# ---------------------------------------------------------------
# Scorecard (FICO-style log-odds) transform
#   NOT derived from business policy -- reasonable, common defaults.
#   Adjust BASE_SCORE / BASE_ODDS / PDO to match real risk appetite.
# ---------------------------------------------------------------
BASE_SCORE = 600
BASE_ODDS = 50
PDO = 40
SCORE_MIN = 300
SCORE_MAX = 850

# ---------------------------------------------------------------
# Rating bands (fixed cutoffs, not quantiles -> stable across batches)
# Checked from the top down: first band whose cutoff the score clears.
# ---------------------------------------------------------------
RATING_BANDS = [
    (750, "AAA"),
    (700, "AA"),
    (650, "A"),
    (600, "BBB"),
    (550, "BB"),
    (500, "B"),
    (450, "C"),
    (0,   "D"),
]

# ---------------------------------------------------------------
# Decision policy
# ---------------------------------------------------------------
RATING_TO_DECISION = {
    "AAA": "APPROVE", "AA": "APPROVE", "A": "APPROVE",
    "BBB": "REFER",   "BB": "REFER",
    "B": "REJECT",    "C": "REJECT",  "D": "REJECT",
}

# ---------------------------------------------------------------
# SHAP
# ---------------------------------------------------------------
SHAP_SAMPLE_N = 2000
TOP_N_REASONS = 3
