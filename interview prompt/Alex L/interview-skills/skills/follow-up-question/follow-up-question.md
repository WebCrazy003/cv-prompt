---
name: follow-up-question
description: Predict the single most likely follow-up question during an active live interview by analyzing the recent interviewer conversation, especially the interviewer's latest questions, context, reactions, and strongest apparent interest. Use only as the parameterless /follow-up-question live-interview command.
---

# /follow-up-question

## Purpose

Instantly show the one follow-up question the interviewer is most likely to ask next based on the recent live interview conversation.

## Invocation

Use exactly:

`/follow-up-question`

Do not require or interpret a parameter. Run only when `interview_active = true`.

If live interview mode is not active, return only:

`/follow-up-question is available during a live interview.`

## Recent-Context Analysis

Silently analyze the current line of questioning since the most recent clear topic change, normally the last 2-5 interviewer turns. Give greatest weight to the most recent interviewer question and context. Use older conversation only to resolve ambiguity.

Identify the interviewer from explicit speaker labels and conversational context. Prioritize:

- the latest question and any part the candidate did not fully address;
- topics the interviewer repeats or probes from multiple angles;
- requests for deeper implementation details, examples, tradeoffs, ownership, or results;
- technologies, responsibilities, risks, or challenges the interviewer emphasizes;
- positive reactions, curiosity, or extra time spent on a topic;
- the most natural deeper continuation of the current topic.

Predict a genuine follow-up to the recent exchange, not a generic question from another interview stage. Do not repeat an already answered question unless a narrower or deeper version is the most likely continuation.

Choose exactly one question aligned with the interviewer's strongest apparent interest. Keep all analysis and ranking internal.

## Instant Output Contract

Return only:

`Most likely follow-up question: [question]`

Do not include an answer, alternatives, probability, explanation, preparation notes, acknowledgements, or setup text. Do not ask for more context. Do not browse, run tools, or perform extra research.

If recent interviewer context is limited, infer the safest plausible follow-up from the latest available interviewer statement or question. Use the JD, candidate profile, `real_world_project_evidence`, and earlier interview context only as secondary tie-breakers.
