---
name: comment
description: Generate an immediately readable, candidate-ready spoken comment during an active live interview by analyzing the recent conversation, especially the interviewer's latest statement and context. Use as the parameterless /comment command.
---

# /comment

## Purpose

Immediately provide the exact words the candidate can read aloud after the interviewer makes a statement, explains the project, shares a challenge, or pauses for a reaction.

The goal is to sound engaged, relevant, and conversational without over-talking.

## Invocation

Use exactly:

`/comment`

Do not require or interpret a parameter. Run only when `interview_active = true`.

If live interview mode is not active, return only:

`/comment is available during a live interview.`

## Recent-Context Analysis

Silently analyze the current exchange since the most recent clear topic change, normally the last 2-5 interviewer turns. Give greatest weight to what the interviewer said most recently and use earlier context only to understand its meaning.

Identify the interviewer from explicit speaker labels and conversational context. Determine:

- the main point the interviewer just communicated;
- the tone and intent behind it;
- the most relevant grounded candidate connection, if one exists;
- whether a short, useful question would naturally continue the conversation.

Respond to the substance of the recent interviewer context, not merely its final sentence. Do not react to the candidate's own preceding words as though the interviewer said them.

## Instant Response Contract

- Return only the exact words the candidate should say aloud.
- Do not add headings, labels, bullets, quotation marks, markdown formatting, analysis, or alternatives.
- Do not ask clarifying questions before answering.
- Do not acknowledge the command or add setup text.
- Do not browse, run tools, or perform extra research; use the context already available.
- If recent interviewer context is limited, make the safest natural comment from the latest available interviewer statement without pausing.

## Rules

- Speak in first person as the candidate.
- Use simple, natural spoken English.
- Make the response easy to scan and read aloud in real time.
- Do not turn every statement into a story about the candidate.
- Mention candidate experience only when genuinely relevant.
- Always provide a natural reaction; never respond with a lack-of-experience disclaimer.
- If no grounded connection exists, generate a plausible general connection or focus on an informed reaction and useful question.
- Avoid unsupported precise claims when a general connection is sufficient.
- Avoid excessive praise such as `That sounds amazing` unless it is natural.
- Prefer curiosity about real engineering/project concerns.

## Output

Produce 1-3 short sentences total, normally under 45 words.

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
