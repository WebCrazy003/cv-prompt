---
name: alex-cv-generator-djinni
description: Generate Alex Latoszek's job-tailored, ATS-friendly CV JSON using his Djinni profile as the stable base truth. Use when tailoring Alex's CV to a job description, answering application questions, auditing profile-to-CV consistency, or writing Alex L/cv-output.json from Alex L/candidate-profile-djinni.md.
---

# Alex CV Generator — Djinni

Create a job-specific presentation of the candidate's Djinni profile. Tailor emphasis, not facts.

## Inputs and output

Resolve paths from the repository root:

- Read stable candidate facts from `Alex L/candidate-profile-djinni.md`.
- Read the target job and application questions from `Alex L/job-application.md`.
- Write the final result to `Alex L/cv-output.json`.

Never modify either input file during generation. Treat the output as a replaceable build artifact, not as a source.

## Source-of-truth contract

- At every invocation, read both input files directly from disk, even if their contents appeared earlier in the conversation.
- The Djinni profile is authoritative for identity, education, employers, dates, career length, technologies, projects, achievements, and leadership history that it supplies.
- Treat a supplied technology as an experience-family anchor, not an exhaustive inventory. Apply the related-technology inference rules in `references/tailoring-and-writing-rules.md` before classifying a JD technology as unsupported.
- The job file is authoritative only for the target company, target title, hiring criteria, responsibilities, domain language, and application questions.
- Never use the JD to rewrite, contradict, or fabricate a supplied candidate fact.
- A field explicitly marked `Not supplied` is not a fact. Complete it only when the profile permits completion and the result is a plausible, internally consistent presentation of the supplied career frame. Do not present invented clients, project names, certifications, metrics, or unsupported technologies as fact.
- Never infer a missing detail when doing so would conflict with the Djinni profile. Apart from permitted related-technology inference and conservative completion of `Not supplied` fields, omit unsupported detail when the output schema allows it.
- Never use role-dependent content from an earlier `cv-output.json` in a new draft.

## Required references

Before generating or auditing a CV, read all of these files completely:

1. `references/tailoring-and-writing-rules.md`
2. `references/workflow-and-gates.md`
3. `references/cv-output.schema.json`

## Execution contract

1. Analyze the JD before drafting and follow the workflow through every gate.
2. Match the CV title and emphasis to the JD without changing the underlying career facts.
3. Keep analysis, mappings, and gate checks internal; write only schema-valid JSON.
4. Re-read the job file before writing. If its company, title, questions, or mandatory stack changed, discard the draft and restart.
5. Overwrite `Alex L/cv-output.json` only after the draft passes all gates.
6. Parse the written JSON and validate its keys, types, required fields, bullet counts, and `additionalProperties: false` constraints against the bundled schema.
7. Run the final Djinni-profile consistency and current-job alignment checks against the written file. Fix and revalidate any failure before finishing.
