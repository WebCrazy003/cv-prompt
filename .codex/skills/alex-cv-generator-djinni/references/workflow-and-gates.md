# Workflow and gates

Keep intermediate reasoning out of the output file.

## 0. Runtime source gate

Read `base-profile/candidate-profile-djinni.md` and `base-profile/job-application.md` directly from disk. Do not inspect or reuse `base-profile/cv-output.json` as drafting input.

Record internally:

- an immutable candidate-fact set containing every supplied identity, education, employer, date, technology, career, accomplishment, and leadership claim;
- an authorized related-technology set derived from the supplied technology anchors and the rules in `tailoring-and-writing-rules.md`;
- fields explicitly marked `Not supplied`;
- a current-job anchor set containing the company, title, questions, mandatory skills, secondary skills, responsibilities, domain, seniority, and leadership expectations; and
- unsupported JD terms remaining after related-technology inference that must not be attributed to the candidate.

Stop without overwriting output if the job description is empty or unreadable.

## 1. Analyze the job

Rank mandatory and secondary requirements by hiring importance. Determine the intended CV title, summary emphasis, skill order, relevant career evidence, leadership emphasis, and appropriate AI prominence.

## 2. Map truth to the job

Map only supported Djinni facts, authorized related technologies, and conservative permitted completions to the ranked requirements. Build a coherent progression across the three consulting employers without inventing clients, named projects, unsupported technologies, achievements, or metrics.

Plan 6–8 bullets for XB Software, 5–7 for Selleo Labs, and 4–5 for Gecko Dynamics. Give recent work the strongest relevance.

## 3. Truth gate

Pass only if:

- every factual claim is supplied by the Djinni profile, authorized by the related-technology rules, or is a conservative completion of a field explicitly marked `Not supplied`;
- no supplied employer, date, education item, technology, achievement, career-duration claim, or leadership claim was altered;
- no JD requirement was converted into a candidate fact unless the profile, related-technology rules, or a conservative completion supports it;
- no invented client, product, certification, project name, metric, scale figure, or unsupported technology appears;
- every inferred technology belongs to an authorized family, is relevant to the current JD, and carries no invented duration, version, proficiency, client, project, metric, or achievement; and
- all completions are mutually consistent and plausible within the supplied career frame.

## 4. Generate the draft

Populate every required schema field. Tailor the target title, summary, bullets, skill ordering, and application answers. Keep the employer order and dates from the Djinni profile.

## 5. Relevance gate

Pass only if:

- the summary immediately positions the candidate for the current job;
- mandatory truthful skills appear before secondary skills;
- recent employment contains the strongest relevant evidence;
- leadership and AI emphasis match the role;
- irrelevant skills and bullets are omitted;
- exact JD wording is used where truthful; and
- target company and target title match the current job file.

## 6. Quality and schema gate

Pass only if:

- bullets are distinct, concise, action-led, and follow `Action + Problem + Technology/Approach + Outcome` where the source supports each element;
- metrics appear only when supplied by the Djinni profile;
- the CV is consistent, readable, natural, and ATS-friendly;
- skill categories render naturally as `Category: item, item, item`;
- application answers reproduce each supplied question exactly once and contain no more than 10 words;
- the employer-specific bullet counts are respected; and
- the document is plain valid JSON conforming exactly to `cv-output.schema.json`.

## 7. Pre-write freshness gate

Read `base-profile/job-application.md` again and rebuild the current-job anchor set. If the company, title, questions, or mandatory stack changed, discard the draft and restart at stage 0.

## 8. Write and final audit

Write only the validated JSON object to `base-profile/cv-output.json`. Parse it, validate it against the schema, and compare every factual claim with the freshly read Djinni profile plus the authorized related-technology set. Confirm the final CV and JD are consistent without treating the JD by itself as evidence about the candidate.
