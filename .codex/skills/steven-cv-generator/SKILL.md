---
name: steven-cv-generator
description: Generate Steve Onye's complete, strongly tailored ATS-friendly CV JSON using country and LK-match parameters to select the correct source profile. Use when tailoring Steve's CV to a job description, answering application questions, auditing CV quality, or writing base-profile/cv-output.json.
---

# Steven CV Generator

Generate a complete CV aligned closely with the target job.

## Inputs and output

Resolve paths from the repository root:

- Require both invocation parameters:
  - `country`: exactly `poland` or `UK`.
  - `LK-match`: exactly `none` or `LK-match`.
- Select exactly one candidate source using this routing table:

| `country` | `LK-match` | Candidate source |
|---|---|---|
| `poland` | `none` | `base-profile/steven/candidate-profile-steven-no-LK.md` |
| `poland` | `LK-match` | `base-profile/steven/candidate-profile-steven.md` |
| `UK` | `none` | `base-profile/steven/candidate-profile-steven-UK-no-LK.md` |
| `UK` | `LK-match` | `base-profile/steven/candidate-profile-steven-UK.md` |

- Read the target job and application questions from `base-profile/job-application.md`.
- Write the final result to `base-profile/cv-output.json`.

If either parameter is missing or invalid, ask the user for valid values before reading a candidate profile or generating output. Do not combine facts across candidate-profile variants.

Treat identity, education, employer names, employment dates, and any supplied job titles in the selected candidate file as fixed facts. Use the target job and professional context to complete missing career details. Never modify either input file during generation.

## Runtime source-of-truth contract

- At the start of every invocation, resolve the two parameters, then read the selected candidate profile and `base-profile/job-application.md` from disk, even when their contents appeared earlier in the conversation or a previous invocation.
- Treat `base-profile/job-application.md` as authoritative for the target company, target title, application questions, technology stack, responsibilities, and domain.
- Treat `base-profile/cv-output.json` strictly as a replaceable build artifact. Never use its target role, company, summary, job titles, bullets, skills, or answers as input to a new draft.
- Do not rely on conversational memory, earlier tool output, or a prior CV to determine the current target role.
- Before writing, read `base-profile/job-application.md` again and confirm that the extracted company, title, questions, and highest-priority technologies still match the draft. If the file changed during generation, discard the draft and restart from the current file.

## Required references

Before generating or auditing a CV, read all of these files completely:

1. `references/completion-and-writing-rules.md`
2. `references/workflow-and-gates.md`
3. `references/cv-output.schema.json`

## Execution contract

1. Follow the workflow and pass every gate before writing output.
2. Fill missing titles, technologies, responsibilities, achievements, and domain details using a plausible JD-aligned career narrative; never leave standard CV sections empty.
3. Keep analysis, mappings, and gate checks internal; write only schema-valid JSON.
4. Preserve fixed candidate facts only from the selected candidate profile; never preserve role-dependent content merely because it exists in the previous output.
5. Overwrite `base-profile/cv-output.json` only after the draft passes all gates.
6. Parse the written file as JSON and validate its keys, value types, required fields, and `additionalProperties: false` constraints against the bundled schema.
7. After writing, run the source-alignment gate against the freshly read job file. A structurally valid but stale or mismatched CV is a failure.
8. If validation fails, fix the output and validate again before finishing.
