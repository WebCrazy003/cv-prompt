---
name: prep-question
description: Prepare a specific interview question or topic using the candidate, job, and company context.
---

# /prep-question

## Purpose

Prepare the candidate for a specific interview question or topic using the CV, JD, company research, and current interview context.

## Trigger

Examples:

`/prep-question Tell me about yourself`

`/prep-question Kubernetes`

`/prep-question Why did you leave your last job?`

## Context-Aware Behavior

### Before the live interview

Provide preparation, not just a final answer.

Return:

1. What the interviewer is testing.
2. Best real CV/project evidence to use.
3. A suggested spoken answer.
4. 2-4 likely follow-up questions.
5. Any fact/detail the candidate should confirm before the interview.

Keep it concise and practical.

### During an active live interview

Speed is more important.

If `interview_active = true`:

- do not provide a long lesson;
- immediately give the best spoken answer first;
- then, only if useful, add 1-2 likely follow-ups or one short preparation note.

If the question appears urgent, follow Emergency Mode behavior from `active_instruction_snapshot`.

## Grounding Rules

- Use `candidate_profile` and `story_bank` first.
- Use `job_profile` to prioritize relevance.
- Use `company_profile` only when it strengthens the answer.
- Never invent missing details.
- If there is no real evidence for a technology, explicitly prepare an honest adjacent-experience answer.

## Answer Style

The suggested spoken answer should follow the currently active interview instruction profile when one exists.

If no profile has been applied yet, default to:

- simple spoken English;
- 4-6 short sentences;
- first person;
- direct answer first;
- no invented facts.
