import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from docx import Document

from app import ATS_TEMPLATE_FILE, TEMPLATES, build_ats_docx, convert_to_pdf


class LibreOfficeConversionTests(unittest.TestCase):
    def test_each_conversion_uses_a_distinct_user_profile(self):
        profile_arguments = []

        def fake_run(command, **_kwargs):
            profile_argument = next(
                argument for argument in command
                if argument.startswith("-env:UserInstallation=")
            )
            profile_arguments.append(profile_argument)
            output_directory = Path(command[command.index("--outdir") + 1])
            input_path = Path(command[-1])
            (output_directory / f"{input_path.stem}.pdf").write_bytes(b"%PDF-test")

        with tempfile.TemporaryDirectory(prefix="cv-conversion-test-") as temporary:
            root = Path(temporary)
            input_path = root / "generated-cv.docx"
            input_path.write_bytes(b"test")

            with patch("app.find_soffice", return_value="/fake/soffice"), patch(
                "app.subprocess.run", side_effect=fake_run
            ):
                self.assertIsNone(convert_to_pdf(input_path, root / "first.pdf"))
                self.assertIsNone(convert_to_pdf(input_path, root / "second.pdf"))

        self.assertEqual(len(profile_arguments), 2)
        self.assertNotEqual(profile_arguments[0], profile_arguments[1])
        self.assertTrue(all(argument.startswith("-env:UserInstallation=file://") for argument in profile_arguments))


class TemplateRegistryTests(unittest.TestCase):
    def test_contract_schema_lists_every_template(self):
        schema_path = Path(__file__).resolve().parents[2] / "spec" / "cv-skill-runtime-contract.schema.json"
        schema = json.loads(schema_path.read_text(encoding="utf-8"))
        self.assertEqual(sorted(schema["properties"]["pdfTemplate"]["enum"]), sorted(TEMPLATES))
        for template_file, _build in TEMPLATES.values():
            self.assertTrue(template_file.is_file(), template_file)


class AtsTemplateTests(unittest.TestCase):
    def test_renders_only_the_supported_sections(self):
        data = {
            "personNameOnCV": "Sebastian Sygula",
            "personLocation": "Sokolniki, Poland",
            "personEmail": "sebastian@example.com",
            "jobTitleApplyJob": "Senior Full-Stack Engineer",
            "summary": "Engineer summary.",
            "skills": [{"categoryName": "Languages", "skillItems": ["TypeScript", "Python"]}],
            "experience": [{
                "companyName": "Endava",
                "jobTitle": "Senior Full-Stack Engineer",
                "startDate": "03/2024",
                "endDate": "10/2026",
                "content": ["Built things."],
            }],
            "personUniversity": "Waseda University",
            "personDegree": "Bachelor's Degree, Computer Science",
        }
        with tempfile.TemporaryDirectory(prefix="cv-ats-test-") as temporary:
            output = Path(temporary) / "cv.docx"
            build_ats_docx(ATS_TEMPLATE_FILE, data, output)
            lines = [paragraph.text for paragraph in Document(str(output)).paragraphs]

        self.assertEqual(lines, [
            "SEBASTIAN SYGULA",
            "Senior Full-Stack Engineer",
            "Sokolniki, Poland  |  sebastian@example.com",
            "PROFESSIONAL SUMMARY",
            "Engineer summary.",
            "CORE SKILLS",
            "Languages: TypeScript  •  Python",
            "PROFESSIONAL EXPERIENCE",
            "Senior Full-Stack Engineer\tMar 2024 - Oct 2026",
            "Endava",
            "• Built things.",
            "EDUCATION",
            "Bachelor's Degree, Computer Science",
            "Waseda University",
        ])


if __name__ == "__main__":
    unittest.main()
