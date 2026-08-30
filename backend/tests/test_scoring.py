"""
Fast, dependency-light tests for the scorecard logic (no model needed).
Run with: pytest
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src import scoring
import config


def test_pd_to_score_is_monotonic_decreasing_in_pd():
    low_risk_score = scoring.pd_to_score(0.01)
    high_risk_score = scoring.pd_to_score(0.5)
    assert low_risk_score > high_risk_score


def test_pd_to_score_stays_within_bounds():
    assert scoring.pd_to_score(1e-9) <= config.SCORE_MAX
    assert scoring.pd_to_score(1 - 1e-9) >= config.SCORE_MIN


def test_score_to_rating_bands():
    assert scoring.score_to_rating(800) == "AAA"
    assert scoring.score_to_rating(720) == "AA"
    assert scoring.score_to_rating(400) == "D"


def test_decision_mapping_is_monotonic_with_risk():
    assert scoring.decision_from_rating("AAA") == "APPROVE"
    assert scoring.decision_from_rating("BBB") == "REFER"
    assert scoring.decision_from_rating("D") == "REJECT"
