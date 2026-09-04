from __future__ import annotations

import concurrent.futures
import json
import os
import re
import subprocess
import tempfile
import unittest
from pathlib import Path, PurePosixPath


ROOT = Path(__file__).resolve().parents[1]
SKILLS_ROOT = ROOT / ".codex" / "skills"
RUNTIME_PARAMETERS = [
    "jobDescriptionFile",
    "jobQuestionsFile",
    "cvOutputFile",
]
EXPECTED_SNAPSHOTS = {
    "alex-cv-generator": ["base-profile/alex/candidate-profile.md"],
    "alex-cv-generator-djinni": [
        "base-profile/alex/candidate-profile-djinni.md"
    ],
    "sebastian-cv-generator": [
        "base-profile/sebastian/candidate-profile-sebastian.md"
    ],
    "sebastian-cv-generator-no-lk": [
        "base-profile/sebastian/candidate-profile-sebastian-no-LK.md"
    ],
    "steven-cv-generator": [
        "base-profile/steven/candidate-profile-steven-no-LK.md",
        "base-profile/steven/candidate-profile-steven.md",
        "base-profile/steven/candidate-profile-steven-UK-no-LK.md",
        "base-profile/steven/candidate-profile-steven-UK.md",
    ],
}
LEGACY_PATH_FRAGMENTS = (
    "base-profile/job-application.md",
    "base-profile/cv-output.json",
    "`job-application.md`",
    "`cv-output.json`",
    "job-application.md",
    "cv-output.json",
)


def is_within(path: Path, parent: Path) -> bool:
    return path == parent or parent in path.parents


def make_runtime_workspace(root: Path, label: str = "job") -> tuple[Path, list[str]]:
    workspace = root / label / "workspace"
    input_dir = workspace / "runtime-input"
    output_dir = workspace / "runtime-output"
    legacy_dir = workspace / "base-profile"
    input_dir.mkdir(parents=True)
    output_dir.mkdir()
    legacy_dir.mkdir()

    description = input_dir / "job-description.txt"
    questions = input_dir / "job-questions.json"
    output = output_dir / "cv-output.json"
    description.write_text(f"{label} platform engineer", encoding="utf-8")
    questions.write_text(
        json.dumps(
            {
                "version": 1,
                "questions": [
                    {"id": "q1", "text": f"Why {label}?"},
                    {"id": "q2", "text": "What would you improve?"},
                ],
            }
        ),
        encoding="utf-8",
    )
    (legacy_dir / "job-application.md").write_text(
        f"legacy-input-{label}", encoding="utf-8"
    )
    (legacy_dir / "cv-output.json").write_text(
        f"legacy-output-{label}", encoding="utf-8"
    )
    return workspace, [str(description), str(questions), str(output)]


def run_runtime_gate(skill: str, workspace: Path, arguments: list[str]) -> subprocess.CompletedProcess[str]:
    script = SKILLS_ROOT / skill / "scripts" / "validate_runtime_inputs.py"
    return subprocess.run(
        [os.fspath(Path(os.sys.executable)), os.fspath(script), *arguments],
        cwd=workspace,
        check=False,
        capture_output=True,
        text=True,
    )


class RuntimeManifestTests(unittest.TestCase):
    def test_contract_schema_encodes_required_shape(self) -> None:
        schema = json.loads(
            (ROOT / "spec" / "cv-skill-runtime-contract.schema.json").read_text(
                encoding="utf-8"
            )
        )
        self.assertEqual(schema["$schema"], "https://json-schema.org/draft/2020-12/schema")
        self.assertFalse(schema["additionalProperties"])
        self.assertEqual(schema["properties"]["version"]["const"], 1)
        runtime_schema = schema["properties"]["runtimeParameters"]
        self.assertEqual(
            [item["const"] for item in runtime_schema["prefixItems"]],
            RUNTIME_PARAMETERS,
        )
        self.assertFalse(runtime_schema["items"])
        self.assertEqual(runtime_schema["minItems"], 3)
        self.assertEqual(runtime_schema["maxItems"], 3)
        self.assertTrue(runtime_schema["uniqueItems"])
        self.assertFalse(schema["additionalProperties"])

    def test_contract_schema_rejects_unsafe_path_shapes(self) -> None:
        schema = json.loads(
            (ROOT / "spec" / "cv-skill-runtime-contract.schema.json").read_text(
                encoding="utf-8"
            )
        )
        candidate_pattern = re.compile(
            schema["properties"]["candidateDataRoot"]["pattern"]
        )
        snapshot_pattern = re.compile(
            schema["properties"]["snapshotIncludes"]["items"]["pattern"]
        )

        self.assertIsNotNone(candidate_pattern.fullmatch("base-profile/alex"))
        for unsafe in (
            "/tmp/alex",
            "C:/profiles/alex",
            "../alex",
            "a/../alex",
            "a\\alex",
            "base-profile/*",
        ):
            with self.subTest(candidate_path=unsafe):
                self.assertIsNone(candidate_pattern.fullmatch(unsafe))

        self.assertIsNotNone(
            snapshot_pattern.fullmatch("base-profile/alex/candidate-*.md")
        )
        for unsafe in (
            "!base-profile/alex/*.md",
            "/base-profile/alex/profile.md",
            "../base-profile/alex/profile.md",
            "base-profile/alex/../steven/profile.md",
            ".git/config",
            ".cv-web-runtime/generations/data.json",
            "cv-web/node_modules/package/index.js",
            "cv-web/dist/app.js",
            ".codex/skills/alex-cv-generator/SKILL.md",
            "*",
            "**",
            "**/*",
        ):
            with self.subTest(snapshot_path=unsafe):
                self.assertIsNone(snapshot_pattern.fullmatch(unsafe))

    def test_every_manifest_is_exact_and_candidate_isolated(self) -> None:
        for skill, expected_snapshots in EXPECTED_SNAPSHOTS.items():
            with self.subTest(skill=skill):
                contract_path = SKILLS_ROOT / skill / "runtime.contract.json"
                contract = json.loads(contract_path.read_text(encoding="utf-8"))
                self.assertEqual(
                    set(contract),
                    {
                        "version",
                        "runtimeParameters",
                        "outputSchema",
                        "candidateDataRoot",
                        "snapshotIncludes",
                    },
                )
                self.assertEqual(contract["version"], 1)
                self.assertEqual(contract["runtimeParameters"], RUNTIME_PARAMETERS)
                self.assertEqual(
                    contract["outputSchema"], "references/cv-output.schema.json"
                )
                self.assertEqual(contract["snapshotIncludes"], expected_snapshots)
                self.assertEqual(len(expected_snapshots), len(set(expected_snapshots)))

                candidate_root_text = contract["candidateDataRoot"]
                self.assertTrue(candidate_root_text.startswith("base-profile/"))
                candidate_root = (ROOT / candidate_root_text).resolve()
                self.assertTrue(candidate_root.is_dir())

                output_schema = (SKILLS_ROOT / skill / contract["outputSchema"]).resolve()
                self.assertTrue(output_schema.is_file())
                self.assertTrue(is_within(output_schema, (SKILLS_ROOT / skill).resolve()))

                for pattern in expected_snapshots:
                    pure_path = PurePosixPath(pattern)
                    self.assertFalse(pure_path.is_absolute())
                    self.assertNotIn("..", pure_path.parts)
                    self.assertFalse(pattern.startswith("!"))
                    matches = list(ROOT.glob(pattern))
                    self.assertTrue(matches, f"unmatched snapshot pattern: {pattern}")
                    for match in matches:
                        resolved = match.resolve()
                        self.assertTrue(resolved.is_file())
                        self.assertTrue(is_within(resolved, ROOT.resolve()))
                        self.assertTrue(is_within(resolved, candidate_root))

    def test_steven_ui_schema_is_restricted_to_user_parameters(self) -> None:
        schema = json.loads(
            (SKILLS_ROOT / "steven-cv-generator" / "ui.schema.json").read_text(
                encoding="utf-8"
            )
        )
        self.assertEqual(schema["required"], ["country", "LK-match"])
        self.assertFalse(schema["additionalProperties"])
        self.assertEqual(schema["properties"]["country"]["enum"], ["poland", "UK"])
        self.assertEqual(
            schema["properties"]["LK-match"]["enum"], ["none", "LK-match"]
        )
        self.assertTrue(set(schema["properties"]).isdisjoint(RUNTIME_PARAMETERS))

    def test_output_schemas_keep_question_ids_internal(self) -> None:
        for skill in EXPECTED_SNAPSHOTS:
            with self.subTest(skill=skill):
                schema = json.loads(
                    (SKILLS_ROOT / skill / "references" / "cv-output.schema.json").read_text(
                        encoding="utf-8"
                    )
                )
                self.assertIn("jobQuestionAnswers", schema["required"])
                self.assertIn("jobQuestionAnswers", schema["properties"])
                self.assertNotIn("answers", schema["properties"])


class SkillInstructionTests(unittest.TestCase):
    def test_instructions_have_no_legacy_fixed_path_contract(self) -> None:
        for skill in EXPECTED_SNAPSHOTS:
            files = [
                path
                for path in (SKILLS_ROOT / skill).rglob("*")
                if path.is_file() and path.suffix in {".json", ".md", ".py", ".yaml"}
            ]
            for path in files:
                with self.subTest(skill=skill, path=path.relative_to(SKILLS_ROOT / skill)):
                    text = path.read_text(encoding="utf-8")
                    for legacy in LEGACY_PATH_FRAGMENTS:
                        self.assertNotIn(legacy, text)

    def test_every_skill_documents_the_failure_and_output_contract(self) -> None:
        for skill in EXPECTED_SNAPSHOTS:
            with self.subTest(skill=skill):
                text = (SKILLS_ROOT / skill / "SKILL.md").read_text(encoding="utf-8")
                normalized = text.lower()
                for parameter in RUNTIME_PARAMETERS:
                    self.assertIn(parameter, text)
                self.assertIn("before reading candidate data", normalized)
                self.assertIn("do not ask for a replacement", normalized)
                self.assertIn("write-only build artifact", normalized)
                self.assertIn("no legacy mode", normalized)
                self.assertIn("untrusted data", normalized)
                self.assertIn("jobquestionanswers", normalized)
                self.assertIn("atomically", normalized)
                self.assertIn("sole output", normalized)

    def test_steven_routes_every_parameter_combination(self) -> None:
        text = (SKILLS_ROOT / "steven-cv-generator" / "SKILL.md").read_text(
            encoding="utf-8"
        )
        routes = {
            ("poland", "none"): "candidate-profile-steven-no-LK.md",
            ("poland", "LK-match"): "candidate-profile-steven.md",
            ("UK", "none"): "candidate-profile-steven-UK-no-LK.md",
            ("UK", "LK-match"): "candidate-profile-steven-UK.md",
        }
        for (country, match), profile in routes.items():
            self.assertRegex(
                text,
                rf"\| `{re.escape(country)}` \| `{re.escape(match)}` \| `[^`]*{re.escape(profile)}` \|",
            )

    def test_sebastian_commands_use_runtime_output(self) -> None:
        for skill in ("sebastian-cv-generator", "sebastian-cv-generator-no-lk"):
            with self.subTest(skill=skill):
                text = (SKILLS_ROOT / skill / "SKILL.md").read_text(encoding="utf-8")
                command_lines = [
                    line for line in text.splitlines() if "validate_employers.py" in line
                ]
                self.assertEqual(len(command_lines), 1)
                self.assertIn("cvOutputFile", command_lines[0])


class RuntimeInputGateTests(unittest.TestCase):
    def test_all_five_gates_accept_unique_isolated_paths_without_writing(self) -> None:
        for skill in EXPECTED_SNAPSHOTS:
            with self.subTest(skill=skill), tempfile.TemporaryDirectory() as temp:
                workspace, arguments = make_runtime_workspace(Path(temp), skill)
                result = run_runtime_gate(skill, workspace, arguments)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertFalse(Path(arguments[2]).exists())
                self.assertEqual(
                    (workspace / "base-profile" / "job-application.md").read_text(),
                    f"legacy-input-{skill}",
                )
                self.assertEqual(
                    (workspace / "base-profile" / "cv-output.json").read_text(),
                    f"legacy-output-{skill}",
                )

    def test_missing_parameters_fail_and_leave_sentinels_unchanged(self) -> None:
        for skill in EXPECTED_SNAPSHOTS:
            with self.subTest(skill=skill), tempfile.TemporaryDirectory() as temp:
                workspace, arguments = make_runtime_workspace(Path(temp))
                for count, parameter in enumerate(RUNTIME_PARAMETERS):
                    result = run_runtime_gate(skill, workspace, arguments[:count])
                    self.assertEqual(result.returncode, 2)
                    self.assertIn(parameter, result.stderr)
                self.assertEqual(
                    (workspace / "base-profile" / "job-application.md").read_text(),
                    "legacy-input-job",
                )
                self.assertEqual(
                    (workspace / "base-profile" / "cv-output.json").read_text(),
                    "legacy-output-job",
                )

    def test_outside_workspace_and_malformed_questions_are_rejected(self) -> None:
        skill = "alex-cv-generator"
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            workspace, arguments = make_runtime_workspace(root)
            outside = root / "outside-description.txt"
            outside.write_text("outside", encoding="utf-8")
            result = run_runtime_gate(skill, workspace, [str(outside), *arguments[1:]])
            self.assertEqual(result.returncode, 2)
            self.assertIn("jobDescriptionFile", result.stderr)

            symlink = workspace / "runtime-input" / "escaped-description.txt"
            symlink.symlink_to(outside)
            result = run_runtime_gate(skill, workspace, [str(symlink), *arguments[1:]])
            self.assertEqual(result.returncode, 2)
            self.assertIn("jobDescriptionFile", result.stderr)

            Path(arguments[1]).write_text(
                '{"version":1,"questions":[{"id":"q1","text":"A"},{"id":"q1","text":"B"}]}',
                encoding="utf-8",
            )
            result = run_runtime_gate(skill, workspace, arguments)
            self.assertEqual(result.returncode, 2)
            self.assertIn("jobQuestionsFile", result.stderr)

    def test_question_version_boolean_and_path_aliases_are_rejected(self) -> None:
        for skill in EXPECTED_SNAPSHOTS:
            with self.subTest(skill=skill), tempfile.TemporaryDirectory() as temp:
                workspace, arguments = make_runtime_workspace(Path(temp))
                Path(arguments[1]).write_text(
                    '{"version":true,"questions":[]}', encoding="utf-8"
                )
                result = run_runtime_gate(skill, workspace, arguments)
                self.assertEqual(result.returncode, 2)
                self.assertIn("jobQuestionsFile", result.stderr)

                result = run_runtime_gate(
                    skill, workspace, [arguments[0], arguments[0], arguments[2]]
                )
                self.assertEqual(result.returncode, 2)
                self.assertIn("jobQuestionsFile", result.stderr)

                output_directory = workspace / "runtime-output" / "not-a-file"
                output_directory.mkdir()
                result = run_runtime_gate(
                    skill, workspace, [arguments[0], arguments[1], str(output_directory)]
                )
                self.assertEqual(result.returncode, 2)
                self.assertIn("cvOutputFile", result.stderr)

    def test_two_runtime_gates_can_run_concurrently_without_cross_access(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            first_workspace, first_args = make_runtime_workspace(root, "first")
            second_workspace, second_args = make_runtime_workspace(root, "second")
            calls = (
                ("alex-cv-generator", first_workspace, first_args),
                ("steven-cv-generator", second_workspace, second_args),
            )
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                futures = [executor.submit(run_runtime_gate, *call) for call in calls]
                results = [future.result(timeout=10) for future in futures]
            self.assertTrue(all(result.returncode == 0 for result in results))
            self.assertFalse(Path(first_args[2]).exists())
            self.assertFalse(Path(second_args[2]).exists())
            self.assertEqual(
                (first_workspace / "base-profile" / "job-application.md").read_text(),
                "legacy-input-first",
            )
            self.assertEqual(
                (second_workspace / "base-profile" / "job-application.md").read_text(),
                "legacy-input-second",
            )
            self.assertEqual(
                (first_workspace / "base-profile" / "cv-output.json").read_text(),
                "legacy-output-first",
            )
            self.assertEqual(
                (second_workspace / "base-profile" / "cv-output.json").read_text(),
                "legacy-output-second",
            )


class SebastianValidatorTests(unittest.TestCase):
    def test_validators_accept_an_arbitrary_isolated_output_path(self) -> None:
        cases = (
            (
                "sebastian-cv-generator",
                ROOT / "base-profile/sebastian/candidate-profile-sebastian.md",
            ),
            (
                "sebastian-cv-generator-no-lk",
                ROOT / "base-profile/sebastian/candidate-profile-sebastian-no-LK.md",
            ),
        )
        employment_dates = re.compile(
            r"^- Employment dates:\s*(\d{2}/\d{4})\s*[\u2013-]\s*(\d{2}/\d{4})\s*$"
        )
        for skill, profile in cases:
            with self.subTest(skill=skill), tempfile.TemporaryDirectory() as temp:
                employers: list[dict[str, str]] = []
                current_name: str | None = None
                in_history = False
                for raw_line in profile.read_text(encoding="utf-8").splitlines():
                    line = raw_line.strip()
                    if line == "## Employment history":
                        in_history = True
                        continue
                    if in_history and line.startswith("## "):
                        break
                    if not in_history:
                        continue
                    if line.startswith("### "):
                        current_name = line.removeprefix("### ").strip()
                    match = employment_dates.fullmatch(line)
                    if match and current_name:
                        employers.append(
                            {
                                "companyName": current_name,
                                "startDate": match.group(1),
                                "endDate": match.group(2),
                            }
                        )
                        current_name = None

                output = Path(temp) / "isolated" / "runtime-output" / "custom.json"
                output.parent.mkdir(parents=True)
                output.write_text(json.dumps({"experience": employers}), encoding="utf-8")
                script = SKILLS_ROOT / skill / "scripts" / "validate_employers.py"
                result = subprocess.run(
                    [os.sys.executable, os.fspath(script), os.fspath(profile), os.fspath(output)],
                    check=False,
                    capture_output=True,
                    text=True,
                )
                self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
