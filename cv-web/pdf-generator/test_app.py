import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app import convert_to_pdf


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


if __name__ == "__main__":
    unittest.main()
