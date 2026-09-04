# Djinni CV tailoring and writing rules

## Governing principle

The Djinni profile is the stable base truth. The CV is a job-specific presentation of that truth. Tailor emphasis, not facts.

Preserve every supplied employer, date, technology, career-duration claim, project, achievement, education item, and leadership claim. Do not strengthen, weaken, rename, or replace a fact merely to match the JD.

The technologies named in the profile are representative experience anchors, not a complete inventory. A closely related technology may be presented as candidate experience when the target job makes it relevant and the relationship follows the rules below.

## Related-technology inference

Apply this inference before deciding that a JD technology is unsupported:

- `React`, `TypeScript`, or `Node.js` anchors the modern JavaScript/web family. This permits job-relevant use of HTML, CSS, JavaScript, and closely related mainstream JavaScript frameworks or libraries, including Angular and Vue.js.
- `C#/.NET` anchors the .NET application ecosystem. This permits job-relevant use of ASP.NET, ASP.NET Core, MVC, Web API, Entity Framework, Entity Framework Core, and LINQ.
- For another supplied technology, infer only an immediate, conventional companion in the same ecosystem when the relationship is comparably strong. Do not use loose similarity or the JD alone as evidence.

Use the exact JD term when an authorized related technology is important to the role. It may appear in the summary, skills, and conservative experience bullets. Because the consulting employers have `Technologies: Not supplied` and the profile states that the candidate worked across varied stacks, a related technology may be placed in a plausible employer context without inventing a client, project, duration, version, metric, or technology-specific achievement.

Do not infer an unrelated language, platform, cloud provider, database, specialist discipline, certification, proficiency level, or exact years of experience. Do not imply that every technology in an anchored family was used at every employer. Include only the related technologies relevant to the current job.

## JD-led tailoring

1. Identify the target role, seniority, mandatory skills, secondary skills, responsibilities, domain, and recruiter-search terms before drafting.
2. Match `jobTitleApplyJob` to the advertised position. Use the JD's exact title when one is explicitly supplied.
3. Rewrite the summary for the target role, leading with the most relevant truthful qualifications and contribution angle.
4. Reorder skill categories and items so mandatory truthful technologies appear first.
5. Remove skills irrelevant to the target instead of listing every technology in the profile. Do not remove facts from the profile itself.
6. Use exact JD keywords when the Djinni profile or a permitted completion supports them, such as `ASP.NET Core` instead of a vague substitute.
7. Increase leadership emphasis for Tech Lead roles and reduce it for senior individual-contributor roles without changing the leadership history.
8. Keep AI proportional: foreground LLM, RAG, agents, and related work for AI-focused roles; keep it secondary for ordinary .NET, backend, or full-stack roles.

## Missing details

Fields marked `Not supplied` may be completed only where the Djinni profile explicitly permits it. Use conservative, JD-aligned wording consistent with the candidate's stated consulting career and supplied skills.

- Suitable generic job titles may be inferred from career stage and the target role.
- Responsibilities may be phrased as credible role-level work, but must remain consistent with supplied skills, accomplishments, and leadership scope.
- Do not invent named clients, named products, certifications, project names, exact team sizes, transaction volumes, revenue, percentages, latency figures, or other unverifiable specifics.
- Do not add a JD technology merely for ATS coverage. Include it only when the profile states it, the related-technology inference above authorizes it, or a `Not supplied` field permits a conservative completion consistent with the profile.
- When a useful claim cannot be supported, omit it rather than filling the gap.

## Experience bullets

Prefer `Action + Problem + Technology/Approach + Outcome`. Use a metric only when the Djinni profile supplies it. Otherwise state a concrete qualitative outcome without implying a measured result.

Prioritize recent work while keeping the document concise:

- XB Software: 6–8 bullets.
- Selleo Labs: 5–7 bullets.
- Gecko Dynamics: 4–5 bullets.

Select the most relevant supported bullets rather than repeating the whole JD beneath every employer. Show credible progression: recent work can carry more architecture, ownership, mentoring, and target-role alignment; earlier work should establish engineering foundations.

Use strong action verbs and avoid repeatedly opening bullets with the same verb. Keep bullets distinct, technically clear, natural, and concise. Avoid keyword stuffing, inflated claims, canned marketing language, and duplicate achievements.

## Summary and skills

The summary should quickly communicate the tailored title, truthful career length, strongest relevant specializations, core skills, leadership level where applicable, and the value the candidate brings to the target company. Do not claim an achievement or metric absent from the Djinni profile.

Organize skills into ATS-readable categories represented by `categoryName` and `skillItems`. Each category must render naturally as `Category: item, item, item`. Include only job-relevant skills supported by the Djinni profile, authorized related-technology inference, or conservative permitted completion.

## Application questions

- Answer only questions listed in `jobQuestionsFile`, reproduce their text exactly, and preserve their array order.
- Base answers on the Djinni profile, the generated CV, and the target job.
- Use direct, conversational language and no more than 30 words per answer.
- Do not add questions or answers when the questions section is empty.
