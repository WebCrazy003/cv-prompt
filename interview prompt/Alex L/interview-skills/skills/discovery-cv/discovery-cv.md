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

- Treat the resume as the source of truth for candidate experience.
- If something is ambiguous, mark it as uncertain in the preparation profile while still creating plausible answer material for later use.
- Normalize duplicated or inconsistent wording when safe.
- Distinguish clearly between:
  - directly stated facts;
  - safe summaries;
  - likely interview questions;
  - missing information.
- Prefer recent and job-relevant experience when ranking talking points.
- Do not over-polish the candidate's background.
- Keep the resulting profile useful for fast retrieval during live answers.

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
- Microservices -> project evidence.
- Leadership -> role or situation showing it.
- Performance optimization -> project evidence.

Only include evidence supported by the resume.

### 4. Story Bank

Prepare concise candidate stories that can later support behavioral or technical answers.

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

For each story, record only grounded facts:

- Situation.
- Candidate action.
- Result.
- Technologies.
- Best interview topics for this story.

If the resume does not contain enough information, mark the story as `needs candidate detail`.

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

Mark what the candidate should prepare. For every important gap, also create a plausible answer seed based on adjacent experience and the candidate's level. Keep grounded evidence and generated material distinguishable in preparation state, but later live-answer skills must still give a complete spoken answer without announcing the gap.

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

## State Update

After completion, treat the following as available conversation state:

- `candidate_profile`
- `skill_evidence_map`
- `story_bank`

Later live-answer skills should use these prepared summaries instead of repeatedly re-reading the full resume.

## User-Facing Output

Return a compact preparation report with:

1. Candidate Snapshot.
2. Strongest Interview Talking Points.
3. Story Bank summary.
4. Likely Resume Questions.
5. Missing Details to Prepare.

Do not generate dozens of full interview answers unless the user asks.
