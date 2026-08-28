"""
End-to-end orchestration: raw data -> encode -> train -> evaluate ->
score -> explain -> save reports. Also supports scoring new applicants
against an already-trained model (no retraining).
"""

import os
import pandas as pd

import config
from src import data_loader, preprocessing, train, scoring, explain


def run_training_pipeline():
    os.makedirs(config.MODEL_DIR, exist_ok=True)
    os.makedirs(config.OUTPUT_DIR, exist_ok=True)

    # 1. Load + split (a single split keeps ID / features / target aligned)
    df = data_loader.load_raw_data()
    train_df, test_df = data_loader.train_test_split_raw(df)

    X_train = train_df.drop(columns=[config.TARGET_COL, config.ID_COL])
    y_train = train_df[config.TARGET_COL]

    X_test = test_df.drop(columns=[config.TARGET_COL, config.ID_COL])
    y_test = test_df[config.TARGET_COL]
    id_test = test_df[config.ID_COL]

    # 2. Encode categoricals (fit on train only)
    X_train_enc, X_test_enc, preprocessor = preprocessing.fit_transform(X_train, X_test)
    preprocessing.save_preprocessor(preprocessor)
    preprocessing.save_feature_columns(X_train.columns)  # needed by the API's /model/info

    # 3. Hyperparameter search + final fit on the full training set
    print("Running hyperparameter search...")
    scale_pos_weight = train.compute_scale_pos_weight(y_train)
    best_params = train.search_hyperparameters(X_train_enc, y_train, scale_pos_weight)
    model = train.train_final_model(X_train_enc, y_train, best_params, scale_pos_weight)
    train.save_model(model)
    train.save_scale_pos_weight(scale_pos_weight)  # needed again at inference time

    # 4. Evaluate on the held-out test set
    pred_proba, pred_class, metrics = train.evaluate(model, X_test_enc, y_test, scale_pos_weight)
    print("\n--- Test set performance ---")
    print("ROC-AUC:", metrics["roc_auc"])
    print("PR-AUC :", metrics["pr_auc"])
    print(metrics["confusion_matrix"])
    print(metrics["classification_report"])

    # 5. PD -> score -> rating -> decision
    scores, ratings, decisions = scoring.score_batch(pred_proba)

    # 6. SHAP explanations (on a sample, for speed)
    print("\nComputing SHAP values (this can take a bit)...")
    explainer = explain.build_explainer(model)
    X_shap, shap_values = explain.compute_shap_values(explainer, X_test_enc)
    importance = explain.global_importance(shap_values, X_shap.columns)
    print("\nTop 10 global drivers of default risk (mean |SHAP|):")
    print(importance.head(10))
    importance.to_csv(config.GLOBAL_SHAP_PATH, header=["mean_abs_shap"])

    reasons = explain.top_reasons_batch(shap_values, X_shap)
    n_shap = len(X_shap)

    # 7. Reports
    shap_report = pd.DataFrame({
        "SK_ID_CURR": id_test.iloc[:n_shap].to_numpy(),
        "actual_target": y_test.iloc[:n_shap].to_numpy(),
        "pred_default_prob": pred_proba[:n_shap],
        "creditworthiness_score": scores[:n_shap],
        "rating": ratings[:n_shap],
        "decision": decisions[:n_shap],
        "top_shap_reasons": reasons,
    })
    shap_report.to_csv(config.SHAP_REPORT_PATH, index=False)

    full_report = pd.DataFrame({
        "SK_ID_CURR": id_test.to_numpy(),
        "actual_target": y_test.to_numpy(),
        "pred_default_prob": pred_proba,
        "creditworthiness_score": scores,
        "rating": ratings,
        "decision": decisions,
    })
    full_report.to_csv(config.FULL_REPORT_PATH, index=False)

    print("\nRating distribution on test set:")
    print(full_report["rating"].value_counts().sort_index())
    print("\nDecision distribution on test set:")
    print(full_report["decision"].value_counts())

    print(f"\nSaved model + preprocessor to {config.MODEL_DIR}, "
          f"reports to {config.OUTPUT_DIR} (SHAP reasons for n={n_shap} applicants).")


def score_new_applicants(input_csv: str, output_csv: str) -> pd.DataFrame:
    """
    Inference-time scoring for new applicants, using the artifacts saved
    by run_training_pipeline() -- no retraining involved.
    """
    preprocessor = preprocessing.load_preprocessor()
    model = train.load_model()
    scale_pos_weight = train.load_scale_pos_weight()

    X_new = pd.read_csv(input_csv)
    id_col = X_new[config.ID_COL] if config.ID_COL in X_new.columns else None
    drop_cols = [c for c in [config.ID_COL, config.TARGET_COL] if c in X_new.columns]
    X_new_features = X_new.drop(columns=drop_cols)

    X_enc = preprocessing.transform_new(preprocessor, X_new_features)
    pred_proba_raw = model.predict_proba(X_enc)[:, 1]
    pred_proba = train.calibrate_probabilities(pred_proba_raw, scale_pos_weight)

    scores, ratings, decisions = scoring.score_batch(pred_proba)

    result = pd.DataFrame({
        "pred_default_prob": pred_proba,
        "creditworthiness_score": scores,
        "rating": ratings,
        "decision": decisions,
    })
    if id_col is not None:
        result.insert(0, config.ID_COL, id_col.to_numpy())

    result.to_csv(output_csv, index=False)
    return result
