# CV Job Application Generator

A local-only React and Fastify application that runs repository CV skills through one authenticated Codex App Server process. Each of the two application tabs owns an independent Codex thread and filesystem snapshot, so two job applications can run concurrently without sharing inputs or outputs.

## Prerequisites

- Node.js 22 or newer.
- Codex CLI 0.153.0 or newer available as `codex`.
- A ChatGPT-authenticated Codex session. Run `codex login` before starting the app.

This design uses the Codex allowance and eligible credits attached to a ChatGPT plan such as Plus. API-key authentication is a separately billed OpenAI Platform path and is intentionally rejected by this application. When possible, configure `cli_auth_credentials_store = "keyring"` in Codex configuration.

## Install and run

```bash
cd cv-web
npm install
npm run dev
```

Open <http://127.0.0.1:5173> in development. The API binds only to `127.0.0.1:4317`; Vite proxies `/api` to it. For a production-style local build, run `npm run build`, then start `node dist/server/server/index.js` from `cv-web` and open <http://127.0.0.1:4317>.

Do not expose either port publicly. This is a trusted single-user local application that reuses the local Codex login; it is not a multi-user hosting design.

Useful commands:

```bash
npm run typecheck
npm test
npm run build
npm run protocol:generate
```

`protocol:generate` regenerates development protocol types from the installed CLI. Generated files are ignored; the checked-in adapter contains the deliberately small protocol surface used by the app.

## Runtime behavior

The backend verifies the Codex version, initializes `codex app-server`, checks `account/read`, retrieves every page of the fresh model catalog, and discovers compatible direct-child skills in `.codex/skills`. Generate remains unavailable when Codex is signed out, authenticated with an API key, or has no compatible model.

Each generation is stored under:

```text
../.cv-web-runtime/generations/<generation-id>/
```

Its `workspace/` contains only the selected skill and files declared by that skill's `snapshotIncludes`. Submitted inputs are atomically written beneath `runtime-input/`; Codex writes `runtime-output/cv-output.json`; a schema-validated result is atomically preserved beneath `result/`. Source candidate profiles and shared repository output files are never modified. Snapshots consume disk space independently because files are copied, never hard-linked.

Two application tabs can run at once. There is one active slot per tab and two total; excess requests receive an error and are never queued. Cancelling or answering an interactive request affects only its owning thread. Ordinary input requests time out after 15 minutes, or an earlier positive App Server deadline. Filesystem, network, command, file-change, MCP, and other permission-expansion requests are declined and the affected generation is stopped.

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
- **App Server disconnected:** active generations fail independently. The backend makes one restart attempt; retry the affected generation after bootstrap recovers.
