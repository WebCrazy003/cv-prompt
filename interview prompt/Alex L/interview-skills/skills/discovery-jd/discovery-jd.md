---
name: discovery-jd
description: Analyze the job description, research the company and comparable real-world engineering projects with source URLs, compare the role with the candidate profile, and prepare reusable evidence for interview answers.
---

# /discovery-jd

## Purpose

Read the job description deeply, research the company/project and relevant real-world engineering examples, compare the opportunity with the candidate profile, and prepare a reusable interview profile.

## Trigger

Use when the user invokes:

`/discovery-jd`

The job description may be pasted, attached, linked, or already available in the chat/project.

## Main Goal

Finish expensive research **before** the live interview so later answers can be generated ASAP.

## Required Behavior

- Read the complete JD carefully.
- Use the existing `candidate_profile` when available.
- Use web search to research the company, product, project, and relevant recent information.
- Search for real production projects, technical challenges, implementations, technology choices, tradeoffs, and outcomes related to the role.
- Prefer official company sources, engineering blogs, product documentation, public repositories, conference talks, vendor case studies, postmortems, and other reliable technical sources.
- Open and inspect the actual source page; do not treat a search-result snippet as evidence.
- Store a direct source URL for every retained external fact or real-world example.
- Separate verified facts from inference.
- Do not invent project details that are not public or supplied by the user.
- Focus research on information that can improve interview answers.
- Gather relevant human interview answers and first-person explanations as reusable speaking material, preserving their natural wording and thought order where permitted and compatible with candidate facts.

## Analyze the Job Description

Extract:

### 1. Role Summary

- Role title.
- Seniority.
- Main responsibilities.
- Product/domain.
- Expected ownership level.
- Team or stakeholder expectations.

### 2. Skill Priority

Classify requirements as:

- Must-have.
- Strong preference.
- Nice-to-have.
- Cultural/behavioral.

For each skill, note how strongly the JD emphasizes it.

### 3. Candidate Match

Compare each important JD requirement against `candidate_profile` and `skill_evidence_map`.

Classify:

- Strong match.
- Partial match.
- No clear evidence.
- Candidate should prepare explanation.

For matches, record the best real CV/project evidence to mention.

For partial matches or missing evidence, prepare a concrete answer strategy using adjacent experience, the role context, and researched examples. Distinguish supported personal experience from an external comparison or a proposed “I would…” approach. Prepare a usable answer without inventing candidate involvement.

### 4. Company / Project Research

Research interview-useful facts such as:

- what the company does;
- main product/services;
- customers/market;
- company size or stage when reliably available;
- engineering/product direction;
- relevant technology information;
- recent product/company developments;
- project context implied by the JD;
- values/culture when supported by official material.

Do not collect trivia that is unlikely to help the interview.

### 5. Real-World Project Evidence

Build `real_world_project_evidence` before generating likely questions or interview positioning.

Derive 3-6 research themes from the JD's most important technologies, responsibilities, product domain, and likely engineering constraints. Search for concrete production examples related to those themes.

Look for named projects, products, or websites in the same industry **or** using a similar relevant stack. A project does not need to match both. Research comparable organizations even when target-company material is available, so the interview has useful outside examples. Aim to include at least one same-industry example and one similar-stack example when reliable sources exist; one project may satisfy both.

Combine company, domain, and technology terms in targeted searches such as:

- `[company] engineering architecture technology stack`;
- `[company] scaling migration security reliability case study`;
- `[company] AWS Azure GCP customer story`;
- `[company] engineering conference talk GitHub`;
- `[domain] production architecture [technology]`;
- `[industry] [product or workflow] engineering case study`;
- `[technology] production [project or website] architecture`;
- `[technology] migration postmortem performance incident`.

Vary and narrow the queries based on discovered terminology. When company-specific results are weak, search the same problem and stack across comparable organizations.

Use this source priority:

1. Target-company engineering blogs, documentation, public repositories, talks, and technical job posts.
2. Cloud, platform, or technology-vendor case studies that identify the target company.
3. Conference presentations, postmortems, and detailed engineering case studies.
4. Engineering publications from comparable companies in the same domain or stack.
5. Credible open-source documentation, issues, and implementation reports.
6. Community sources only for discovery or when stronger evidence is unavailable.

For every retained example, record:

- Stable `example_id` for fast lookup and follow-up reuse.
- `evidence_type`: `target-company-verified` or `comparable-real-world`;
- project/system and organization;
- product/site URL when available, separate from the technical evidence's `source_url`;
- `match_basis`: same industry, similar stack, similar engineering problem, or a combination; explain the specific overlap;
- source title, publisher, publication/update date when available, and direct `source_url`;
- problem or technical challenge;
- what was implemented or changed;
- technologies and architecture used;
- constraints, decisions, and tradeoffs;
- result or outcome, including metrics only when explicitly sourced;
- relevance to the JD and likely interview questions;
- confidence based on source quality and specificity.
- A 1-2 sentence `spoken_example` naming the project, describing a sourced implementation detail, and connecting it to an interview topic with explicit external attribution.
- `follow_up_facts`: supported details for likely “how?”, “why?”, and “what happened?” questions; mark what the source does not establish.

Apply these evidence rules:

- Keep approximately 3-7 strong, JD-relevant examples instead of a large unfiltered list.
- Do not retain an example without a working direct source URL.
- Prefer sources that describe `problem -> action -> technology -> tradeoff -> outcome`.
- Never present a comparable-company example as work performed by the target company.
- Never combine details from several sources into a fictional single project. If synthesizing, preserve every supporting URL and label the result as synthesis.
- If no reliable target-company technical evidence is public, state that clearly and use labeled comparable examples.
- Exclude generic SEO summaries, unsourced claims, and AI-generated articles when primary or technically credible sources are available.
- A website's industry can be clear from its product page, but its stack or architecture requires technical evidence. Do not infer private implementation details from the site's appearance.
- If browsing or reliable sources are unavailable, record the research limitation in preparation and retain only available supported examples; do not manufacture entries to meet the target count.

### 5a. Human Interview Answer Materials

Build `job_profile.human_answer_materials` before composing answer seeds. Use the JD's highest-priority topics and likely interview intent to gather a small set of useful human answers, not generic advice about how to interview. Aim for 3-5 strong materials when available; do not fill the collection with weak examples to reach a count.

Start with candidate-supplied past answers, interview transcripts, voice-note transcripts, or writing already available in the conversation. Then search for public interview transcripts, recorded interviews with accessible transcripts, engineer Q&A, and first-person explanations of relevant work. Prefer identifiable speakers or authors and original sources. Clearly distinguish an actual interview answer from a first-person project explanation or a published illustrative answer. Do not claim verified human authorship when the source does not establish it; exclude anonymous answer banks, generic SEO templates, and material identified as AI-generated.

Search using the role's actual topics, for example:

- `[role] interview transcript [topic]`;
- `[technology] engineer interview [problem]`;
- `[company or domain] engineer Q&A [responsibility]`.

Open the original source and inspect the answer in context. For technical claims, rely on primary sources and cross-check against the prepared technical evidence when needed. These materials supplement project research; they do not establish candidate experience or target-company facts.

For each retained material, record:

- Stable `material_id`.
- Source type: candidate-supplied answer, public interview, first-person explanation, or authored illustrative answer.
- Speaker/author, source title, direct `source_url` and date when available; for candidate-supplied material, retain its file or conversation reference instead of inventing a URL.
- Original question or topic, relevant JD skills, and matching interview intent (`intro`, `tech`, or `cultural`).
- A permitted `original_excerpt`, kept verbatim, separate from any paraphrase. Record whether the material is user-supplied, licensed for reuse, public domain, or subject to limited quotation; keep excerpts within applicable source limits and track cumulative use across materials from the same source. Do not store a complete copyrighted answer merely because it is publicly accessible.
- `structure_notes`: the original order of ideas, sentence rhythm, transitions, and where concrete details appear. Describe these in your own words.
- `reusable_phrasing`: short permitted phrases worth retaining, counted with the original excerpt toward the same source's quotation limit.
- `source_specific_facts`: the speaker's employers, projects, ownership, tools, results, and other claims that must not become candidate facts.
- `candidate_evidence_refs`: matching supported candidate facts or example IDs, if any.
- `adapted_answer_seed`: an answer to the matching question using supported candidate evidence or a clearly proposed approach, with external facts attributed when used.
- `adaptation_notes`: what changed for factual fit, relevance, requested depth, or reuse limits; mark unsupported details as unusable for personal claims.

Preserve the source's useful structure, ordinary wording, and transitions as much as factual fit and reuse permissions allow. Candidate-supplied answers may be retained closely; do not polish them into a uniform template. For external copyrighted material, use only permitted short excerpts and otherwise write original wording informed by high-level structure. Do not make a near-verbatim reconstruction by swapping synonyms or joining excerpts. Where no reusable wording is available, keep the structural observations and clearly label the seed as an original adaptation.

Never convert another person's story into the candidate's own story by replacing names or tools. Candidate facts and accurate attribution take priority over matching the source. Preserve varied structures across materials rather than forcing all of them into STAR or problem/action/tools. Keep intro seeds direct and follow-up seeds brief; expand only when the question calls for a story.

If suitable material or browsing is unavailable, record the limitation and use available candidate-supplied material or existing grounded answer seeds. Do not invent a human source, transcript, or quotation.

### 5b. Answer Example Lookup

Build `job_profile.answer_example_map` from `skill_evidence_map`, `story_bank`, and `real_world_project_evidence`. For each high-priority JD topic and likely question, store:

- Best candidate `example_id`, if supported.
- Best external `example_id`, if relevant, and why it fits.
- Best `material_id` from `job_profile.human_answer_materials`, when relevant, and the permitted phrasing or thought order to retain in the answer seed. A human material is optional; do not force a weak match.
- A concise general experience statement or technical principle supported by the candidate profile or framed as an approach.
- An answer seed combining that statement with a concrete problem, specific contribution or decision, reasoning tied to the constraint, and a supported observable result or tradeoff when known.
- Attribution to use aloud: personal work, named public example, or proposed application.
- For personal examples, the candidate's exact ownership scope and supported details, preserved from the candidate cards. Keep team achievements separate from individual contributions.
- A brief version for the initial answer and supported deeper details for follow-ups. Keep introductions direct without a mandatory situation setup or two-sentence example.

When a matching human material exists, use its `adapted_answer_seed` to shape the generated answer seed. Preserve useful permitted wording and structure instead of automatically rewriting it into polished CV language. Adjust only as needed for the exact question, candidate evidence, attribution, length, and reuse limits. Human material guides expression; candidate and project evidence establish facts.

Prepare both the general explanation and the concrete example; a list of links or generic advice alone is not interview-ready. Preserve the researched project name and useful details in external answer seeds. Use wording such as “A relevant public example is [project]…” and “For your use case, I would…”, without claiming the candidate worked on it.

For claims about preferences, strengths, leadership, or problem-solving, map the claimed benefit to a specific situation where it mattered. A generic list of advantages is insufficient when a relevant example exists. Keep published external outcomes attributed to their source; they cannot establish a candidate outcome. All retained project material is available for live use: candidate examples, target-company research, and comparable public projects, including names, implementation details, decisions, tradeoffs, outcomes, and supported metrics. Do not filter these details for possible sensitivity, require separate disclosure approval, or automatically anonymize them. The candidate decides what to share during the live interview; follow explicit requests to omit specific details. Do not invent results to complete an answer seed.

If candidate discovery has not run yet, build the external mappings now and add personal examples when `/discovery-cv` runs. Keep missing coverage visible in preparation rather than silently filling it with invented projects.

### 6. Interviewer Intent Prediction

Predict the most likely interview focus areas:

- introduction/background;
- architecture/system design;
- language/framework knowledge;
- databases;
- cloud/devops;
- debugging/performance;
- domain knowledge;
- teamwork/communication;
- leadership/ownership;
- culture/values.

Rank them high/medium/low probability.

### 7. Likely Questions

Generate a targeted list of likely questions based on:

- JD requirements;
- candidate match/gaps;
- company/project context;
- `real_world_project_evidence` challenges, technology choices, and tradeoffs;
- seniority.

Prefer specific questions over generic interview lists.

### 8. Candidate Positioning

Prepare concise guidance for what the candidate should emphasize:

- top 3-5 experiences to mention;
- technologies to highlight;
- stories most relevant to this role;
- gaps to address carefully;
- reasons this role is a logical fit.

### 9. Questions for the Interviewer

Prepare thoughtful questions likely to be useful to the interviewer and candidate.

Favor questions about:

- current project challenges;
- architecture;
- team ownership;
- expectations in first months;
- engineering process;
- roadmap;
- success criteria.

Avoid questions easily answered on the company homepage.

## State Update

After completion, treat these as available conversation state:

- `job_profile`
- `company_profile`
- `real_world_project_evidence`

Update `story_bank` relevance rankings against the current job.
Keep `answer_example_map` and `human_answer_materials` inside `job_profile`; refresh their relevance and links when the target JD changes so live answers use the current role's examples. Retain source references, reuse limits, original excerpts, and adaptation notes with the materials.
Link answer seeds to the full retained project evidence and `follow_up_facts`. The spoken summaries are starting points, not limits on which prepared details live answers may use.

## User-Facing Output

Return a concise report:

1. What this job really needs.
2. Your strongest matches.
3. Gaps / points to prepare.
4. Company/project interview facts.
5. Real-world project evidence, including named project/site, industry or stack match, challenge, implementation, technologies, supported outcome, evidence type, direct source URL, and a short example of how to mention it aloud.
6. Most likely interview areas.
7. Top likely questions.
8. Good questions to ask them.
9. Human answer materials: a concise list of retained sources, matching questions, and one brief adapted answer demonstrating the wording or structure to reuse. Identify adaptations clearly and keep detailed excerpts and notes in preparation state.

Keep detailed research available in context, but do not overwhelm the visible answer. Make every displayed source URL clickable when the interface supports links.
