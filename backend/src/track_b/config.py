"""Configuration for Track B. Does not modify Track A configuration."""
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_PATH = os.path.join(BASE_DIR, "data", "track_b_synthetic.csv")
MODEL_DIR = os.path.join(BASE_DIR, "models", "track_b")
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs", "track_b")
PREPROCESSOR_PATH = os.path.join(MODEL_DIR, "preprocessor.joblib")
MODEL_PATH = os.path.join(MODEL_DIR, "xgb_default_risk_model.joblib")
SCALE_POS_WEIGHT_PATH = os.path.join(MODEL_DIR, "scale_pos_weight.joblib")
FEATURE_COLUMNS_PATH = os.path.join(MODEL_DIR, "feature_columns.joblib")
GLOBAL_SHAP_PATH = os.path.join(OUTPUT_DIR, "shap_global_feature_importance.csv")
SHAP_REPORT_PATH = os.path.join(OUTPUT_DIR, "credit_decisions_with_shap.csv")
FULL_REPORT_PATH = os.path.join(OUTPUT_DIR, "credit_decisions_full_test_set.csv")
RANDOM_STATE = 42
ID_COL = "applicant_id"
TARGET_COL = "default"
FEATURE_COLUMNS = [
    "monthly_income", "income_stability", "avg_monthly_balance",
    "min_monthly_balance", "monthly_expense", "emi_amount",
    "emi_to_income_ratio", "bounce_rate_6m", "savings_rate",
    "savings_trend", "transaction_volatility", "cash_flow_surplus",
    "salary_credit_frequency"
]
TEST_SIZE = 0.2
SEARCH_SAMPLE_N = 20000
SEARCH_N_ITER = 8
SEARCH_CV_FOLDS = 3
PARAM_DIST = {
    "n_estimators": [200, 300, 400, 500],
    "max_depth": [3, 4, 5, 6],
    "learning_rate": [0.03, 0.05, 0.08, 0.1],
    "subsample": [0.7, 0.8, 1.0],
    "colsample_bytree": [0.7, 0.8, 1.0],
    "min_child_weight": [1, 3, 5, 10],
    "gamma": [0, 0.1, 0.5],
    "reg_lambda": [1, 2, 5],
    "reg_alpha": [0, 0.1, 0.5],
}
SHAP_SAMPLE_N = 2000
TOP_N_REASONS = 3

# ---------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------
CLASSIFICATION_THRESHOLD = 0.10

# ---------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------
METRICS_PATH = os.path.join(
    OUTPUT_DIR,
    "track_b_metrics.json"
)