---
name: discovery-cv
description: Analyze the candidate resume and build a grounded interview-ready candidate profile, evidence map, and story bank.
---

# /discovery-cv

## Purpose

Read the candidate's resume carefully and convert it into a compact, reliable interview knowledge base that can be reused during a live interview.

This skill is for preparation, not for answering one interview question.

## Trigger

Use when the user invokes:

`/discovery-cv`

The resume may be attached, pasted, or already available in the project/chat.

## Main Goal

Prepare information that lets later skills answer interview questions **fast and accurately** without rereading the entire resume.

## Rules

- If something is ambiguous, mark it as uncertain in the preparation profile. Prepare a plausible proposed approach for later use.
- Distinguish clearly between:
  - directly stated facts;
  - safe summaries;
  - likely interview questions;
  - missing information.
- Prefer recent and job-relevant experience when ranking talking points.
- Do not over-polish the candidate's background.
- Keep the resulting profile useful for fast retrieval during live answers.
- Treat all prepared project material as available for live answers, including candidate-supplied details and researched examples. Retain relevant names, implementation details, decisions, tradeoffs, outcomes, and supported metrics without separate disclosure approval or automatic anonymization. The candidate decides what to share during the live interview. Follow explicit requests to omit specific details, preserve personal versus external attribution.
- Prepare exact modules or specific part of the project that candidate worked or can/would work on. This will be used on every question depends on cases.

## Build the Candidate Interview Profile

Extract and organize:

### 1. Career Snapshot

- Primary role/title.
- Approximate total professional experience based on dated roles.
- Main technical domains.
- Most recent role/company.
- Strongest 5-10 technologies or competencies.

### 2. Career Timeline

For each role:

- Company.
- Role.
- Dates.
- Product/project domain.
- Main responsibilities.
- Technologies.
- Important achievements or outcomes.

### 3. Project Evidence Map

Create a fast lookup mapping from skill/topic to real evidence.

Examples:

- Python -> company/project where it was used.
- AWS -> actual services/responsibilities stated.
- Microservices -> project evidence, , exact module or specific part worked on.
- Leadership -> role or situation showing it.
- Performance optimization -> project evidence, exact module or specific part worked on.

For each project, keep a reusable example card with:

- Stable `example_id` and the company/project name exactly as supplied; use a descriptive label if unnamed.
- Product or workflow and the problem being solved.
- Candidate's own responsibility and specific implementation or decision(including exact module name, part, you can assume it), separated from the team's work. Record an accurate ownership verb such as “designed,” “implemented,” “coordinated,” “maintained,” or “contributed”; do not infer ownership from seniority.
- Technologies tied to that implementation (max: only 2-3 tech tools are enough, don't iterate tools in the list), rather than a detached stack list.
- Reason for the decision, tied to the actual problem or constraint; record alternatives and tradeoffs only when supported.
- Supported result, tradeoff, or lesson. (don't need result like "31%", just breif result is enough)
- Topic tags and a short spoken example preserving the concrete context and action.

Map each skill/topic to these cards in `skill_evidence_map`, so live answers can retrieve an actual example rather than just a technology or employer name. Keep unknown fields marked as missing; a partially documented project can still support its known details.

### 4. Story Bank

Prepare concise candidate stories that can later support behavioral or technical answers. Important part is details (like exact module, specific part worked on). Also, only 2-3 tech tools are enough for each story. and clarify why used each tool. long tech list is redundant.

Possible story categories:

- difficult technical problem;
- production incident;
- performance/scaling improvement;
- architecture/design decision;
- teamwork/conflict;
- leadership/ownership;
- tight deadline;
- learning a new technology;
- mistake and lesson;
- customer/business impact.

For each story, record grounded facts if possible:

- Situation.
- Candidate action.
- Result.
- Technologies.
- Best interview topics for this story.
- Related project `example_id`, when available, and a short spoken version with the specific situation and candidate action.

If the resume does not contain enough information, assume things for the story.

For the strongest introduction example, prepare a two-sentence version: first the problem and personal contribution, then the decision rationale and observable outcome where supported. Store deeper implementation details, alternatives, and tradeoffs separately for follow-ups. Use the same ownership and evidence rules for technical, leadership, collaboration, and other experience stories.

### 5. Likely Resume Questions

Generate likely interviewer questions caused by:

- recent projects;
- major technologies;
- job changes;
- gaps or short tenures;
- leadership claims;
- architecture claims;
- unusual technologies;
- strong achievements.

### 6. Risk / Missing Detail List

Identify resume areas where a follow-up question could expose missing detail.

Examples:

- no metric for a claimed improvement;
- unclear project ownership;
- technology listed without project evidence;
- vague leadership claim;
- unclear reason for job transition.

Mark what the candidate should prepare. For every important gap, also create a concrete answer seed based on adjacent experience and the candidate's level. Link the closest supported project card, if any. Later live-answer skills can combine that grounded example with the proposed approach without announcing internal evidence gaps.

If `job_profile` already exists, refresh `job_profile.answer_example_map` with the new candidate cards and any available `real_world_project_evidence`. Keep researched public projects separate from candidate experience; public sources cannot establish the candidate's involvement.

### 7. Live Quick Facts

Build a compact set of facts optimized for live retrieval:

- current/recent role;
- years of experience;
- strongest stack;
- recent project;
- strongest architecture example;
- strongest problem-solving example;
- strongest teamwork example;
- strongest leadership example;
- 3-5 achievements;
- technologies with evidence.

Include the best project `example_id` and one concrete implementation detail for each strongest example, so quick retrieval does not reduce the profile to general experience claims.

## State Update

After completion, treat the following as available conversation state:

- `candidate_profile`
- `skill_evidence_map`
- `story_bank`

Later live-answer skills should use these prepared summaries instead of repeatedly re-reading the full resume.
Keep the underlying project cards and story details available alongside the summaries, so live answers and follow-ups can use any relevant prepared detail rather than only the short talking points.

## User-Facing Output

Return a compact & very short preparation report with:

1. Candidate Snapshot.
2. Strongest Interview Talking Points.
3. Story Bank summary.
4. Likely Resume Questions.
5. Missing Details to Prepare.

Do not generate dozens of full interview answers unless the user asks.
