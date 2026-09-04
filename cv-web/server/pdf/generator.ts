import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, copyFile, mkdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { promisify } from "node:util";
import { AppError } from "../errors.js";
import { assertContained } from "../fs-utils.js";
import type { GenerationRecord } from "../generations/types.js";

const execFileAsync = promisify(execFile);

function safeFilename(value: unknown): string {
  const normalized = String(value ?? "").trim().replace(/[^A-Za-z0-9._ -]+/g, "_").replace(/\s+/g, " ").replace(/^[. ]+|[. ]+$/g, "").slice(0, 80).trim();
  return normalized || "cv";
}

function dateFolder(now: Date): string {
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}_${month}_${day}`;
}

export function publishedPdfFilename(result: { personNameOnCV?: unknown; companyNameApplyJob?: unknown }, copyNumber = 1): string {
  const base = `${safeFilename(result.personNameOnCV)}_${safeFilename(result.companyNameApplyJob)}`;
  return copyNumber === 1 ? `${base}.pdf` : `${base}_${copyNumber}.pdf`;
}

async function publishWithoutOverwrite(source: string, outputDirectory: string, folder: string, result: { personNameOnCV?: unknown; companyNameApplyJob?: unknown }): Promise<string> {
  for (let copyNumber = 1; ; copyNumber += 1) {
    const path = assertContained(outputDirectory, join(folder, publishedPdfFilename(result, copyNumber)), "PDF output");
    try {
      await copyFile(source, path, constants.COPYFILE_EXCL);
      return path;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
}

export interface GeneratedPdf {
  path: string;
  warning?: string;
}

export class PdfGenerator {
  constructor(
    private readonly generatorRoot: string,
    private readonly pythonCommand: string,
  ) {}

  async validateInstallation(): Promise<void> {
    await Promise.all([
      access(join(this.generatorRoot, "cli.py")),
      access(join(this.generatorRoot, "app.py")),
      access(join(this.generatorRoot, "cv_template.docx")),
    ]);
    try {
      await execFileAsync(this.pythonCommand, ["-c", "import docx"], { timeout: 10_000 });
    } catch {
      throw new AppError(503, "pdf_dependency_missing", `Python dependency python-docx is unavailable for ${basename(this.pythonCommand)}. Install cv-web/pdf-generator/requirements.txt or set CV_PDF_PYTHON.`);
    }
  }

  async generate(record: GenerationRecord): Promise<GeneratedPdf> {
    const outputDirectory = record.pdfOutputDirectory;
    if (!outputDirectory) throw new AppError(500, "pdf_output_directory_missing", "This generation has no PDF output directory snapshot.");
    await this.validateInstallation();
    const result = record.result as { personNameOnCV?: unknown; companyNameApplyJob?: unknown };
    const folder = assertContained(outputDirectory, join(outputDirectory, dateFolder(new Date())), "PDF date folder");
    await mkdir(folder, { recursive: true });

    let stdout: string;
    try {
      ({ stdout } = await execFileAsync(this.pythonCommand, [
        join(this.generatorRoot, "cli.py"),
        "--input", record.paths.result,
        "--output", record.paths.pdfResult,
      ], { cwd: this.generatorRoot, timeout: 180_000, maxBuffer: 1_000_000 }));
    } catch (error) {
      throw new AppError(500, "pdf_generation_failed", `PDF generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    let response: { warning?: unknown } = {};
    try {
      response = JSON.parse(stdout.trim()) as { warning?: unknown };
    } catch {
      throw new AppError(500, "pdf_generation_failed", "The PDF generator returned an invalid response.");
    }
    const pdf = await readFile(record.paths.pdfResult);
    if (!pdf.subarray(0, 4).equals(Buffer.from("%PDF"))) {
      throw new AppError(500, "pdf_generation_failed", "The generated file is not a valid PDF.");
    }
    const publishedPath = await publishWithoutOverwrite(record.paths.pdfResult, outputDirectory, folder, result);
    return {
      path: publishedPath,
      warning: typeof response.warning === "string" && response.warning ? response.warning : undefined,
    };
  }
}
