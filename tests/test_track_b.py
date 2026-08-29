import numpy as np
from src.track_b import scoring

def test_track_b_score_shape():
    s,r,d=scoring.score_batch(np.array([0.01,0.10,0.50]))
    assert len(s)==len(r)==len(d)==3
    assert np.all(s>=300) and np.all(s<=850)
