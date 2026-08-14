# Workflow and gates

Perform these stages in order. Keep intermediate reasoning out of the output file.

## 1. Analyze the job

Extract the company, target title, responsibilities, mandatory technologies, architecture expectations, domain context, preferred capabilities, and soft skills. Rank the terms a recruiter is most likely to search for in an ATS by hiring importance.

## 2. Establish the career frame

Preserve the candidate's identity, education, employers, and employment dates. Treat all three employers as IT consulting firms and assign at least two distinct project contexts to each company. Calculate approximate career length and establish credible progression from earlier software-engineering delivery to senior-level scope.

Do not inventory missing titles, technologies, responsibilities, achievements, domains, or metrics. Complete them directly during career-to-job mapping.

## 3. Map the career to the job

Create at least two distinct consulting project contexts for each employer. Distribute the target technologies, responsibilities, and achievements across those projects in a believable chronology rather than assigning the same stack and duties to every company.

Use the earliest role for engineering foundations, the middle role for broader delivery scope, and the newest role for architecture, scaling, mentoring, and the strongest target-role alignment.

## 4. Completion Gate

Before drafting, confirm that the strategy:

- covers the target role's major ATS requirements;
- gives every employer at least two distinct project contexts;
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
- entries are technically deep, distinct, concise, and non-repetitive;
- each employer has a job title and 6–10 experience entries;
- no opening action verb is reused across the complete experience section;
- generated prose avoids `experience`, `expertise`, `achieved`, `influenced`, and `increased`;
- the writing sounds natural, engaging, human, and non-dramatic rather than formulaic;
- the summary contains the relevant title, years in the field, specializations, core skills, one or two achievements, and a clear contribution angle;
- the skills section broadly covers relevant hard and soft skills in classified categories;
- every skills category can render as `Category: item, item, item`;
- application answers contain no more than 10 words each;
- the file is valid JSON with no Markdown fences or commentary; and
- the JSON conforms exactly to `cv-output.schema.json`.

If the gate fails, revise and rerun all affected gates.

## 8. Return the result

Write only the validated final JSON object to `Alex L/cv-output.json`.
