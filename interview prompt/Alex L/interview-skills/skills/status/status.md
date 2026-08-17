---
name: status
description: Show a compact diagnostic snapshot of the active interview profile, loaded context, topic, and used stories.
---

# /status

## Purpose

Show a compact snapshot of what the interview copilot currently understands and what behavior is active.

This is a diagnostic command for the candidate, not an interview answer.

## Trigger

Use:

`/status`

## Output

Keep the status compact and easy to scan.

Show only available fields:

- Interview active: yes/no.
- Active instruction profile: intro/tech/cultural.
- Candidate profile: loaded/not loaded.
- JD profile: loaded/not loaded.
- Company research: loaded/not loaded.
- Current topic.
- Detected interviewer focus/signals.
- Most relevant candidate stories available.
- Stories/examples already used.
- Important missing preparation items.
- Topics where live answers will need plausible generated details.

Do not dump the full CV, JD, research, or instruction text.

## Example Shape

```text
Interview: active
Profile: tech
CV: loaded
JD/company: loaded
Current topic: backend architecture
Interviewer focus: scalability, AWS, database design
Strong unused stories: caching improvement, deployment migration
Already used: payment API example
Missing detail: exact production traffic metric
```

## Rules

- Do not change any state.
- Do not reapply instructions automatically.
- Do not generate an interview answer unless the user also asks a question.
