#!/usr/bin/env python3
"""Validate isolated CV-generator runtime paths and input formats."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import NoReturn


def fail(parameter: str, reason: str) -> NoReturn:
    print(f"Invalid runtime parameter {parameter}: {reason}", file=sys.stderr)
    raise SystemExit(2)


def inside(path: Path, workspace: Path) -> bool:
    return path == workspace or workspace in path.parents


def absolute_path(parameter: str, raw: str, workspace: Path) -> Path:
    try:
        supplied = Path(raw)
    except (TypeError, ValueError):
        fail(parameter, "must be a non-empty absolute path")
    if not raw or not supplied.is_absolute():
        fail(parameter, "must be a non-empty absolute path")
    try:
        path = supplied.resolve(strict=False)
    except (OSError, RuntimeError, ValueError) as error:
        fail(parameter, f"cannot be resolved ({error})")
    if not inside(path, workspace):
        fail(parameter, "must resolve inside the current generation workspace")
    return path


def readable_input(parameter: str, raw: str, workspace: Path) -> tuple[Path, str]:
    path = absolute_path(parameter, raw, workspace)
    try:
        if not path.is_file() or not os.access(path, os.R_OK):
            fail(parameter, "must reference a readable regular file")
        return path, path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        fail(parameter, "must contain valid UTF-8")
    except OSError as error:
        fail(parameter, f"cannot be read ({error})")


def validate_questions(raw: str) -> None:
    try:
        document = json.loads(raw)
    except json.JSONDecodeError as error:
        fail("jobQuestionsFile", f"must contain valid JSON ({error.msg})")

    if not isinstance(document, dict) or set(document) != {"version", "questions"}:
        fail("jobQuestionsFile", "must contain only version and questions")
    if type(document["version"]) is not int or document["version"] != 1:
        fail("jobQuestionsFile", "version must be exactly 1")
    if not isinstance(document["questions"], list):
        fail("jobQuestionsFile", "questions must be an array")

    seen_ids: set[str] = set()
    for index, question in enumerate(document["questions"]):
        if not isinstance(question, dict) or set(question) != {"id", "text"}:
            fail("jobQuestionsFile", f"questions[{index}] must contain only id and text")
        question_id = question["id"]
        text = question["text"]
        if not isinstance(question_id, str) or not question_id.strip():
            fail("jobQuestionsFile", f"questions[{index}].id must be a non-empty string")
        if question_id in seen_ids:
            fail("jobQuestionsFile", f"questions[{index}].id must be unique")
        if not isinstance(text, str) or not text.strip():
            fail("jobQuestionsFile", f"questions[{index}].text must be a non-empty string")
        seen_ids.add(question_id)


def main(argv: list[str]) -> int:
    names = ["jobDescriptionFile", "jobQuestionsFile", "cvOutputFile"]
    if len(argv) != 4:
        missing = names[len(argv) - 1] if len(argv) - 1 < len(names) else "runtimeParameters"
        fail(missing, "expected jobDescriptionFile, jobQuestionsFile, and cvOutputFile")

    workspace = Path.cwd().resolve()
    description_path = absolute_path(names[0], argv[1], workspace)
    questions_path = absolute_path(names[1], argv[2], workspace)
    output_path = absolute_path(names[2], argv[3], workspace)

    if description_path == questions_path:
        fail(names[1], "must not reference jobDescriptionFile")
    if output_path in {description_path, questions_path}:
        fail(names[2], "must not overwrite a runtime input file")
    if output_path.exists() and not output_path.is_file():
        fail(names[2], "must reference a file path, not a directory or special file")
    description_path, description = readable_input(names[0], argv[1], workspace)
    questions_path, questions = readable_input(names[1], argv[2], workspace)
    if not description.strip():
        fail(names[0], "job description must not be empty")
    validate_questions(questions)
    if not output_path.parent.is_dir():
        fail(names[2], "parent directory must exist")
    if not os.access(output_path.parent, os.W_OK):
        fail(names[2], "parent directory must be writable")

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
