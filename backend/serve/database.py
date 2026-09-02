"""MongoDB persistence for RiskLens assessment history.

The application uses the same code with either a local MongoDB instance
or MongoDB Atlas. Change MONGODB_URI when moving to deployment.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

from dotenv import load_dotenv
load_dotenv(override=True)

try:
    from pymongo import ASCENDING, DESCENDING, MongoClient
    from pymongo.errors import PyMongoError
    from bson import ObjectId
except ImportError:  # Optional until history is enabled.
    ASCENDING = 1
    DESCENDING = -1
    MongoClient = None
    ObjectId = None

    class PyMongoError(Exception):
        pass


MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "risklens")
MONGODB_USER = os.getenv("MONGODB_USER")
MONGODB_PASSWORD = os.getenv("MONGODB_PASSWORD")

_client: MongoClient | None = None
_db = None
_db_unavailable = False


def _get_db():
    global _client, _db, _db_unavailable

    if _db is not None:
        return _db

    if _db_unavailable:
        raise RuntimeError(
            "MongoDB is unavailable. Install pymongo, start MongoDB, and restart the FastAPI server."
        )

    if MongoClient is None:
        _db_unavailable = True
        raise RuntimeError(
            "pymongo is not installed. Run: pip install pymongo"
        )

    _client = MongoClient(
    MONGODB_URI,
    username=MONGODB_USER,
    password=MONGODB_PASSWORD,
    authSource="admin",
    serverSelectionTimeoutMS=10000,
    connectTimeoutMS=5000,
)
    try:
        _client.admin.command("ping")
    except PyMongoError:
        _db_unavailable = True
        raise

    _db = _client[MONGODB_DB]

    assessments = _db["assessments"]
    assessments.create_index([("created_at", DESCENDING)])
    assessments.create_index([("track", ASCENDING), ("created_at", DESCENDING)])
    assessments.create_index([("decision", ASCENDING), ("created_at", DESCENDING)])
    assessments.create_index([("applicant_id", ASCENDING)])

    return _db


def database_status() -> bool:
    try:
        _get_db()
        return True
    except Exception as exc:
        print(f"[History] MongoDB unavailable: {exc}")
        return False


def _clean_value(value: Any) -> Any:
    """Convert numpy/pandas scalar values into normal Python values."""
    if value is None:
        return None

    if hasattr(value, "item"):
        try:
            return value.item()
        except Exception:
            pass

    return value


def save_assessment(
    *,
    track: str,
    applicant_id: Any,
    probability: Any,
    score: Any,
    rating: Any,
    decision: Any,
    scored_by: str,
    top_reasons: Any = None,
    source: str = "single",
    batch_id: str | None = None,
) -> str | None:
    """Save one completed assessment without affecting model scoring."""
    try:
        db = _get_db()

        document = {
            "track": str(track),
            "applicant_id": _clean_value(applicant_id),
            "pred_default_prob": float(probability),
            "creditworthiness_score": float(score),
            "rating": str(rating),
            "decision": str(decision),
            "scored_by": str(scored_by),
            "top_reasons": (
                str(top_reasons)
                if top_reasons is not None
                else None
            ),
            "source": str(source),
            "batch_id": batch_id,
            "created_at": datetime.now(timezone.utc),
        }

        result = db["assessments"].insert_one(document)
        return str(result.inserted_id)

    except PyMongoError as exc:
        print(f"[History] Could not save assessment: {exc}")
        return None


def save_assessments(
    *,
    track: str,
    applicant_ids: Any,
    probabilities: Any,
    scores: Any,
    ratings: Any,
    decisions: Any,
    scored_by: str,
    source: str = "bulk",
    batch_id: str | None = None,
) -> int:
    """Save a completed batch in chunks so large CSVs remain manageable."""
    try:
        db = _get_db()
        collection = db["assessments"]

        total = len(probabilities)
        saved = 0
        chunk_size = 5000

        for start in range(0, total, chunk_size):
            end = min(start + chunk_size, total)
            documents = []

            for i in range(start, end):
                applicant_id = None
                if applicant_ids is not None:
                    applicant_id = _clean_value(applicant_ids[i])

                documents.append(
                    {
                        "track": str(track),
                        "applicant_id": applicant_id,
                        "pred_default_prob": float(probabilities[i]),
                        "creditworthiness_score": float(scores[i]),
                        "rating": str(ratings[i]),
                        "decision": str(decisions[i]),
                        "scored_by": str(scored_by),
                        "top_reasons": None,
                        "source": str(source),
                        "batch_id": batch_id,
                        "created_at": datetime.now(timezone.utc),
                    }
                )

            if documents:
                collection.insert_many(documents, ordered=False)
                saved += len(documents)

        print(f"[History] Saved {saved} {track} assessments.")
        return saved

    except PyMongoError as exc:
        print(f"[History] Could not save batch: {exc}")
        return 0


def _serialize(document: dict[str, Any]) -> dict[str, Any]:
    document["id"] = str(document.pop("_id"))

    created_at = document.get("created_at")
    if isinstance(created_at, datetime):
        document["created_at"] = created_at.isoformat()

    return document


def get_assessments(
    *,
    track: str | None = None,
    decision: str | None = None,
    search: str | None = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[dict[str, Any]], int]:
    """Return paginated assessment history."""
    db = _get_db()
    collection = db["assessments"]

    query: dict[str, Any] = {}

    if track:
        query["track"] = track

    if decision:
        query["decision"] = decision

    if search:
        query["applicant_id"] = {
            "$regex": search.strip(),
            "$options": "i",
        }

    total = collection.count_documents(query)

    cursor = (
        collection.find(query)
        .sort("created_at", DESCENDING)
        .skip(max(skip, 0))
        .limit(max(min(limit, 100), 1))
    )

    items = [_serialize(dict(document)) for document in cursor]
    return items, total


def get_assessment(assessment_id: str) -> dict[str, Any] | None:
    """Return one assessment by its MongoDB id."""
    if ObjectId is None:
        raise RuntimeError("pymongo is not installed. Run: pip install pymongo")

    try:
        object_id = ObjectId(assessment_id)
    except Exception:
        return None

    db = _get_db()
    document = db["assessments"].find_one({"_id": object_id})

    if document is None:
        return None

    return _serialize(dict(document))
