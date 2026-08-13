# Workflow and gates

Perform these stages in order. Keep intermediate reasoning out of the output file.

## 1. Analyze the job

Extract the target company, title, responsibilities, required capabilities, preferred capabilities, domain context, and ATS terms. Rank requirements by importance and distinguish mandatory requirements from preferences.

## 2. Analyze the candidate

Build a fact inventory covering identity, education, dates, employers, titles, projects, technologies, responsibilities, achievements, scope, domains, and metrics. Mark missing fields explicitly in the internal inventory.

## 3. Map candidate evidence to the job

For every important job requirement, classify the match as:

- supported;
- reasonably inferable under the evidence policy; or
- unsupported.

Use only the first two classes in the CV.

## 4. Evidence Gate

Inspect every factual claim in the proposed content.

Pass only if:

- every claim is explicitly supported or conservatively inferable;
- no job requirement has been transformed into candidate history;
- no technology, domain, title, achievement, metric, or responsibility was invented; and
- uncertainty is represented by omission, `null`, or an empty array.

If the gate fails, remove or weaken the offending claim and rerun the gate.

## 5. Build the CV strategy

Prioritize the strongest supported matches, choose a concise positioning angle, and decide section ordering. Allow genuine gaps to remain visible rather than disguising them.

## 6. Generate the draft

Populate every required schema field. Retain exact identity, education, employer, and date facts. Use `null` or empty arrays where permitted and evidence is absent.

## 7. Relevance Gate

Pass only if:

- the summary and ordering address this specific job;
- supported high-priority matches appear before lower-value content;
- unrelated material is removed or de-emphasized;
- ATS terminology is used only where truthful; and
- the CV does not merely echo the job description.

If the gate fails, revise the strategy and draft, then rerun it.

## 8. Quality Gate

Pass only if:

- the content is readable by recruiters and ATS systems;
- technical claims are credible and internally consistent;
- dates and names match the runtime files;
- phrasing is natural, concise, non-repetitive, and free of AI-style filler;
- experience entries are distinct rather than paraphrases of one another;
- application answers contain no more than 10 words each;
- the document is valid JSON with no Markdown fences or commentary; and
- the JSON conforms exactly to `cv-output.schema.json`.

If the gate fails, revise and rerun all affected gates.

## 9. Return the result

Write only the validated final JSON object to `Alex L/cv-output.json`.
