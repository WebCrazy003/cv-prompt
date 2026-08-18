# Interview Copilot Skills

Modular ChatGPT Project skills for interview preparation and real-time interview support.

## Quick Start

### 1. Prepare before the interview

Run these commands in the interview chat:

1. `/discovery-cv`
   - Read the candidate resume.
   - Build `candidate_profile`, `skill_evidence_map`, and `story_bank`.

2. `/discovery-jd`
   - Analyze the job description.
   - Research the company and relevant real-world engineering projects on the web.
   - Capture production challenges, implementations, technologies, tradeoffs, outcomes, and direct source URLs.
   - Build `job_profile`, `company_profile`, and `real_world_project_evidence`.

### 2. Start live interview mode

Run one command immediately before the live interview:

- `/apply-instruction intro`
- `/apply-instruction tech`
- `/apply-instruction cultural`

This sets `interview_active = true`, activates the selected answer style, and saves `active_instruction_snapshot` for recovery.

### 3. Continue in the same chat

Keep the live interview in the same chat so the skills can use recent context. Paste or transcribe the interviewer's words as accurately as possible. Add an `Interviewer:` label when the speaker may otherwise be ambiguous.

For a direct interviewer question, submit the question normally. Live mode returns only a candidate-ready spoken answer.

## Live Interview Commands

### `/comment`

Use after the interviewer makes a statement, explains the project, describes a challenge, or pauses for a reaction.

- Takes no parameter.
- Reads the recent topic segment, normally the latest 2-5 interviewer turns.
- Gives greatest weight to the interviewer's latest statement and tone.
- Returns only 1-3 short sentences the candidate can read aloud.
- May include one natural question when it genuinely helps the conversation.
- Adds no labels, analysis, alternatives, or setup text.

### `/follow-up-question`

Use to predict the question the interviewer is most likely to ask next.

- Takes no parameter.
- Reads the recent line of questioning, normally the latest 2-5 interviewer turns.
- Prioritizes repeated topics, deeper probes, unresolved details, and the interviewer's strongest apparent interest.
- Returns exactly one likely follow-up question.
- Does not return an answer, alternatives, probability, or explanation.

Output shape:

```text
Most likely follow-up question: [question]
```

### `/reapply-instructions`

Use when a long interview chat appears to weaken the active behavior.

- Restores the most recently applied `intro`, `tech`, or `cultural` profile.
- Preserves accumulated interview context and used stories.
- Does not switch profiles or restart the interview.

### `/status`

Use for a compact diagnostic view of the active profile and loaded context.

- Shows the current topic, interviewer signals, available stories, and important missing details.
- Does not change state or generate an interview answer.
- Its output is for the candidate, not something to read to the interviewer.

## Live Answer Behavior

For each direct interviewer question, the assistant internally performs:

`Detect intent -> Detect Normal/Emergency mode -> Retrieve relevant prepared context -> Generate spoken answer`

Do not show this internal workflow. During a live interview, prioritize:

1. Speed.
2. A complete, usable answer.
3. Relevance to the question and role.
4. Plausibility.
5. Simple, natural spoken English.
6. Additional detail only when helpful.

Use real candidate evidence when available. Use `real_world_project_evidence` to add realistic technical challenges, implementation patterns, technologies, and tradeoffs. External evidence must supplement candidate facts: never present another organization's project as the candidate's work or as a verified target-company project.

When direct candidate evidence is missing, construct a plausible answer from adjacent experience, the JD, normal role practices, and the closest sourced real-world patterns. Keep source URLs available internally for traceability, but do not include them in a spoken live answer unless the user asks for sources. Never interrupt the response with evidence-gap or generation disclaimers. Avoid unsupported precise names, dates, metrics, or credentials.

Do not browse or perform long analysis during a live response unless the user explicitly requests current external information. Complete company research with `/discovery-jd` before the interview.

## Shared State

Skills reuse these conceptual state objects when available:

- `candidate_profile`
- `job_profile`
- `company_profile`
- `story_bank`
- `skill_evidence_map`
- `real_world_project_evidence`
- `active_instruction_profile`
- `active_instruction_snapshot`
- `interview_active`
- `current_topic`
- `interviewer_signals`
- `used_stories`

These do not need to be literal JSON objects. They describe context that should remain available throughout the same interview chat.
