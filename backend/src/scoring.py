"""
PD -> Creditworthiness Score (FICO-style log-odds scaling) -> Rating -> Decision.

See config.py for the scorecard parameters, rating cutoffs and decision
policy -- change the numbers there, not the logic here.
"""

import numpy as np

import config

FACTOR = config.PDO / np.log(2)
OFFSET = config.BASE_SCORE - FACTOR * np.log(config.BASE_ODDS)


def pd_to_score(p, eps: float = 1e-6):
    p = np.clip(p, eps, 1 - eps)
    odds = (1 - p) / p  # odds of "good" (non-default)
    score = OFFSET + FACTOR * np.log(odds)
    return np.clip(score, config.SCORE_MIN, config.SCORE_MAX)


def score_to_rating(score: float) -> str:
    for cutoff, rating in config.RATING_BANDS:
        if score >= cutoff:
            return rating
    return config.RATING_BANDS[-1][1]


def decision_from_rating(rating: str) -> str:
    return config.RATING_TO_DECISION[rating]


def score_batch(pred_proba: np.ndarray):
    """Vectorised PD -> score -> rating -> decision for a whole array."""
    scores = pd_to_score(pred_proba)
    ratings = np.array([score_to_rating(s) for s in scores])
    decisions = np.array([decision_from_rating(r) for r in ratings])
    return scores, ratings, decisions
