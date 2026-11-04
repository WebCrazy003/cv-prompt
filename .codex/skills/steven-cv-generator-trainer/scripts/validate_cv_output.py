#!/usr/bin/env python3
"""Validate a generated CV file against the bundled schema using only the standard library."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

SCHEMA_PATH = Path(__file__).resolve().parent.parent / "references" / "cv-output.schema.json"
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
JSON_TYPES = {
    "object": dict,
    "array": list,
    "string": str,
}


def validate(value: Any, schema: dict[str, Any], path: str, errors: list[str]) -> None:
    expected = schema.get("type")
    if expected is not None:
        if expected not in JSON_TYPES:
            errors.append(f"{path}: unsupported schema type {expected!r}")
            return
        if not isinstance(value, JSON_TYPES[expected]):
            errors.append(f"{path}: expected {expected}, found {type(value).__name__}")
            return

    if isinstance(value, dict):
        properties = schema.get("properties", {})
        for key in schema.get("required", []):
            if key not in value:
                errors.append(f"{path}: missing required property {key!r}")
        if schema.get("additionalProperties") is False:
            for key in value:
                if key not in properties:
                    errors.append(f"{path}: unexpected property {key!r}")
        for key, child in value.items():
            if key in properties:
                validate(child, properties[key], f"{path}.{key}", errors)

    if isinstance(value, list):
        if "minItems" in schema and len(value) < schema["minItems"]:
            errors.append(f"{path}: expected at least {schema['minItems']} items, found {len(value)}")
        if "maxItems" in schema and len(value) > schema["maxItems"]:
            errors.append(f"{path}: expected at most {schema['maxItems']} items, found {len(value)}")
        if schema.get("uniqueItems"):
            seen: set[str] = set()
            for index, item in enumerate(value):
                marker = json.dumps(item, sort_keys=True)
                if marker in seen:
                    errors.append(f"{path}[{index}]: duplicate item")
                seen.add(marker)
        if "items" in schema:
            for index, item in enumerate(value):
                validate(item, schema["items"], f"{path}[{index}]", errors)

    if isinstance(value, str):
        if "minLength" in schema and len(value) < schema["minLength"]:
            errors.append(f"{path}: must contain at least {schema['minLength']} characters")
        if "pattern" in schema and not re.search(schema["pattern"], value):
            errors.append(f"{path}: {value!r} does not match {schema['pattern']}")
        if schema.get("format") == "email" and not EMAIL_PATTERN.fullmatch(value):
            errors.append(f"{path}: {value!r} is not an email address")


def validate_answers(document: Any, questions_path: Path, errors: list[str]) -> None:
    questions = json.loads(questions_path.read_text(encoding="utf-8"))["questions"]
    expected = [question["text"] for question in questions]
    answers = document.get("jobQuestionAnswers") if isinstance(document, dict) else None
    if not isinstance(answers, list):
        return
    actual = [answer.get("question") if isinstance(answer, dict) else None for answer in answers]
    if actual != expected:
        errors.append(
            "$.jobQuestionAnswers: questions must match jobQuestionsFile exactly and in order "
            f"(expected {len(expected)}, found {len(actual)})"
        )


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print("usage: validate_cv_output.py <cvOutputFile> <jobQuestionsFile>", file=sys.stderr)
        return 2
    output_path, questions_path = Path(argv[1]), Path(argv[2])

    try:
        raw = output_path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as error:
        print(f"Invalid CV output: cannot read {output_path} ({error})", file=sys.stderr)
        return 1
    try:
        document = json.loads(raw)
    except json.JSONDecodeError as error:
        print(
            f"Invalid CV output: not valid JSON ({error.msg} at line {error.lineno}, column {error.colno})",
            file=sys.stderr,
        )
        return 1

    errors: list[str] = []
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    validate(document, schema, "$", errors)
    validate_answers(document, questions_path, errors)
    if errors:
        for error in errors:
            print(f"Invalid CV output: {error}", file=sys.stderr)
        return 1

    print("CV output is valid.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
