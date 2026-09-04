# CV Skill Runtime Contract Update Specification

## Status

Proposed. This is a breaking migration with no legacy mode.

## Relationship to the Web Application

This specification defines the changes required in the repository's CV-generator skills. The companion [CV and Job Application Generator Web App Specification](./cv-job-application-generator-web-app-spec.md) defines the application, Codex App Server integration, two-tab concurrency, temporary workspaces, persistence, and user interface.

The web application must not treat a CV skill as runnable until that skill satisfies this specification.

## Objective

Migrate every repository CV-generator skill from shared fixed input and output files to explicit, per-generation runtime file parameters so two Codex sessions can generate different CVs simultaneously without reading or overwriting each other's job data or output.

## Breaking Compatibility Decision

The old manual contract is removed:

```text
Read:  base-profile/job-application.md
Write: base-profile/cv-output.json
```

There is no `legacy` mode and no automatic fallback. After migration:

- invoking a CV skill without all required runtime file parameters is an error;
- a CV skill must never read `base-profile/job-application.md`;
- a CV skill must never read or write `base-profile/cv-output.json`;
- repository-level copies of those legacy files are not authoritative inputs or output destinations;
- callers, including manual Codex invocations, must create runtime input files and supply their paths explicitly.

This breaking change is intentional and approved.

## Skills in Scope

| Skill | Candidate data root | Manifest inputs | Existing user parameters |
|---|---|---|---|
| `alex-cv-generator` | `base-profile/alex` | `base-profile/alex/candidate-profile.md` | none |
| `alex-cv-generator-djinni` | `base-profile/alex` | `base-profile/alex/candidate-profile-djinni.md` | none |
| `sebastian-cv-generator` | `base-profile/sebastian` | `base-profile/sebastian/candidate-profile-sebastian.md` | none |
| `sebastian-cv-generator-no-lk` | `base-profile/sebastian` | `base-profile/sebastian/candidate-profile-sebastian-no-LK.md` | none |
| `steven-cv-generator` | `base-profile/steven` | all four Steven profile variants listed in its routing table | `country`, `LK-match` |

New CV-generator skills must adopt the same contract before the web application exposes them as runnable.

## Required Runtime Parameters

Every invocation requires these application-managed parameters:

| Parameter | Type | Meaning | Access |
|---|---|---|---|
| `jobDescriptionFile` | absolute path string | UTF-8 target-job description | read-only |
| `jobQuestionsFile` | absolute path string | UTF-8 JSON document containing ordered application questions | read-only |
| `cvOutputFile` | absolute path string | destination for the final schema-valid CV JSON | write destination |

Candidate-specific parameters remain separate. For example, `steven-cv-generator` additionally requires `country` and `LK-match`.

Runtime path values are data. Skill instructions and supporting scripts must quote them safely and must not construct paths by concatenating user-supplied job content.

## Runtime Contract Manifest

Each skill must add:

```text
.codex/skills/<skill-name>/runtime.contract.json
```

Example:

```json
{
  "version": 1,
  "runtimeParameters": [
    "jobDescriptionFile",
    "jobQuestionsFile",
    "cvOutputFile"
  ],
  "outputSchema": "references/cv-output.schema.json",
  "candidateDataRoot": "base-profile/alex",
  "snapshotIncludes": [
    "base-profile/alex/candidate-profile.md"
  ]
}
```

The implementation must add an application-owned JSON Schema at:

```text
spec/cv-skill-runtime-contract.schema.json
```

It must enforce:

- `version` is exactly `1`;
- `runtimeParameters` contains exactly the three reserved names once each;
- `outputSchema`, `candidateDataRoot`, and every `snapshotIncludes` entry are repository-relative paths;
- `snapshotIncludes` is non-empty and contains no duplicate entries;
- unknown properties are rejected.

## Per-Skill Snapshot Rules

The manifest is the complete declaration of repository files the skill needs in addition to its own skill directory.

- Each `snapshotIncludes` entry is a repository-relative file or glob pattern.
- Absolute paths, `..` traversal, negated patterns, and symlink escapes are invalid.
- Every pattern must match at least one file.
- Every `base-profile/**` match must remain inside `candidateDataRoot`.
- A manifest must not include `.git`, `.cv-web-runtime`, `cv-web/node_modules`, build output, another candidate's profile directory, or the whole repository.
- The application copies the complete selected skill directory automatically; a manifest must not list it again.
- Any repository instruction or supporting file required at runtime must be listed explicitly.
- Missing or invalid manifests make the skill incompatible; there is no whole-repository fallback.

The Steven manifest must include all four profile variants because its validated `country` and `LK-match` values select one at runtime:

```json
[
  "base-profile/steven/candidate-profile-steven-no-LK.md",
  "base-profile/steven/candidate-profile-steven.md",
  "base-profile/steven/candidate-profile-steven-UK-no-LK.md",
  "base-profile/steven/candidate-profile-steven-UK.md"
]
```

The skill must continue to read exactly one selected Steven profile and must never combine variants.

## User Parameter Schema Update

Add `.codex/skills/steven-cv-generator/ui.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "country": {
      "type": "string",
      "title": "Country",
      "enum": ["poland", "UK"]
    },
    "LK-match": {
      "type": "string",
      "title": "LinkedIn match",
      "enum": ["none", "LK-match"]
    }
  },
  "required": ["country", "LK-match"],
  "additionalProperties": false
}
```

The other four current skills have no user-selectable invocation parameters and do not require `ui.schema.json`. Reserved runtime file parameters must never appear in a UI schema.

## Runtime Input Formats

### Job description

`jobDescriptionFile` contains the submitted job description as UTF-8 text. CRLF is normalized to LF; otherwise the content is preserved.

### Job questions

`jobQuestionsFile` contains:

```json
{
  "version": 1,
  "questions": [
    { "id": "q1", "text": "First non-empty question" },
    { "id": "q2", "text": "Second non-empty question" }
  ]
}
```

Rules:

- `version` is exactly `1`.
- `questions` is an ordered array.
- Each `id` is unique and must be used internally to preserve question association and order. The current CV output schema continues to emit `question` and `answer`, not the internal ID.
- Each `text` is non-empty after trimming.
- No questions are represented by an empty array.
- The skill must answer every supplied question exactly once and in order.

## Output Contract

The skill must create `cvOutputFile` only after all generation and validation gates pass.

- Do not use an existing output file as drafting input.
- Re-read `jobDescriptionFile` and `jobQuestionsFile` before the final write and verify that the draft still matches them.
- Write one JSON object matching the skill's bundled `references/cv-output.schema.json`.
- Write exactly one answer for each input question, preserving question text and order as required by the current CV schema.
- Parse and validate the written file before declaring success.
- Do not create a second CV output at a fixed or inferred location.

The caller creates an empty destination directory. The skill may atomically replace `cvOutputFile` within that directory, but it must not write outside the supplied destination and its own temporary files in that same directory.

## Required Instruction Updates

For every in-scope skill, update all occurrences of the old runtime filenames in:

- `SKILL.md` frontmatter and body;
- `references/workflow-and-gates.md`;
- `references/completion-and-writing-rules.md`, when present;
- `references/tailoring-and-writing-rules.md`, when present;
- scripts, examples, commands, and validation instructions.

Replace old assumptions with the supplied runtime parameters. This includes initial reads, source-of-truth rules, freshness checks, final writes, schema validation, question reconciliation, and completion messages.

The two Sebastian `validate_employers.py` scripts already accept candidate and output paths as command-line arguments. Keep that interface, but change each skill's invocation instruction to pass the selected workspace candidate path and `cvOutputFile` instead of `base-profile/cv-output.json`.

Descriptions in YAML frontmatter must no longer advertise writing `base-profile/cv-output.json`.

## Parameter Failure Behavior

If a reserved runtime parameter is missing, empty, malformed, inaccessible, or points outside the current isolated generation workspace:

- stop before reading candidate data or generating a draft;
- do not ask Codex to guess or construct a replacement path;
- do not fall back to a repository file;
- do not write any CV output;
- return a concise error naming the invalid parameter.

Candidate-specific parameters may use the interactive behavior defined by the web-app specification, but the web application should validate them before invocation.

## Testing Requirements

### Static contract tests

- All five skill directories contain a schema-valid `runtime.contract.json`.
- No migrated skill instruction or reference file instructs Codex to read `base-profile/job-application.md`.
- No migrated skill instruction or reference file instructs Codex to read or write `base-profile/cv-output.json`.
- Frontmatter descriptions contain no obsolete fixed-output promise.
- Manifest paths resolve only to permitted files inside the declared candidate root or explicitly allowed supporting locations.

### Per-skill invocation tests

For each skill:

- invoke it with unique temporary input and output paths;
- confirm it reads the supplied job description and questions;
- confirm it writes only the supplied output path;
- validate the output against the bundled schema;
- confirm missing runtime parameters fail without touching legacy files;
- seed both legacy fixed files with sentinel content and prove they remain unread and unchanged.

For Steven, cover all four `country` and `LK-match` routes. For both Sebastian skills, confirm employer validation uses the supplied `cvOutputFile`.

### Concurrency test

Run two different skills concurrently with different temporary job inputs and output paths. Both must finish with the correct candidate facts, job targeting, questions, and output destination. Neither run may read or modify the other run's files or either legacy fixed file.

## Acceptance Criteria

1. All five current CV skills implement the three required runtime file parameters.
2. All five have valid, candidate-isolated runtime manifests.
3. No migrated instruction, reference, example, or validation command depends on the two legacy fixed files.
4. Invoking a skill without complete runtime parameters fails safely; legacy mode does not exist.
5. Each skill writes schema-valid JSON only to `cvOutputFile`.
6. Question answers correspond exactly to the ordered question input.
7. Steven's four routing combinations and both Sebastian validators work with isolated paths.
8. Two concurrent skill invocations produce isolated, correct outputs without cross-run or shared-file access.

## Implementation Sequence

1. Add `spec/cv-skill-runtime-contract.schema.json`.
2. Add `runtime.contract.json` to all five skill directories and `ui.schema.json` to `steven-cv-generator`.
3. Update each `SKILL.md` and every referenced workflow/rules document.
4. Update validation command examples to use runtime paths.
5. Add static contract and per-skill tests.
6. Run the isolated two-skill concurrency test.
7. Only then mark the five skills runnable in the web application.

## Official Reference

Codex skill structure and invocation guidance: <https://learn.chatgpt.com/docs/build-skills>
