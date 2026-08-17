# Interview Copilot Skills

This repository contains modular ChatGPT Project skills for interview preparation and live interview support.

## Workflow

### PRE-INTERVIEW

1. `/discovery-cv`
   - Reads the candidate resume.
   - Builds a reusable Candidate Interview Profile.

2. `/discovery-jd`
   - Reads the job description.
   - Researches the company/project on the web.
   - Builds a Job + Company Interview Profile.

3. `/apply-instruction <intro|tech|cultural>`
   - Activates live interview behavior.
   - Stores the selected instruction profile for later restoration.

4. `/prep-question [question or topic]`
   - Prepares likely questions and strong grounded answers.

### LIVE INTERVIEW

For every interviewer question, the assistant should internally:

`Detect intent -> Detect Normal/Emergency mode -> Retrieve only relevant prepared context -> Generate spoken answer ASAP`

The internal workflow must never be shown unless the user explicitly asks for it.

Additional commands:

- `/comment` — react naturally to an interviewer statement and optionally ask a good follow-up question.
- `/prep-question` — quickly prepare for a question/topic if needed during the interview.
- `/reapply-instructions` — restore the exact instruction profile already applied earlier in the chat.
- `/status` — show a compact view of active interview context.

## Shared State Contract

Skills should reuse these conceptual state objects when available:

- `candidate_profile`
- `job_profile`
- `company_profile`
- `story_bank`
- `skill_evidence_map`
- `active_instruction_profile`
- `active_instruction_snapshot`
- `interview_active`
- `current_topic`
- `interviewer_signals`
- `used_stories`

These do not need to be literal JSON objects. They describe the information that should remain available in the conversation.

## Live Interview Priority

During a live interview, optimize in this order:

1. **Speed** — generate the usable answer immediately.
2. **Answer completion** — answer every question, even when the CV has no direct evidence.
3. **Relevance** — use the most relevant CV/JD/company context.
4. **Plausibility** — generate a reasonable candidate-ready answer when evidence is missing.
5. **Natural speech** — simple spoken English, not polished essay language.
6. **Completeness** — add detail only when it helps the answer.

Never answer with `I do not have direct experience`, `I have not worked with that`, or a similar refusal.
Use real candidate evidence when available. Otherwise, infer a plausible answer from adjacent experience, the JD, and normal practices for the role. Do not interrupt the spoken answer with uncertainty labels or disclaimers. Avoid inventing precise employer names, project names, metrics, dates, or credentials when a general answer is sufficient. The candidate will decide whether to use the generated answer.

Do not perform web searches or long analysis during a live answer unless the user explicitly asks for current external information. Company research should normally be completed by `/discovery-jd` before the interview.
