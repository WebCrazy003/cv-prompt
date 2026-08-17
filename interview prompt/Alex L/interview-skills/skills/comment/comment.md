---
name: comment
description: Generate a brief natural reaction and optional follow-up question from an interviewer statement.
---

# /comment

## Purpose

Help the candidate respond naturally when the interviewer makes a statement, explains the project, shares a challenge, or pauses for the candidate's reaction.

The goal is to sound engaged, relevant, and conversational without over-talking.

## Trigger

Use when the user invokes `/comment` together with, or immediately after, the interviewer's statement.

Examples of interviewer statements:

- `We are currently migrating from a monolith to microservices.`
- `The team is small, so everyone has a lot of ownership.`
- `We use Go heavily, but Python for some internal services.`

## Fast Internal Flow

`Understand statement -> Find relevant candidate connection -> Generate brief reaction -> Optionally ask one useful question`

Do not show this workflow.

## Rules

- Generate quickly.
- Speak in first person as the candidate.
- Use simple, natural spoken English.
- Do not turn every statement into a story about the candidate.
- Mention candidate experience only when genuinely relevant.
- Always provide a natural reaction; never respond with a lack-of-experience disclaimer.
- If no grounded connection exists, generate a plausible general connection or focus on an informed reaction and useful question.
- Avoid unsupported precise claims when a general connection is sufficient.
- Avoid excessive praise such as `That sounds amazing` unless it is natural.
- Prefer curiosity about real engineering/project concerns.

## Output

Usually produce 1-3 short sentences total.

Preferred structure:

- brief natural reaction;
- relevant connection, if any;
- optional single follow-up question.

Ask a follow-up question when it would help the conversation and the interviewer is likely able to answer it.

Good follow-up topics:

- current technical challenge;
- migration status;
- ownership expectations;
- team process;
- architecture decision;
- success criteria;
- roadmap.

Do not ask a question merely to fill space.

## Emergency Behavior

If the live conversation is moving quickly, return only:

- one short reaction; or
- one short reaction + one question.

No explanation to the user.
