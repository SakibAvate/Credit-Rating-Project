"""
Track B scoring.

Track B uses the same scorecard policy as Track A so that
both models produce a consistent creditworthiness score,
rating, and decision format.
"""

import numpy as np

from src import scoring as common_scoring


def score_batch(pred_proba):
    """
    Convert Track B default probabilities into:

    - creditworthiness score
    - rating
    - decision
    """

    probabilities = np.asarray(
        pred_proba,
        dtype=float,
    )

    return common_scoring.score_batch(
        probabilities
    )


def pd_to_score(p):
    """
    Convert probability of default to the common
    FICO-style creditworthiness score.
    """

    return common_scoring.pd_to_score(p)