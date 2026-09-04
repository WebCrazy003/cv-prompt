import { constants } from "node:fs";
import { access, mkdir, readFile, realpath, stat } from "node:fs/promises";
import { isAbsolute, parse, resolve } from "node:path";
import type { PdfSettings } from "../shared/types.js";
import { AppError } from "./errors.js";
import { atomicWriteJson } from "./fs-utils.js";

const EMPTY_SETTINGS: PdfSettings = { outputDirectory: "" };

export class SettingsService {
  private value: PdfSettings = EMPTY_SETTINGS;

  constructor(private readonly settingsPath: string) {}

  async initialize(): Promise<void> {
    try {
      const parsed = JSON.parse(await readFile(this.settingsPath, "utf8")) as Partial<PdfSettings>;
      this.value = { outputDirectory: typeof parsed.outputDirectory === "string" ? parsed.outputDirectory.trim() : "" };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  get(): PdfSettings {
    return { ...this.value };
  }

  requireOutputDirectory(): string {
    if (!this.value.outputDirectory) {
      throw new AppError(409, "pdf_output_directory_required", "Configure the default PDF output directory in Settings before generating a CV.");
    }
    return this.value.outputDirectory;
  }

  async save(outputDirectory: string): Promise<PdfSettings> {
    const input = outputDirectory.trim();
    if (!input || !isAbsolute(input)) {
      throw new AppError(400, "invalid_output_directory", "The PDF output directory must be a non-empty absolute path.");
    }
    const target = resolve(input);
    if (target === parse(target).root) {
      throw new AppError(400, "invalid_output_directory", "The filesystem root cannot be used as the PDF output directory.");
    }
    try {
      await mkdir(target, { recursive: true });
      const canonical = await realpath(target);
      if (!(await stat(canonical)).isDirectory()) throw new Error("Path is not a directory.");
      await access(canonical, constants.W_OK);
      this.value = { outputDirectory: canonical };
      await atomicWriteJson(this.settingsPath, this.value);
      return this.get();
    } catch (error) {
      throw new AppError(400, "output_directory_unavailable", `The PDF output directory cannot be created or written: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
