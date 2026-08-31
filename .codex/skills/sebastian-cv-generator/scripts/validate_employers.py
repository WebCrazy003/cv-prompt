#!/usr/bin/env python3
"""Validate the one-CV-record-per-profile-employer invariant."""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path


EMPLOYMENT_DATES = re.compile(
    r"^- Employment dates:\s*(\d{2}/\d{4})\s*[\u2013-]\s*(\d{2}/\d{4})\s*$"
)


def profile_employers(path: Path) -> list[tuple[str, str, str]]:
    employers: list[tuple[str, str, str]] = []
    current_name: str | None = None
    in_employment_history = False

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if line == "## Employment history":
            in_employment_history = True
            continue
        if in_employment_history and line.startswith("## "):
            break
        if not in_employment_history:
            continue
        if line.startswith("### "):
            current_name = line.removeprefix("### ").strip()
            continue

        match = EMPLOYMENT_DATES.fullmatch(line)
        if match and current_name:
            employers.append((current_name, match.group(1), match.group(2)))
            current_name = None

    if not employers:
        raise ValueError(f"No employment records found in {path}")
    return employers


def cv_employers(path: Path) -> list[tuple[str, str, str]]:
    document = json.loads(path.read_text(encoding="utf-8"))
    experience = document.get("experience")
    if not isinstance(experience, list):
        raise ValueError("CV field 'experience' must be an array")

    records: list[tuple[str, str, str]] = []
    for index, item in enumerate(experience):
        if not isinstance(item, dict):
            raise ValueError(f"experience[{index}] must be an object")
        try:
            records.append((item["companyName"], item["startDate"], item["endDate"]))
        except KeyError as error:
            raise ValueError(
                f"experience[{index}] is missing {error.args[0]!r}"
            ) from error
    return records


def validate(profile_path: Path, cv_path: Path) -> list[str]:
    expected = profile_employers(profile_path)
    actual = cv_employers(cv_path)
    errors: list[str] = []

    if len(actual) != len(expected):
        errors.append(
            f"expected {len(expected)} experience objects, found {len(actual)}"
        )

    name_counts = Counter(name for name, _, _ in actual)
    repeated = sorted(name for name, count in name_counts.items() if count > 1)
    if repeated:
        errors.append("repeated employers: " + ", ".join(repeated))

    expected_names = [name for name, _, _ in expected]
    actual_names = [name for name, _, _ in actual]
    missing = [name for name in expected_names if name not in name_counts]
    extra = [name for name in actual_names if name not in set(expected_names)]
    if missing:
        errors.append("missing employers: " + ", ".join(missing))
    if extra:
        errors.append("unexpected employers: " + ", ".join(extra))
    if (
        not missing
        and not extra
        and not repeated
        and len(actual) == len(expected)
        and actual_names != expected_names
    ):
        errors.append("employers are not in candidate-profile order")

    expected_by_name = {
        name: (start_date, end_date) for name, start_date, end_date in expected
    }
    for name, start_date, end_date in actual:
        expected_dates = expected_by_name.get(name)
        if expected_dates and (start_date, end_date) != expected_dates:
            errors.append(
                f"{name} dates must be {expected_dates[0]}–{expected_dates[1]}, "
                f"found {start_date}–{end_date}"
            )

    return errors


def main() -> int:
    if len(sys.argv) != 3:
        print(
            "Usage: validate_employers.py CANDIDATE_PROFILE CV_OUTPUT",
            file=sys.stderr,
        )
        return 2

    try:
        errors = validate(Path(sys.argv[1]), Path(sys.argv[2]))
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"Employer validation failed: {error}", file=sys.stderr)
        return 1

    if errors:
        for error in errors:
            print(f"Employer validation failed: {error}", file=sys.stderr)
        return 1

    print("Employer validation passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
