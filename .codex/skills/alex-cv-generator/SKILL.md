---
name: alex-cv-generator
description: Generate or revise Alex Latoszek's complete, ATS-friendly CV JSON from sparse repository runtime files. Use when tailoring Alex's CV to a job description, completing missing CV sections conservatively, answering application questions, auditing CV claims, or writing Alex L/cv-output.json.
---

# Alex CV Generator

Generate a complete tailored CV without converting job requirements into candidate claims.

## Inputs and output

Resolve paths from the repository root:

- Read candidate facts from `Alex L/candidate-profile.md`.
- Read the target job and application questions from `Alex L/job-application.md`.
- Write the final result to `Alex L/cv-output.json`.

Treat the two runtime files as the only sources of candidate and job facts unless the user explicitly supplies additional evidence. Never modify either input file during generation.

## Required references

Before generating or auditing a CV, read all of these files completely:

1. `references/evidence-and-writing-rules.md`
2. `references/workflow-and-gates.md`
3. `references/cv-output.schema.json`

## Execution contract

1. Follow the workflow and pass every gate before writing output.
2. Apply sparse-profile completion rules when direct evidence is insufficient; never leave the summary, job titles, experience content, or skills empty.
3. Keep analysis, mappings, and gate checks internal; write only schema-valid JSON.
4. Preserve valid candidate facts already present in the output unless the runtime inputs supersede them.
5. Overwrite `Alex L/cv-output.json` only after the draft passes all gates.
6. Parse the written file as JSON and validate its keys, value types, required fields, and `additionalProperties: false` constraints against the bundled schema.
7. If validation fails, fix the output and validate again before finishing.
