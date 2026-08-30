"""
Unified CLI for Credit Risk Platform.

Track A:
    python main.py train
    python main.py score --input file.csv --output scored.csv

Track B:
    python main.py train-track-b
    python main.py score-track-b --input file.csv --output scored.csv

Both:
    python main.py train-all
    python main.py start
"""

import argparse
import os
import sys
import subprocess

from src import pipeline
from src.track_b import pipeline as track_b_pipeline


def start_server():
    """Start FastAPI using the project environment."""
    project_root = os.path.dirname(os.path.abspath(__file__))

    print("=" * 60)
    print("       CREDIT RISK PLATFORM")
    print("=" * 60)
    print("Starting API server...")
    print()
    print("Open in browser:")
    print("  http://127.0.0.1:8000/")
    print()
    print("API documentation:")
    print("  http://127.0.0.1:8000/docs")
    print()
    print("Press CTRL+C to stop.")
    print("=" * 60)

    subprocess.run(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "serve.app:app",
            "--host",
            "127.0.0.1",
            "--port",
            "8000",
        ],
        cwd=project_root,
    )


def train_all():
    print("\n" + "=" * 60)
    print("TRAINING TRACK A")
    print("=" * 60)

    pipeline.run_training_pipeline()

    print("\n" + "=" * 60)
    print("TRAINING TRACK B")
    print("=" * 60)

    track_b_pipeline.run_training_pipeline()

    print("\n" + "=" * 60)
    print("ALL MODELS TRAINED SUCCESSFULLY")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description="Unified Credit Risk Platform"
    )

    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser(
        "train",
        help="Train Track A"
    )

    sub.add_parser(
        "train-track-b",
        help="Train Track B"
    )

    sub.add_parser(
        "train-all",
        help="Train Track A and Track B"
    )

    sub.add_parser(
        "start",
        help="Start the unified FastAPI server"
    )

    score_parser = sub.add_parser(
        "score",
        help="Score Track A applicants"
    )
    score_parser.add_argument(
        "--input",
        required=True
    )
    score_parser.add_argument(
        "--output",
        required=True
    )

    tb_score_parser = sub.add_parser(
        "score-track-b",
        help="Score Track B applicants"
    )
    tb_score_parser.add_argument(
        "--input",
        required=True
    )
    tb_score_parser.add_argument(
        "--output",
        required=True
    )

    args = parser.parse_args()

    if args.command == "train":
        pipeline.run_training_pipeline()

    elif args.command == "train-track-b":
        track_b_pipeline.run_training_pipeline()

    elif args.command == "train-all":
        train_all()

    elif args.command == "start":
        start_server()

    elif args.command == "score":
        pipeline.score_new_applicants(
            args.input,
            args.output
        )
        print(f"Wrote Track A output to {args.output}")

    elif args.command == "score-track-b":
        track_b_pipeline.score_new_applicants(
            args.input,
            args.output
        )
        print(f"Wrote Track B output to {args.output}")


if __name__ == "__main__":
    main()