import time
import joblib
import json
import os
import time
import joblib
import json

import numpy as np
import xgboost as xgb

from sklearn.model_selection import (
    StratifiedKFold,
    RandomizedSearchCV,
)

from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    classification_report,
    confusion_matrix,
    precision_score,
    recall_score,
    f1_score,
)

from . import config


# ===============================================================
# CLASS BALANCE
# ===============================================================

def compute_scale_pos_weight(y):
    """
    Calculate XGBoost positive-class weight.

    Track B normally has many more non-default applicants
    than default applicants.
    """

    positives = int((y == 1).sum())
    negatives = int((y == 0).sum())

    if positives == 0:
        raise ValueError(
            "Track B training data contains no positive samples."
        )

    return negatives / positives


# ===============================================================
# HYPERPARAMETER SEARCH
# ===============================================================

def search_hyperparameters(X, y, weight):

    sample_size = min(
        config.SEARCH_SAMPLE_N,
        len(X),
    )

    sample = X.sample(
        n=sample_size,
        random_state=config.RANDOM_STATE,
    )

    y_sample = y.loc[sample.index]

    classifier = xgb.XGBClassifier(
        objective="binary:logistic",
        eval_metric="auc",
        tree_method="hist",
        scale_pos_weight=weight,
        random_state=config.RANDOM_STATE,
        n_jobs=-1,
    )

    cv = StratifiedKFold(
        n_splits=config.SEARCH_CV_FOLDS,
        shuffle=True,
        random_state=config.RANDOM_STATE,
    )

    search = RandomizedSearchCV(
        estimator=classifier,
        param_distributions=config.PARAM_DIST,
        n_iter=config.SEARCH_N_ITER,
        scoring="roc_auc",
        cv=cv,
        random_state=config.RANDOM_STATE,
        n_jobs=1,
        verbose=1,
    )

    start = time.time()

    search.fit(
        sample,
        y_sample,
    )

    elapsed = time.time() - start

    print(
        f"Track B hyperparameter search completed "
        f"in {elapsed:.2f} seconds"
    )

    print(
        f"Best CV ROC-AUC: {search.best_score_:.4f}"
    )

    print("Best parameters:")

    for key, value in search.best_params_.items():
        print(f"  {key}: {value}")

    return search.best_params_


# ===============================================================
# FINAL MODEL
# ===============================================================

def train_final_model(X, y, best_params, weight):

    model = xgb.XGBClassifier(
        objective="binary:logistic",
        eval_metric="auc",
        tree_method="hist",
        scale_pos_weight=weight,
        random_state=config.RANDOM_STATE,
        n_jobs=-1,
        **best_params,
    )

    model.fit(
        X,
        y,
    )

    return model


# ===============================================================
# PROBABILITY CALIBRATION
# ===============================================================

def calibrate_probabilities(probabilities, weight):
    """
    Correct probabilities for the artificial class weighting.

    XGBoost uses scale_pos_weight during training, so the raw
    probability is adjusted back toward the observed class prior.

    IMPORTANT:
    This function returns a continuous probability.
    It does NOT decide approve/reject.
    """

    probabilities = np.asarray(
        probabilities,
        dtype=float,
    )

    return probabilities / (
        probabilities
        + weight * (1.0 - probabilities)
    )


# ===============================================================
# THRESHOLD ANALYSIS
# ===============================================================

def analyze_thresholds(y, probability):
    """
    Evaluate several classification thresholds.

    This is only used to understand how the model behaves.

    The model itself still produces continuous probabilities.
    """

    thresholds = [
        0.05,
        0.10,
        0.15,
        0.20,
        0.25,
        0.30,
        0.35,
        0.40,
        0.50,
    ]

    rows = []

    print()
    print("=" * 72)
    print("TRACK B THRESHOLD ANALYSIS")
    print("=" * 72)

    print(
        f"{'Threshold':>10} "
        f"{'Precision':>12} "
        f"{'Recall':>10} "
        f"{'F1':>10} "
        f"{'Pred Default':>15}"
    )

    print("-" * 72)

    for threshold in thresholds:

        predicted_class = (
            probability >= threshold
        ).astype(int)

        precision = precision_score(
            y,
            predicted_class,
            zero_division=0,
        )

        recall = recall_score(
            y,
            predicted_class,
            zero_division=0,
        )

        f1 = f1_score(
            y,
            predicted_class,
            zero_division=0,
        )

        predicted_defaults = int(
            predicted_class.sum()
        )

        rows.append(
            {
                "threshold": threshold,
                "precision": float(precision),
                "recall": float(recall),
                "f1": float(f1),
                "predicted_defaults": predicted_defaults,
            }
        )

        print(
            f"{threshold:>10.2f} "
            f"{precision:>12.4f} "
            f"{recall:>10.4f} "
            f"{f1:>10.4f} "
            f"{predicted_defaults:>15}"
        )

    print("=" * 72)

    return rows


# ===============================================================
# EVALUATION
# ===============================================================

def evaluate(model, X, y, weight):

    raw_probability = model.predict_proba(X)[:, 1]

    probability = calibrate_probabilities(
        raw_probability,
        weight,
    )

    # -----------------------------------------------------------
    # Analyze thresholds before selecting a decision threshold.
    # -----------------------------------------------------------

    threshold_results = analyze_thresholds(
        y,
        probability,
    )

    # -----------------------------------------------------------
    # Use configured threshold for the official evaluation.
    # -----------------------------------------------------------

    predicted_class = (
        probability >= config.CLASSIFICATION_THRESHOLD
    ).astype(int)

    cm = confusion_matrix(
        y,
        predicted_class,
    )

    report = classification_report(
        y,
        predicted_class,
        digits=4,
        zero_division=0,
    )

    metrics = {
        "roc_auc": float(
            roc_auc_score(
                y,
                probability,
            )
        ),

        "pr_auc": float(
            average_precision_score(
                y,
                probability,
            )
        ),

        "precision": float(
            precision_score(
                y,
                predicted_class,
                zero_division=0,
            )
        ),

        "recall": float(
            recall_score(
                y,
                predicted_class,
                zero_division=0,
            )
        ),

        "f1": float(
            f1_score(
                y,
                predicted_class,
                zero_division=0,
            )
        ),

        "classification_threshold": float(
            config.CLASSIFICATION_THRESHOLD
        ),

        "confusion_matrix": cm.tolist(),

        "classification_report": report,

        "threshold_analysis": threshold_results,
    }

    print()
    print("=" * 60)
    print("TRACK B TEST PERFORMANCE")
    print("=" * 60)

    print(
        f"ROC-AUC : {metrics['roc_auc']:.4f}"
    )

    print(
        f"PR-AUC  : {metrics['pr_auc']:.4f}"
    )

    print(
        f"Precision: {metrics['precision']:.4f}"
    )

    print(
        f"Recall   : {metrics['recall']:.4f}"
    )

    print(
        f"F1       : {metrics['f1']:.4f}"
    )

    print()
    print(
        "Classification threshold:",
        config.CLASSIFICATION_THRESHOLD,
    )

    print()
    print("Confusion Matrix:")
    print(cm)

    print()
    print("Classification Report:")
    print(report)

    return (
        probability,
        predicted_class,
        metrics,
    )


# ===============================================================
# MODEL SAVE / LOAD
# ===============================================================

def save_model(model):

    joblib.dump(
        model,
        config.MODEL_PATH,
    )


def load_model():

    return joblib.load(
        config.MODEL_PATH,
    )


# ===============================================================
# SCALE POSITIVE WEIGHT SAVE / LOAD
# ===============================================================

def save_scale_pos_weight(weight):

    joblib.dump(
        weight,
        config.SCALE_POS_WEIGHT_PATH,
    )


def load_scale_pos_weight():

    return joblib.load(
        config.SCALE_POS_WEIGHT_PATH,
    )


# ===============================================================
# METRICS
# ===============================================================

def save_metrics(metrics):

    # Make sure Track B output directory exists.
    os.makedirs(
        config.OUTPUT_DIR,
        exist_ok=True,
    )

    with open(
        config.METRICS_PATH,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            metrics,
            file,
            indent=2,
        )