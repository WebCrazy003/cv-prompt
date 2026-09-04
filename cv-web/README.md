# CV Job Application Generator

A local-only React and Fastify application that runs repository CV skills through one authenticated Codex App Server process. Each of the three application tabs owns an independent Codex thread and filesystem snapshot, so three job applications can run concurrently without sharing inputs or outputs.

## Prerequisites

- Node.js 22 or newer.
- Codex CLI 0.153.0 or newer available as `codex`.
- A ChatGPT-authenticated Codex session. Run `codex login` before starting the app.
- Python 3 with `python-docx` installed. On macOS the app defaults to `/usr/bin/python3`; override it with `CV_PDF_PYTHON` when needed.
- LibreOffice is recommended for high-fidelity PDF conversion. When it is unavailable, the imported generator produces a simpler fallback PDF and reports a warning in the result.

This design uses the Codex allowance and eligible credits attached to a ChatGPT plan such as Plus. API-key authentication is a separately billed OpenAI Platform path and is intentionally rejected by this application. When possible, configure `cli_auth_credentials_store = "keyring"` in Codex configuration.

## Install and run

```bash
cd cv-web
npm install
/usr/bin/python3 -m pip install -r pdf-generator/requirements.txt
npm run dev
```

Open <http://127.0.0.1:5173> in development. The API binds only to `127.0.0.1:4317`; Vite proxies `/api` to it. For a production-style local build, run `npm run build`, then start `node dist/server/server/index.js` from `cv-web` and open <http://127.0.0.1:4317>.

On macOS, use the two Desktop shortcuts: double-click **CV Studio - Start.command** to start the production-style app and **CV Studio - Stop.command** to stop it. Starting rebuilds the current source, launches the server in the background, and opens the browser. The Stop shortcut stops only a local server that identifies itself as this project, including one started manually. Shortcut-managed PID and log files are kept under `.cv-web-runtime/`. The equivalent terminal commands are `npm run studio:start`, `npm run studio:stop`, and `npm run studio:status`.

When a macOS shortcut receives a reduced shell `PATH`, startup also checks the standard standalone install locations and the newest installed OpenAI VS Code extension for its bundled Codex CLI. Set `CODEX_COMMAND` to an explicit executable path to override discovery.

Do not expose either port publicly. This is a trusted single-user local application that reuses the local Codex login; it is not a multi-user hosting design.

Useful commands:

```bash
npm run typecheck
npm test
npm run test:pdf
npm run build
npm run protocol:generate
```

`protocol:generate` regenerates development protocol types from the installed CLI. Generated files are ignored; the checked-in adapter contains the deliberately small protocol surface used by the app.

## Runtime behavior

The backend verifies the Codex version, initializes `codex app-server`, checks `account/read`, retrieves every page of the fresh model catalog, and discovers compatible direct-child skills in `.codex/skills`. Generate remains unavailable when Codex is signed out, authenticated with an API key, or has no compatible model. Settings reads fresh allowance windows from `account/rateLimits/read` and displays the used and remaining percentages for the rolling limits supplied by Codex (currently 5-hour and weekly), together with their reset times and the signed-in account.

Each generation is stored under:

```text
../.cv-web-runtime/generations/<generation-id>/
```

Its `workspace/` contains only the selected skill and files declared by that skill's `snapshotIncludes`. Submitted inputs are atomically written beneath `runtime-input/`; Codex writes `runtime-output/cv-output.json`; a schema-validated result is atomically preserved beneath `result/`. The vendored generator in `pdf-generator/` renders that JSON through `cv_template.docx`, preserves an internal PDF with the generation, and publishes a collision-safe copy to the default directory selected in **Settings**. Source candidate profiles and shared repository output files are never modified. Snapshots consume disk space independently because files are copied, never hard-linked.

The output directory is persisted in `.cv-web-runtime/settings.json` and is reused after the app restarts. PDFs are organized as `<output>/yy_mm_dd/Person_Company.pdf`; if that clean name already exists, the app uses `Person_Company_2.pdf`, then `_3`, and so on without overwriting an earlier CV. A run is marked complete only after both JSON validation and PDF publication succeed. The result screen shows the exact saved path and also offers a local PDF download.

Three application tabs can run at once. There is one active slot per tab and three total; excess requests receive an error and are never queued. Every generation calls `thread/start` with `ephemeral: true`, so it begins in a fresh Codex conversation instead of resuming or inheriting a previous generation's transcript. During generation, each tab displays an animated backend indicator and a sanitized live Codex activity timeline. Agent-message progress is shown, while hidden reasoning, raw commands, command output, environment data, and credentials are not exposed. Cancelling or answering an interactive request affects only its owning thread. Ordinary input requests time out after 15 minutes, or an earlier positive App Server deadline. Filesystem, network, command, file-change, MCP, and other permission-expansion requests are declined and the affected generation is stopped.

The last model and reasoning effort explicitly selected by the user are saved in browser `localStorage` and restored when a new session starts, provided they remain in the fresh model catalog. Completed, failed, and cancelled tabs can be reset to a clean five-question draft without removing the retained generation or discarding those saved defaults. Copy, download, Keep, deletion, and reset actions display an in-app confirmation.

Unkept completed, failed, and cancelled generations expire after 30 days. **Keep** removes automatic expiry; **Remove keep** starts a new 30-day period. **Delete now** removes one terminal generation. Runtime data is gitignored.

## Adding a CV skill

Create a direct child of `../.codex/skills` with:

- `SKILL.md` containing non-empty `name` and `description` YAML frontmatter;
- `references/cv-output.schema.json` using JSON Schema Draft 2020-12;
- `runtime.contract.json` valid against [`../spec/cv-skill-runtime-contract.schema.json`](../spec/cv-skill-runtime-contract.schema.json).

The runtime contract must declare exactly `jobDescriptionFile`, `jobQuestionsFile`, and `cvOutputFile`, its candidate root, and a non-empty, tightly scoped snapshot manifest. See [`../spec/cv-skill-runtime-contract-update-spec.md`](../spec/cv-skill-runtime-contract-update-spec.md). There is no whole-repository or legacy fixed-file fallback.

An optional `ui.schema.json` may declare an object of string, string-enum, boolean, integer, or number parameters with `additionalProperties: false`. Runtime path parameters are reserved and cannot appear in that schema. `agents/openai.yaml` may provide a display name and short description.

## Troubleshooting

- **Not signed in:** run `codex login`, then choose **Check again**.
- **API key unsupported:** run `codex logout`, then `codex login` and use the ChatGPT browser flow.
- **No models or model retired:** use **Refresh skills & models**. Saved selections are reconciled only against the current catalog.
- **Usage or rate limit:** wait for the account limit to reset, then submit a new generation. A failed run is never treated as successful.
- **Skill disabled:** inspect its runtime contract, snapshot matches, candidate boundary, output schema, and optional UI schema.
- **Invalid output:** inspect the retained generation workspace and diagnostic. Success requires a fresh JSON file matching the selected skill schema and exactly one ordered answer per submitted non-empty question.
- **PDF dependency missing:** install `pdf-generator/requirements.txt` for the Python selected by `CV_PDF_PYTHON`. On macOS, `/usr/bin/python3 -m pip install -r pdf-generator/requirements.txt` matches the default.
- **PDF conversion failed:** confirm the Settings directory is writable. Install LibreOffice for styled conversion; any fallback warning is shown beside the saved PDF path.
- **App Server disconnected:** active generations fail independently. The backend makes one restart attempt; retry the affected generation after bootstrap recovers.
