"""
Hyperparameter search + final XGBoost fit + calibrated evaluation.

TARGET = 1 means the applicant had serious repayment difficulty (the
original Home Credit definition: TARGET=1 -> "client with payment
difficulties"). So this model predicts PROBABILITY OF DEFAULT (PD).
"""

import time
import numpy as np
import joblib
import xgboost as xgb
from sklearn.model_selection import StratifiedKFold, RandomizedSearchCV
from sklearn.metrics import (roc_auc_score, average_precision_score,
                              classification_report, confusion_matrix)

import config


def compute_scale_pos_weight(y_train) -> float:
    return (y_train == 0).sum() / (y_train == 1).sum()


def search_hyperparameters(X_train, y_train, scale_pos_weight: float) -> dict:
    """RandomizedSearchCV on a subsample, to keep the search fast on one core."""
    sample = X_train.sample(
        n=min(config.SEARCH_SAMPLE_N, len(X_train)),
        random_state=config.RANDOM_STATE,
    )
    y_sample = y_train.loc[sample.index]

    base_clf = xgb.XGBClassifier(
        objective="binary:logistic",
        eval_metric="auc",
        tree_method="hist",
        scale_pos_weight=scale_pos_weight,
        random_state=config.RANDOM_STATE,
        n_jobs=-1,
    )

    cv = StratifiedKFold(n_splits=config.SEARCH_CV_FOLDS, shuffle=True,
                          random_state=config.RANDOM_STATE)

    search = RandomizedSearchCV(
        base_clf,
        param_distributions=config.PARAM_DIST,
        n_iter=config.SEARCH_N_ITER,
        scoring="roc_auc",
        cv=cv,
        random_state=config.RANDOM_STATE,
        verbose=1,
        n_jobs=1,  # xgb already uses all cores internally
    )

    t0 = time.time()
    search.fit(sample, y_sample)
    print(f"Search done in {time.time() - t0:.1f}s")
    print("Best CV ROC-AUC:", search.best_score_)
    print("Best params:", search.best_params_)
    return search.best_params_


def train_final_model(X_train, y_train, best_params: dict, scale_pos_weight: float):
    clf = xgb.XGBClassifier(
        objective="binary:logistic",
        eval_metric="auc",
        tree_method="hist",
        scale_pos_weight=scale_pos_weight,
        random_state=config.RANDOM_STATE,
        n_jobs=-1,
        **best_params,
    )
    clf.fit(X_train, y_train)
    return clf


def calibrate_probabilities(pred_proba_raw: np.ndarray, scale_pos_weight: float) -> np.ndarray:
    """
    scale_pos_weight improves ranking (ROC-AUC) on imbalanced data but
    distorts calibration -- it acts like oversampling the positive class
    by that factor, inflating raw probabilities. Correct back to a
    probability consistent with the TRUE class prior (needed whenever this
    becomes a real-world default probability / credit score):
        p_model/(1-p_model) = w * p_true/(1-p_true)  =>  solve for p_true
    """
    w = scale_pos_weight
    return pred_proba_raw / (pred_proba_raw + w * (1 - pred_proba_raw))


def evaluate(model, X_test, y_test, scale_pos_weight: float):
    pred_proba_raw = model.predict_proba(X_test)[:, 1]
    pred_proba = calibrate_probabilities(pred_proba_raw, scale_pos_weight)
    pred_class = (pred_proba_raw >= 0.5).astype(int)  # class label uses raw (trained) threshold

    metrics = {
        "roc_auc": roc_auc_score(y_test, pred_proba),
        "pr_auc": average_precision_score(y_test, pred_proba),
        "confusion_matrix": confusion_matrix(y_test, pred_class),
        "classification_report": classification_report(y_test, pred_class, digits=3),
    }
    return pred_proba, pred_class, metrics


def save_model(model, path: str = config.MODEL_PATH) -> None:
    joblib.dump(model, path)


def load_model(path: str = config.MODEL_PATH):
    return joblib.load(path)


def save_scale_pos_weight(w: float, path: str = config.SCALE_POS_WEIGHT_PATH) -> None:
    """
    scale_pos_weight is needed again at inference time to un-distort
    probabilities (see calibrate_probabilities), so it's persisted
    alongside the model rather than hard-coded or recomputed.
    """
    joblib.dump(w, path)


def load_scale_pos_weight(path: str = config.SCALE_POS_WEIGHT_PATH) -> float:
    return joblib.load(path)
