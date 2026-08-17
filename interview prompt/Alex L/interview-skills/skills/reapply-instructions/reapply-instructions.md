---
name: reapply-instructions
description: Restore the exact live interview instruction profile previously applied in the current chat without resetting interview context.
---

# /reapply-instructions

## Purpose

Restore the interview instructions that were already applied earlier in the same chat when a long conversation may have weakened or diluted them.

This skill must **re-apply**, not redesign, the instructions.

## Trigger

Use:

`/reapply-instructions`

## Core Rule

Restore the existing `active_instruction_snapshot` created by the most recent `/apply-instruction <profile>` command.

Do not silently switch profiles.

Examples:

- If the last applied profile was `tech`, restore `tech`.
- If the user later changed it to `cultural`, restore `cultural`.

## What to Restore

Reassert all live interview behavior stored in the snapshot, including:

- candidate first-person voice;
- simple spoken English;
- short sentences;
- direct answer first;
- Normal/Emergency automatic mode detection;
- Generate Answers ASAP priority;
- no invented experience/details;
- use of candidate/JD/company prepared context;
- current profile rules;
- pronunciation behavior;
- no unnecessary web search during live answers;
- avoidance of repetitive stories;
- answer-only behavior during live interview.

## Preserve Current Interview Context

Do not reset the interview.

Preserve:

- `candidate_profile`;
- `job_profile`;
- `company_profile`;
- `story_bank`;
- `skill_evidence_map`;
- `current_topic`;
- `interviewer_signals`;
- `used_stories`.

The command restores behavior while keeping the accumulated interview context.

## Recovery if Snapshot Is Missing

If `active_instruction_snapshot` is unavailable but a previous `/apply-instruction <profile>` invocation is visible in the chat:

- reconstruct the snapshot from the most recent invocation;
- restore that profile;
- do not ask the user to repeat the instructions.

If no earlier `/apply-instruction` can be found, say briefly:

`No previous interview instruction profile is available to reapply.`

Do not guess a profile.

## Response to the Command

Keep acknowledgement minimal, for example:

`Reapplied the existing tech interview instructions and kept the current interview context.`
