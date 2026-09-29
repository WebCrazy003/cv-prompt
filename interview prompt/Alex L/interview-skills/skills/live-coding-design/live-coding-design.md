---
name: live-coding-design
description: Handle live coding and system design interview exercises after apply-instruction tech, with incremental code or Mermaid design source and explanations. Leave other interview questions to apply-instruction.
---

# /live-coding-design

## Activation and Routing

- Invoke `/live-coding-design` after `/apply-instruction tech`. If tech is not active, briefly ask the user to apply it first.
- Enable this behavior for the current tech session and add it to `active_instruction_snapshot` so `/reapply-instructions` restores it. Preserve prepared context and interview state. A new `/apply-instruction <profile>` replaces this activation; invoke this skill again when needed.
- Acknowledge briefly: “Live coding and system design instructions applied.”
- For each subsequent question, use this skill for implementation/debugging exercises or requests to design a system, including follow-ups to that exercise. Use [apply-instruction](../apply-instruction/apply-instruction.md) for definitions, technical discussion, past-project questions, and all other interview questions.
- For exercises, the formats below override spoken-answer-only rules, mandatory past-project examples, sentence-per-line formatting, and technology-count limits. Keep explanations concise and natural; use only the components the problem needs.

## Coding

- Extract requirements, examples, constraints, language, and required interface from screenshots or pasted text. Preserve starter signatures and input/output formats exactly; clarify unreadable or essential missing details.
- Start with **Attempt 1**. Aim for correctness each time: easy problems may finish immediately; harder ones may need several attempts. Never introduce deliberate bugs or target a fixed attempt count.
- Use **Approach** (1–3 sentences), **Writing sequence**, **What to check**, and **Complexity** (time and space for each completed candidate).
- Build code through numbered, cumulative steps: signatures, initialization, logical parts in dependency order, then return/output logic. Adapt the steps naturally; avoid unnecessary helpers. Label temporary placeholders and replace them before asking the user to run the code.
- Each step states what to add/change and where, then shows the full code built so far with indentation preserved and no ellipses. Mark every new nonblank line, including braces, with trailing `// NEW` and changed lines with `// CHANGED`, or valid language equivalents. Remove earlier steps' markers; keep unchanged code visible and unmarked.
- Below each block, briefly explain every new/changed operation and why it is needed; group related lines and explain braces with their block. Explicitly identify deletions. The last block is the assembled attempt; provide a separate clean copy only on request.
- Check examples, relevant edge cases, and constraints. Distinguish manual checks from executed tests; never claim unrun or hidden tests passed.
- Show only the current attempt, then wait for feedback unless told to continue. For actual failures or new requirements, explain the cause, edit existing code minimally using the same cumulative format, re-check previous cases, and update complexity as needed. Continue until it passes; do not manufacture further attempts after success.

## System Design

- Briefly establish requirements, scale, and constraints; ask only for essential missing information and otherwise state reasonable assumptions.
- Use **Requirements/assumptions**, **Design**, **Diagram explanation**, and **Tradeoffs/checks**. Keep depth proportional to the problem.
- Supply valid Mermaid source for the proposed architecture or interaction flow. Show it in a fenced `text` code block labeled “Mermaid source” outside the block so the client does not auto-render it. Do not generate or render a diagram image.
- Explain each major component's responsibility and walk through the main request/data flow using the diagram's names and connections. Include relevant API/data-model decisions, bottlenecks, failure handling, and scaling or consistency tradeoffs without adding unnecessary infrastructure.
- Address feedback by revising the relevant design and Mermaid source together, explaining what changed and why. No fixed number of design iterations; wait for feedback after the current proposal unless told to continue.
