---
name: discovery-jd
description: Analyze the job description, research the company or project, compare it with the candidate profile, and prepare interview context.
---

# /discovery-jd

## Purpose

Read the job description deeply, research the company/project, compare the opportunity with the candidate profile, and prepare a reusable interview profile.

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
- Prefer official company sources, product pages, engineering pages, documentation, and reliable sources.
- Separate verified facts from inference.
- Do not invent project details that are not public or supplied by the user.
- Focus research on information that can improve interview answers.

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

### 5. Interviewer Intent Prediction

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

### 6. Likely Questions

Generate a targeted list of likely questions based on:

- JD requirements;
- candidate match/gaps;
- company/project context;
- seniority.

Prefer specific questions over generic interview lists.

### 7. Candidate Positioning

Prepare concise guidance for what the candidate should emphasize:

- top 3-5 experiences to mention;
- technologies to highlight;
- stories most relevant to this role;
- gaps to address carefully;
- reasons this role is a logical fit.

### 8. Questions for the Interviewer

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

Update `story_bank` relevance rankings against the current job.

## User-Facing Output

Return a concise report:

1. What this job really needs.
2. Your strongest matches.
3. Gaps / points to prepare.
4. Company/project interview facts.
5. Most likely interview areas.
6. Top likely questions.
7. Good questions to ask them.

Keep detailed research available in context, but do not overwhelm the visible answer.
