import os

import pandas as pd

from . import (
    config,
    data_loader,
    preprocessing,
    train,
    explain,
    scoring
)


def run_training_pipeline():

    os.makedirs(
        config.MODEL_DIR,
        exist_ok=True
    )

    os.makedirs(
        config.OUTPUT_DIR,
        exist_ok=True
    )

    print("\nLoading Track B dataset...")

    df = data_loader.load_raw_data()

    print(
        f"Dataset shape: {df.shape}"
    )

    print(
        f"Default rate: {df[config.TARGET_COL].mean():.2%}"
    )

    # --------------------------------------------------------
    # TRAIN / TEST
    # --------------------------------------------------------

    train_df, test_df = (
        data_loader.train_test_split_raw(df)
    )

    X_train = train_df[
        config.FEATURE_COLUMNS
    ]

    y_train = train_df[
        config.TARGET_COL
    ]

    X_test = test_df[
        config.FEATURE_COLUMNS
    ]

    y_test = test_df[
        config.TARGET_COL
    ]

    print(
        f"Training rows: {len(X_train)}"
    )

    print(
        f"Testing rows: {len(X_test)}"
    )

    # --------------------------------------------------------
    # PREPROCESS
    # --------------------------------------------------------

    (
        X_train_encoded,
        X_test_encoded,
        preprocessor
    ) = preprocessing.fit_transform(
        X_train,
        X_test
    )

    preprocessing.save_preprocessor(
        preprocessor
    )

    preprocessing.save_feature_columns(
        X_train.columns
    )

    # --------------------------------------------------------
    # CLASS BALANCE
    # --------------------------------------------------------

    weight = train.compute_scale_pos_weight(
        y_train
    )

    print(
        f"Scale positive weight: {weight:.4f}"
    )

    # --------------------------------------------------------
    # HYPERPARAMETER SEARCH
    # --------------------------------------------------------

    best_params = train.search_hyperparameters(
        X_train_encoded,
        y_train,
        weight
    )

    # --------------------------------------------------------
    # FINAL MODEL
    # --------------------------------------------------------

    model = train.train_final_model(
        X_train_encoded,
        y_train,
        best_params,
        weight
    )

    train.save_model(model)

    train.save_scale_pos_weight(
        weight
    )

    # --------------------------------------------------------
    # EVALUATION
    # --------------------------------------------------------

    (
        probabilities,
        predicted_class,
        metrics
    ) = train.evaluate(
        model,
        X_test_encoded,
        y_test,
        weight
    )

    train.save_metrics(metrics)

    

    # --------------------------------------------------------
    # SHAP
    # --------------------------------------------------------

    explainer = explain.build_explainer(
        model
    )

    X_shap, shap_values = (
        explain.compute_shap_values(
            explainer,
            X_test_encoded
        )
    )

    importance = (
        explain.global_importance(
            shap_values,
            X_shap.columns
        )
    )

    importance.to_csv(
        config.GLOBAL_SHAP_PATH,
        header=["mean_abs_shap"]
    )

    # --------------------------------------------------------
    # SCORES
    # --------------------------------------------------------

    scores, ratings, decisions = (
        scoring.score_batch(
            probabilities
        )
    )

    reasons = (
        explain.top_reasons_batch(
            shap_values,
            X_shap
        )
    )

    # --------------------------------------------------------
    # SHAP REPORT
    # --------------------------------------------------------

    shap_count = len(X_shap)

    shap_report = pd.DataFrame({

        config.ID_COL:
            test_df[
                config.ID_COL
            ].iloc[:shap_count].to_numpy(),

        "actual_target":
            y_test.iloc[:shap_count].to_numpy(),

        "pred_default_prob":
            probabilities[:shap_count],

        "creditworthiness_score":
            scores[:shap_count],

        "rating":
            ratings[:shap_count],

        "decision":
            decisions[:shap_count],

        "top_shap_reasons":
            reasons
    })

    shap_report.to_csv(
        config.SHAP_REPORT_PATH,
        index=False
    )

    # --------------------------------------------------------
    # COMPLETE TEST REPORT
    # --------------------------------------------------------

    full_report = pd.DataFrame({

        config.ID_COL:
            test_df[
                config.ID_COL
            ].to_numpy(),

        "actual_target":
            y_test.to_numpy(),

        "pred_default_prob":
            probabilities,

        "creditworthiness_score":
            scores,

        "rating":
            ratings,

        "decision":
            decisions
    })

    full_report.to_csv(
        config.FULL_REPORT_PATH,
        index=False
    )

    print("\n")
    print("=" * 60)
    print("TRACK B TRAINING COMPLETE")
    print("=" * 60)

    print(
        f"Model saved to: {config.MODEL_PATH}"
    )

    print(
        f"Metrics saved to: {config.METRICS_PATH}"
    )

    return metrics


def score_new_applicants(
    input_csv,
    output_csv
):

    preprocessor = (
        preprocessing.load_preprocessor()
    )

    model = train.load_model()

    weight = (
        train.load_scale_pos_weight()
    )

    df = pd.read_csv(
        input_csv
    )

    ids = None

    if config.ID_COL in df.columns:
        ids = df[
            config.ID_COL
        ]

    X = df.drop(
        columns=[
            c
            for c in [
                config.ID_COL,
                config.TARGET_COL
            ]
            if c in df.columns
        ],
        errors="ignore"
    )

    missing = [
        c
        for c in config.FEATURE_COLUMNS
        if c not in X.columns
    ]

    if missing:
        raise ValueError(
            "Missing Track B features: "
            + ", ".join(missing)
        )

    X = X[
        config.FEATURE_COLUMNS
    ]

    X_encoded = (
        preprocessing.transform_new(
            preprocessor,
            X
        )
    )

    raw_probability = (
        model.predict_proba(
            X_encoded
        )[:, 1]
    )

    probability = (
        train.calibrate_probabilities(
            raw_probability,
            weight
        )
    )

    scores, ratings, decisions = (
        scoring.score_batch(
            probability
        )
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
            "TRACK_B"
    })

    if ids is not None:

        result.insert(
            0,
            config.ID_COL,
            ids.to_numpy()
        )

    result.to_csv(
        output_csv,
        index=False
    )

    return result