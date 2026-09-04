---
name: sebastian-cv-generator-no-lk
description: Generate Sebastian Sygula's complete, strongly tailored ATS-friendly CV JSON from the no-LK candidate profile. Use when tailoring Sebastian's CV to a job description without LinkedIn-sourced candidate facts, answering application questions, auditing CV quality, or writing base-profile/cv-output.json.
---

# Sebastian CV Generator No LK

Generate a complete CV aligned closely with the target job.

## Inputs and output

Resolve paths from the repository root:

- Read candidate facts from `base-profile/candidate-profile-sebastian-no-LK.md`.
- Read the target job and application questions from `base-profile/job-application.md`.
- Write the final result to `base-profile/cv-output.json`.

Treat identity, education, employer names, and employment dates in the candidate file as fixed facts. Use the target job and professional context to complete missing career details. Never modify either input file during generation.

## Runtime source-of-truth contract

- At the start of every invocation, read `base-profile/candidate-profile-sebastian-no-LK.md` and `base-profile/job-application.md` from disk, even when their contents appeared earlier in the conversation or a previous invocation.
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
2. Create exactly one `experience` object for each employer in the candidate profile, in profile order. Put all project contexts for that employer into its single `content` array; never create separate employer objects for projects, clients, or workstreams.
3. Fill missing titles, technologies, responsibilities, achievements, and domain details using a plausible JD-aligned career narrative; never leave standard CV sections empty.
4. Keep analysis, mappings, and gate checks internal; write only schema-valid JSON.
5. Preserve fixed candidate facts only from `candidate-profile-sebastian-no-LK.md`; never preserve role-dependent content merely because it exists in the previous output.
6. Overwrite `base-profile/cv-output.json` only after the draft passes all gates.
7. Parse the written file as JSON and validate its keys, value types, required fields, and `additionalProperties: false` constraints against the bundled schema.
8. Run `python3 .codex/skills/sebastian-cv-generator-no-lk/scripts/validate_employers.py "base-profile/candidate-profile-sebastian-no-LK.md" "base-profile/cv-output.json"` and treat any missing, extra, or repeated employer as a validation failure.
9. After writing, run the source-alignment gate against the freshly read job file. A structurally valid but stale or mismatched CV is a failure.
10. If validation fails, fix the output and validate again before finishing.
