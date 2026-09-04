import { Ajv2020, type ValidateFunction } from "ajv/dist/2020.js";
import type { ParameterSchema } from "../../shared/types.js";
import { AppError } from "../errors.js";

export const RESERVED_PARAMETERS = new Set(["jobDescriptionFile", "jobQuestionsFile", "cvOutputFile"]);

const parameterDefinition = {
  type: "object",
  required: ["type"],
  additionalProperties: false,
  properties: {
    type: { enum: ["string", "boolean", "integer", "number"] },
    title: { type: "string" },
    description: { type: "string" },
    default: { type: ["string", "boolean", "integer", "number"] },
    enum: { type: "array", minItems: 1, uniqueItems: true, items: { type: ["string", "boolean", "integer", "number"] } },
    minimum: { type: "number" },
    maximum: { type: "number" },
  },
} as const;

export const PARAMETER_META_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  required: ["type", "properties", "additionalProperties"],
  additionalProperties: false,
  properties: {
    $schema: { type: "string" },
    type: { const: "object" },
    properties: { type: "object", additionalProperties: parameterDefinition },
    required: { type: "array", uniqueItems: true, items: { type: "string" } },
    additionalProperties: { const: false },
  },
} as const;

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateMeta = ajv.compile(PARAMETER_META_SCHEMA);

export function compileParameterSchema(value: unknown): { schema: ParameterSchema; validate: ValidateFunction } {
  if (!validateMeta(value)) {
    throw new AppError(400, "invalid_parameter_schema", ajv.errorsText(validateMeta.errors));
  }
  const schema = value as ParameterSchema;
  const names = Object.keys(schema.properties);
  const reserved = names.find((name) => RESERVED_PARAMETERS.has(name));
  if (reserved) throw new AppError(400, "reserved_parameter", `ui.schema.json declares reserved parameter ${reserved}.`);
  const missingRequired = schema.required?.find((name) => !Object.hasOwn(schema.properties, name));
  if (missingRequired) throw new AppError(400, "invalid_parameter_schema", `Required parameter ${missingRequired} has no schema.`);
  return { schema, validate: ajv.compile(schema) };
}
