#!/usr/bin/env python3
"""Generate one PDF from a validated CV JSON file.

This thin CLI keeps the imported generator engine behind an argument-array process
boundary. It writes machine-readable JSON to stdout for the TypeScript server.
"""

import argparse
import json
import tempfile
from pathlib import Path

from app import TEMPLATE_FILE, build_docx, convert_to_pdf


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    input_path = Path(args.input).resolve()
    output_path = Path(args.output).resolve()
    data = json.loads(input_path.read_text(encoding="utf-8"))
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="cv-pdf-") as temporary:
        docx_path = Path(temporary) / "generated-cv.docx"
        build_docx(TEMPLATE_FILE, data, docx_path)
        warning = convert_to_pdf(docx_path, output_path)

    if not output_path.is_file() or not output_path.read_bytes().startswith(b"%PDF"):
        raise RuntimeError("The PDF generator did not produce a valid PDF file.")
    print(json.dumps({"pdfPath": str(output_path), "warning": warning}))


if __name__ == "__main__":
    main()

