# Senior Impact Answer Update Specification

## Status

Proposed.

## Target Files

- `skills/discovery-cv/discovery-cv.md`
- `skills/discovery-jd/discovery-jd.md`
- `skills/apply-instruction/apply-instruction.md`

## Objective

Make senior-level interview answers lead with ownership and measurable outcomes instead of describing only technologies or implementation activity.

The preparation skills must collect and rank enough evidence for the live-answer skill to produce this sequence when the question calls for a project example:

`Problem -> Scale -> Candidate ownership -> Technical decision and rationale -> Result -> Business impact`

This is a content-quality upgrade, not a requirement to force the full sequence into every answer. Short factual questions and narrow follow-ups must remain short.

## Problem Statement

The current workflow prepares technical evidence and general stories, but it does not consistently capture:

- the scale of the problem;
- what the candidate personally owned;
- why a technical decision mattered;
- what changed after delivery;
- how success was measured;
- the resulting customer, operational, financial, or team impact.

As a result, a technically correct answer can end with a generic claim such as "it made the process faster and more reliable." That does not demonstrate senior-level impact.

## Required Cross-Skill State

### `impact_story_bank`

`discovery-cv` must create an `impact_story_bank` in addition to the existing general `story_bank`. It should contain up to five high-value stories, prioritizing these categories:

1. `automation` — saved time, reduced cost, or increased operational capacity;
2. `performance` — improved latency, throughput, or scale;
3. `reliability` — reduced failures, incidents, support work, or recovery time;
4. `architecture` — demonstrated a consequential technical decision and tradeoff;
5. `leadership` — demonstrated ownership, influence, alignment, or team leverage.

Do not create weak filler just to reach five stories. If a category lacks enough evidence, preserve it as a preparation gap and identify the exact candidate detail needed.

Each retained impact story must use this record shape:

```yaml
category: automation | performance | reliability | architecture | leadership
source_role_or_project: string
problem: string
scale:
  value: string | null
  evidence_status: exact | supported-approximation | confidential-range | qualitative-only | unknown
ownership:
  candidate_actions: [string]
  team_context: string | null
technical_decisions:
  - decision: string
    rationale: string | null
    tradeoff: string | null
result:
  technical_outcome: string | null
  business_outcome: string | null
metrics:
  - name: string
    before: string | null
    after: string | null
    value: string | null
    evidence_status: exact | supported-approximation | confidential-range
measurement:
  method: string | null
  observation_period: string | null
confidence: high | medium | low
missing_details: [string]
best_for_questions: [string]
job_relevance: high | medium | low | unranked
used_count: 0
```

Equivalent internal formatting is acceptable, but all concepts above must remain distinguishable.

### Evidence and Metric Safety

All three skills must follow one shared evidence rule:

- Never invent numbers, before/after values, scale, revenue effects, customer counts, team size, or operational outcomes.
- An exact metric may be used only when supplied by the candidate or a candidate-owned source such as the CV.
- An approximation may be used only when the source supports the approximation or the candidate confirms it. Label it internally as `supported-approximation`.
- A confidential metric may be expressed as a candidate-supported range or relative change, such as "more than half," without revealing protected values.
- A calculation derived from supplied facts is allowed only when the derivation is straightforward and retained in preparation notes.
- Target-company or comparable-company metrics from `real_world_project_evidence` must never be attributed to the candidate.
- When candidate impact is only qualitative, use the strongest grounded qualitative result and, when useful, explain how success was measured. Do not manufacture a quantitative result to satisfy the preferred answer shape.

## Changes to `discovery-cv.md`

### 1. Expand project extraction

For every substantial role or project, extract the following in addition to the current timeline fields:

- problem or business need;
- scale indicators;
- candidate-owned scope;
- team or stakeholder context;
- important technical decisions;
- rationale and tradeoffs;
- technical result;
- business or customer result;
- success metric and measurement method;
- evidence status for each number or approximation.

Relevant scale and outcome indicators include, when present:

- users or customers affected;
- requests, jobs, or records processed;
- processing time before and after;
- latency or throughput change;
- failure-rate or incident reduction;
- manual hours saved;
- infrastructure cost change;
- deployment frequency or lead-time change;
- support-ticket reduction;
- team size or teams influenced;
- revenue, conversion, retention, or operational-capacity impact.

Absence of a number must be recorded as missing information, not silently converted into a plausible number.

### 2. Add ownership analysis

Separate the candidate's contribution from the team's work. Capture evidence for senior ownership such as:

- identified the problem;
- designed the approach;
- made or influenced a decision;
- led implementation or rollout;
- coordinated stakeholders;
- introduced measurement or monitoring;
- validated the outcome;
- owned follow-through after deployment.

Do not upgrade "worked on" into "owned" or "led" without evidence.

### 3. Replace broad story quantity with impact-story priority

Keep the existing general `story_bank`, but create and prioritize the five-category `impact_story_bank` described above. Prefer a small set of reusable, evidence-rich stories over many generic answers.

Each prepared impact story should support a natural 60-90 second answer and contain enough material for shorter follow-ups.

### 4. Improve the risk and missing-detail list

For every otherwise strong project lacking scale, result, or measurement, generate concise candidate follow-up prompts such as:

- How many users, records, requests, or workflows were affected?
- What was the before/after time, failure rate, cost, or workload?
- What did you personally decide or own?
- How did the team verify the improvement after release?
- What changed for customers, operations, support, revenue, or delivery speed?

Rank these prompts by the likely interview value of completing the story. Do not answer them on the candidate's behalf.

### 5. Update state and visible output

Add `impact_story_bank` to the prepared conversation state.

Add these concise sections to the user-facing preparation report:

- `Impact Story Readiness` — the five categories with ready/partial/missing status;
- `Highest-Value Metrics to Confirm` — only unresolved details that would materially improve an answer.

Do not generate dozens of full answers.

## Changes to `discovery-jd.md`

### 1. Add an `impact_profile`

Derive the business outcomes the employer is likely to care about from the JD and company context. Examples include:

- operational efficiency;
- customer experience;
- product adoption or revenue;
- reliability and availability;
- latency and scale;
- cost efficiency;
- delivery speed;
- security or risk reduction;
- cross-team execution.

For each outcome, record:

- priority: high, medium, or low;
- supporting JD or company evidence;
- likely recruiter or interviewer probe;
- best matching candidate impact story;
- missing candidate evidence to confirm.

Store this as `job_profile.impact_profile` rather than creating a separate, competing job-state object.

### 2. Rank candidate stories for the role

Re-rank `impact_story_bank` against the JD. Ranking must consider:

- relevance to the role's main business outcome;
- strength of personal ownership;
- strength and credibility of metrics;
- similarity of technical decisions and constraints;
- usefulness across likely recruiter, technical, and behavioral questions.

Do not select a weaker keyword match over a stronger outcome-and-ownership match without noting why.

### 3. Extend likely-question prediction

For senior roles, explicitly predict probes in these families when relevant:

- describe one project owned end-to-end;
- what was the exact or approximate business impact;
- how reliability or quality was engineered;
- how success was measured after deployment;
- why a technical choice was made and what tradeoff it introduced;
- what the candidate personally did versus the team.

### 4. Extend real-world research without contaminating candidate evidence

For retained real-world examples, also capture useful measurement patterns, such as which production metrics were monitored and how outcomes were validated.

These examples may improve the realism of an implementation or measurement explanation. Their metrics and outcomes must remain externally attributed in preparation state and must not be copied into a candidate story.

### 5. Update positioning and visible output

Candidate positioning must identify:

- the best one or two impact stories for this role;
- the outcome headline for each;
- the ownership signal to emphasize;
- the most relevant technical decision and rationale;
- any metric that must be confirmed before the interview.

Add `Role-Specific Impact Priorities` to the user-facing report. Keep it concise.

## Changes to `apply-instruction.md`

### 1. Add impact-aware answer selection

Before generating a project, behavioral, architecture, or business-impact answer, retrieve the highest-ranked unused story that has:

1. relevant candidate evidence;
2. clear personal ownership;
3. a result or business outcome;
4. the strongest safe metric available.

Use `job_profile.impact_profile` to choose which outcome to emphasize. Continue tracking story reuse in `used_stories` or the equivalent `used_count` field.

### 2. Add the senior example shape

For a substantial project answer, use this logic when relevant:

`Problem -> Scale -> What I owned -> Technical decision and why -> Result -> Business impact`

The shape is not a script and labels must never be spoken. Omit elements that do not answer the question, but do not default to a technology list.

For 60-90 second project questions, allow approximately 6-9 short spoken sentences. This is a scoped exception to the existing normal-mode preference for 4-6 sentences.

### 3. Lead with the requested outcome

If the interviewer asks about business impact, result, scale, or success measurement, the first sentence must answer that dimension directly.

Examples of valid openings when grounded:

- "The main impact was removing about 20 hours of manual work each week."
- "The change cut processing time by more than half."
- "The main result was that operations could handle more customers without adding headcount."

Do not begin with tools or architecture when the interviewer asked for impact.

### 4. Prefer ownership language while preserving team truth

Use explicit first-person verbs when evidence supports them: `I identified`, `I designed`, `I decided`, `I led`, `I owned`, `I measured`.

Use `we` for team outcomes and shared decisions. The answer should make the boundary clear, for example: "I designed the retry strategy, and our team rolled it out across the service."

Do not exaggerate ownership to make an answer sound senior.

### 5. Require decision rationale

When mentioning an important technology, pattern, or architecture choice, state why it fit the problem or constraint. Include the meaningful tradeoff when relevant.

Weak:

> We used Celery, RabbitMQ, and PostgreSQL.

Preferred:

> I separated long-running jobs into dedicated queues so one workload could not block the others. We persisted workflow state in PostgreSQL so failed steps could resume safely.

Technology names that do not explain ownership, reasoning, or outcome should usually be omitted.

### 6. Require an outcome signal for major stories

Aim for one or two grounded scale or outcome signals in each major project answer. Prefer, in order:

1. exact candidate-supplied metric;
2. supported approximation or confidential range;
3. grounded relative change;
4. grounded qualitative operational or customer outcome;
5. measurement method, if the achieved result itself is not available.

Never insert `X`, `Y`, or `Z` placeholders into a live answer. Never invent a metric because the preferred answer format calls for one.

Avoid unsupported phrases such as "significantly improved," "made it scalable," or "helped the business." Replace them with a concrete grounded result, or explain the observable change and how it was measured.

### 7. Make measurement part of technical and cultural answers

When relevant, say how the result was validated after deployment, such as:

- comparing before/after processing time;
- tracking error or retry rates;
- monitoring incidents or support tickets;
- observing throughput, queue depth, latency, or infrastructure cost;
- validating adoption or operational capacity with stakeholders.

Apply the same decision-and-outcome discipline to behavioral answers. A leadership story should explain what changed for the team or delivery, not only describe communication activity.

### 8. Preserve mode behavior

Emergency Mode remains 1-3 sentences and should not attempt the full six-part structure. For a short impact follow-up, answer with the strongest grounded outcome first, then one sentence connecting it to the candidate's action.

Normal Mode keeps the existing concise style except for substantial project stories, which may use the 60-90 second exception above.

### 9. Update saved state

Preserve `impact_story_bank` and `job_profile.impact_profile` when applying or switching instruction profiles, and include the new impact-answer behavior in `active_instruction_snapshot` so `/reapply-instructions` restores it automatically.

No change to `reapply-instructions.md` is required if it continues restoring the complete snapshot without enumerating individual rules.

## Answer Behavior by Question Type

| Question type | Required opening | Expected content |
| --- | --- | --- |
| "What was the business impact?" | Strongest grounded business outcome | Metric or qualitative result, candidate action, measurement |
| "Tell me about a project" | One-sentence problem and scale | Ownership, decision and rationale, result, business impact |
| "Why did you choose X?" | Decision rationale | Constraint, alternatives/tradeoff, validation or result |
| "How did you make it reliable?" | Reliability strategy | Candidate-owned controls, production behavior, measured change |
| "How did you measure success?" | Primary KPI or observation | Baseline/comparison method, monitoring period, resulting decision |
| Short follow-up | Direct answer | One supporting fact; no repeated project background |

## Acceptance Criteria

### Preparation behavior

1. Given a CV with exact before/after metrics, `discovery-cv` retains the values, source status, measurement context, ownership, and business outcome.
2. Given a CV with a strong project but no metrics, `discovery-cv` marks the story partial and asks targeted follow-up questions without inventing values.
3. Given shared team work, `discovery-cv` distinguishes the candidate's actions from the team's outcome.
4. Given a senior JD emphasizing operational efficiency, `discovery-jd` ranks the best automation or cost-saving story above a merely keyword-matched story.
5. External project metrics remain attached only to `real_world_project_evidence` and never become candidate metrics.
6. The final preparation report identifies no more than five priority impact stories and the highest-value facts still needing confirmation.

### Live-answer behavior

7. A direct business-impact question begins with the impact, not a technology list.
8. A substantial project answer covers problem, scale when known, ownership, at least one meaningful decision, result, and business impact in natural spoken language.
9. A major story uses one or two quantitative signals when grounded; when none are grounded, it uses a truthful qualitative result or measurement method without fabricated precision.
10. A technical-choice answer explains why the choice mattered and includes a tradeoff when relevant.
11. A reliability answer includes what changed after the controls were introduced, when that result is known.
12. A leadership answer identifies the candidate's influence and the observable team or delivery outcome.
13. An Emergency Mode impact follow-up stays within 1-3 sentences and leads with the outcome.
14. No live response contains metric placeholders, external-company achievements presented as personal work, or unsupported claims of ownership.
15. Reusing `/reapply-instructions` restores all new impact behavior through the saved snapshot.

## Regression Constraints

- Preserve fast live-answer generation.
- Preserve first-person, natural spoken English and one sentence per line.
- Preserve automatic Normal/Emergency mode selection.
- Preserve profile switching and intent override.
- Preserve the prohibition on live browsing unless explicitly requested.
- Preserve source traceability for external evidence.
- Do not turn every narrow technical question into a 60-90 second story.
- Do not expose internal evidence labels or story-selection logic in spoken answers.

## Suggested Validation Scenarios

Run the updated skills against these scenarios:

1. A project with exact metrics and clear ownership.
2. A project with approximate but candidate-supported metrics.
3. A strong technical project with no known result metric.
4. A shared team project where the candidate owned only one subsystem.
5. A direct recruiter question: "What was the business impact?"
6. A technical follow-up: "Why did you choose PostgreSQL?"
7. A reliability follow-up: "What changed after you added retries and monitoring?"
8. A measurement question: "How did you know it worked?"
9. A leadership question where the outcome was improved delivery rather than system performance.
10. A rapid Emergency Mode follow-up requiring fewer than 45 words.

For each scenario, verify factual grounding, directness, ownership accuracy, metric safety, business relevance, spoken naturalness, and response length.

## Definition of Done

The three target files are updated consistently, the new state fields flow from discovery through live answering, all acceptance criteria pass in representative dry runs, and existing live-mode behavior remains intact outside substantial senior-level examples.
