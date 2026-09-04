import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const python = process.env.CV_PDF_PYTHON || (process.platform === "darwin" ? "/usr/bin/python3" : "python3");
const workingDirectory = await mkdtemp(join(tmpdir(), "cv-pdf-smoke-"));
const input = join(workingDirectory, "cv.json");
const output = join(workingDirectory, "cv.pdf");

try {
  await writeFile(input, JSON.stringify({
    personNameOnCV: "PDF Smoke Test",
    personLocation: "Warsaw, Poland",
    personEmail: "smoke@example.com",
    companyNameApplyJob: "Example Company",
    summary: "A generated document used to verify the vendored PDF pipeline.",
    experience: [],
    skills: [
      { categoryName: "Languages", skillItems: ["TypeScript", "Python"] },
      { categoryName: "Delivery", skillItems: ["Testing", "Automation"] },
    ],
    personUniversity: "Example University",
    personDegree: "Computer Science",
    jobQuestionAnswers: [],
  }));
  const generatorRoot = resolve(import.meta.dirname, "..", "pdf-generator");
  const result = spawnSync(python, [join(generatorRoot, "cli.py"), "--input", input, "--output", output], {
    cwd: generatorRoot,
    encoding: "utf8",
    timeout: 180_000,
  });
  if (result.status !== 0) {
    throw new Error(`PDF CLI failed (${result.status ?? "signal"}): ${result.stderr || result.stdout}`);
  }
  const bytes = await readFile(output);
  if (!bytes.subarray(0, 4).equals(Buffer.from("%PDF"))) throw new Error("PDF CLI output did not have a PDF header.");
  const response = JSON.parse(result.stdout.trim());
  process.stdout.write(`PDF smoke test passed: ${bytes.length} bytes${response.warning ? ` (${response.warning})` : ""}\n`);
} finally {
  await rm(workingDirectory, { recursive: true, force: true });
}
