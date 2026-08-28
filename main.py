"""
CLI entry point for the Track A credit-risk pipeline.

    python main.py train
    python main.py score --input new_applicants.csv --output scored.csv
"""

import argparse

from src import pipeline


def main():
    parser = argparse.ArgumentParser(description="Track A credit-risk pipeline")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("train", help="Run the full training pipeline end-to-end")

    score_parser = sub.add_parser("score", help="Score new applicants with a trained model")
    score_parser.add_argument("--input", required=True, help="CSV of new applicants")
    score_parser.add_argument("--output", required=True, help="Where to write the scored CSV")

    args = parser.parse_args()

    if args.command == "train":
        pipeline.run_training_pipeline()
    elif args.command == "score":
        pipeline.score_new_applicants(args.input, args.output)
        print(f"Wrote scored output to {args.output}")


if __name__ == "__main__":
    main()
