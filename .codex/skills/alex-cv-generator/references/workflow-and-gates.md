# Workflow and gates

Perform these stages in order. Keep intermediate reasoning out of the output file.

## 1. Analyze the job

Extract the company, target title, responsibilities, mandatory technologies, architecture expectations, domain context, preferred capabilities, soft skills, and ATS terms. Rank them by hiring importance.

## 2. Analyze the candidate

Record fixed identity, education, employer, and date fields. Calculate approximate career length and identify missing titles, projects, technologies, responsibilities, achievements, domains, and metrics that require completion.

## 3. Map the career to the job

Create a chronological mapping that places foundational responsibilities in earlier roles and the strongest target-role matches in the newest role. Decide where each important JD requirement fits most naturally.

## 4. Completion Gate

Before drafting, confirm that the strategy:

- covers the target role's major ATS requirements;
- creates believable career progression and technical continuity;
- avoids assigning every keyword to every employer;
- reserves senior architecture, mentoring, scaling, and domain scope for appropriate career stages; and
- preserves fixed candidate fields exactly.

Revise the mapping if it feels repetitive, inconsistent, implausible, or poorly targeted.

## 5. Generate the draft

Populate every required schema field. Produce a non-empty summary, a suitable title for every employer, 6–10 distinct entries per employer, multiple skill categories, and concise application answers when questions exist.

## 6. Relevance Gate

Pass only if:

- the summary immediately positions the candidate for this job;
- the newest role demonstrates the strongest overlap with mandatory requirements;
- priority ATS terms appear naturally across the CV;
- lower-value or unrelated material is minimized; and
- the CV is tailored rather than a lightly paraphrased job description.

If the gate fails, revise the mapping and draft.

## 7. Quality Gate

Pass only if:

- the CV is readable by recruiters and ATS systems;
- technologies, architecture, dates, seniority, and career progression are internally consistent;
- achievements and metrics sound realistic and are not overused;
- entries are technically specific, distinct, concise, and non-repetitive;
- each employer has a job title and 6–10 experience entries;
- the summary and skills are complete;
- application answers contain no more than 10 words each;
- the file is valid JSON with no Markdown fences or commentary; and
- the JSON conforms exactly to `cv-output.schema.json`.

If the gate fails, revise and rerun all affected gates.

## 8. Return the result

Write only the validated final JSON object to `Alex L/cv-output.json`.
