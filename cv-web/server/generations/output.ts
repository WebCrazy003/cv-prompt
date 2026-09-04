import { readFile, stat } from "node:fs/promises";
import { Ajv2020 } from "ajv/dist/2020.js";
import { AppError } from "../errors.js";
import { assertContained, atomicWrite } from "../fs-utils.js";
import type { GenerationRecord } from "./types.js";

interface QuestionAnswer {
  question?: unknown;
  answer?: unknown;
}

export async function validateAndPreserveOutput(record: GenerationRecord): Promise<unknown> {
  assertContained(record.paths.outputDirectory, record.paths.cvOutput, "CV output");
  assertContained(record.paths.resultDirectory, record.paths.result, "preserved result");
  if (!record.startedAt) throw new AppError(500, "missing_start_time", "Generation start time was not recorded.");

  let info;
  try {
    info = await stat(record.paths.cvOutput);
  } catch {
    throw new AppError(422, "output_missing", "The generation did not create runtime-output/cv-output.json.");
  }
  if (!info.isFile()) throw new AppError(422, "output_invalid_type", "The CV output is not a regular file.");
  const runStarted = Date.parse(record.startedAt);
  if (Math.max(info.birthtimeMs, info.ctimeMs, info.mtimeMs) < runStarted) {
    throw new AppError(422, "output_not_fresh", "The CV output was not freshly written by this generation.");
  }

  const raw = await readFile(record.paths.cvOutput);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.toString("utf8")) as unknown;
  } catch (error) {
    throw new AppError(422, "output_invalid_json", "The generated CV is not valid JSON.", error);
  }
  const schema = JSON.parse(await readFile(record.paths.outputSchema, "utf8")) as object;
  const ajv = new Ajv2020({ allErrors: true, strict: false, formats: { email: true } });
  const validate = ajv.compile(schema);
  if (!validate(parsed)) {
    throw new AppError(422, "output_schema_invalid", `Generated CV failed schema validation: ${ajv.errorsText(validate.errors)}`);
  }

  const answers = (parsed as { jobQuestionAnswers?: QuestionAnswer[] }).jobQuestionAnswers;
  if (!Array.isArray(answers) || answers.length !== record.submitted.questions.length) {
    throw new AppError(422, "question_answers_mismatch", "The number of application answers does not match the submitted questions.");
  }
  const seen = new Set<string>();
  answers.forEach((answer, index) => {
    const expected = record.submitted.questions[index]!.text;
    if (answer.question !== expected) {
      throw new AppError(422, "question_answers_mismatch", `Application answer ${index + 1} does not preserve its submitted question.`);
    }
    if (seen.has(expected)) throw new AppError(422, "question_answers_duplicate", "The generated application answers contain a duplicate question.");
    seen.add(expected);
  });

  await atomicWrite(record.paths.result, raw);
  return parsed;
}
