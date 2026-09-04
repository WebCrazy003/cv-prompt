import { useCallback, useEffect, useMemo, useState } from "react";
import { APPLICATION_TAB_IDS, GENERATION_CAPACITY } from "../../shared/types";
import type {
  ApplicationTabId,
  BootstrapResponse,
  GenerationEvent,
  GenerationSummary,
  ModelOption,
  ParameterSchema,
  PdfSettings,
  ReasoningEffort,
  SkillOption,
} from "../../shared/types";
import { loadDraft, loadPreferences, preferredDraft, saveDraft, savePreferences, type Draft } from "./storage";

type GenerationPayload = { generation: GenerationSummary; events: GenerationEvent[]; pendingInput?: { requestId: string; questions: Array<{ id: string; header: string; question: string; options?: Array<{ label: string }> }> ; deadline: string }; result?: Record<string, unknown> };
type BootstrapPayload = BootstrapResponse & { diagnostics?: string[] };

const tabs: Array<{ id: ApplicationTabId; label: string }> = APPLICATION_TAB_IDS.map((id, index) => ({
  id,
  label: `Application ${index + 1}`,
}));
const activeStatuses = new Set(["preparing", "starting_codex", "running", "waiting_for_input", "cancelling", "validating"]);
const statusLabels: Record<string, string> = {
  preparing: "Preparing input", starting_codex: "Starting Codex", running: "Running", waiting_for_input: "Waiting for input",
  cancelling: "Cancelling", validating: "Validating output", completed: "Complete", failed: "Failed", cancelled: "Cancelled",
};

function fallbackEffort(model: ModelOption, preferred?: ReasoningEffort): ReasoningEffort {
  if (preferred && model.supportedEfforts.includes(preferred)) return preferred;
  if (model.defaultEffort && model.supportedEfforts.includes(model.defaultEffort)) return model.defaultEffort;
  return (["medium", "low", "high"] as ReasoningEffort[]).find((effort) => model.supportedEfforts.includes(effort))!;
}

function reconcile(draft: Draft, bootstrap: BootstrapPayload): { draft: Draft; notice?: string } {
  const model = bootstrap.models.find((item) => item.model === draft.model)
    ?? bootstrap.models.find((item) => item.isDefault)
    ?? bootstrap.models[0];
  const skill = bootstrap.skills.find((item) => item.name === draft.skillName && item.runnable);
  const next = { ...draft };
  const changedModel = Boolean(draft.model && model && draft.model !== model.model);
  if (model) {
    next.model = model.model;
    const effort = fallbackEffort(model, draft.effort);
    const changedEffort = draft.effort !== effort;
    next.effort = effort;
    if (changedModel || changedEffort) return { draft: next, notice: "Your previous model or effort is no longer available. A current option was selected." };
  }
  if (draft.skillName && !skill) {
    next.skillName = "";
    next.skillParameters = {};
    return { draft: next, notice: "Your previous skill is no longer available. Select another skill." };
  }
  return { draft: next };
}

async function api<T>(path: string, token?: string, init: RequestInit = {}): Promise<{ data: T; token?: string }> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { "x-cv-session-token": token } : {}),
      ...init.headers,
    },
  });
  const data = response.status === 204 ? undefined as T : await response.json() as T & { message?: string };
  if (!response.ok) throw new Error((data as T & { message?: string })?.message ?? `Request failed (${response.status})`);
  return { data, token: response.headers.get("x-cv-session-token") ?? undefined };
}

export function App() {
  const [page, setPage] = useState<"applications" | "settings">("applications");
  const [selectedTab, setSelectedTab] = useState<ApplicationTabId>("application-1");
  const [drafts, setDrafts] = useState<Record<ApplicationTabId, Draft>>({
    "application-1": loadDraft("application-1"),
    "application-2": loadDraft("application-2"),
    "application-3": loadDraft("application-3"),
  });
  const [runs, setRuns] = useState<Partial<Record<ApplicationTabId, GenerationPayload>>>({});
  const [bootstrap, setBootstrap] = useState<BootstrapPayload>();
  const [sessionToken, setSessionToken] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<PdfSettings>({ outputDirectory: "" });
  const [settingsInput, setSettingsInput] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  const updateDraft = useCallback((tab: ApplicationTabId, update: Partial<Draft> | ((draft: Draft) => Draft)) => {
    setDrafts((current) => {
      const nextDraft = typeof update === "function" ? update(current[tab]) : { ...current[tab], ...update };
      saveDraft(tab, nextDraft);
      return { ...current, [tab]: nextDraft };
    });
  }, []);

  const loadGeneration = useCallback(async (tab: ApplicationTabId, id: string) => {
    try {
      const { data } = await api<GenerationPayload>(`/api/generations/${id}`);
      setRuns((current) => ({ ...current, [tab]: data }));
    } catch (loadError) {
      updateDraft(tab, { generationId: undefined });
      setRuns((current) => ({ ...current, [tab]: undefined }));
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    }
  }, [updateDraft]);

  const loadBootstrap = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api<BootstrapPayload>("/api/bootstrap");
      setBootstrap(response.data);
      if (response.token) setSessionToken(response.token);
      setDrafts((current) => {
        const next = { ...current };
        for (const tab of tabs) {
          const reconciled = reconcile(current[tab.id], response.data);
          next[tab.id] = reconciled.draft;
          saveDraft(tab.id, reconciled.draft);
          if (reconciled.notice) setNotice(reconciled.notice);
        }
        return next;
      });
    } catch (bootstrapError) {
      setError(bootstrapError instanceof Error ? bootstrapError.message : String(bootstrapError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadBootstrap(); }, [loadBootstrap]);
  useEffect(() => {
    void api<PdfSettings>("/api/settings").then(({ data }) => {
      const outputDirectory = typeof data.outputDirectory === "string" ? data.outputDirectory : "";
      setSettings({ outputDirectory });
      setSettingsInput(outputDirectory);
    }).catch((settingsError) => setError(settingsError instanceof Error ? settingsError.message : String(settingsError)));
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3_500);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    for (const tab of tabs) if (drafts[tab.id].generationId) void loadGeneration(tab.id, drafts[tab.id].generationId!);
  }, []); // restore same-process generations once

  useEffect(() => {
    const sources: EventSource[] = [];
    for (const tab of tabs) {
      const id = drafts[tab.id].generationId;
      if (!id) continue;
      const source = new EventSource(`/api/generations/${id}/events`);
      for (const eventName of ["status", "progress", "input_required", "completed", "error"]) {
        source.addEventListener(eventName, () => void loadGeneration(tab.id, id));
      }
      sources.push(source);
    }
    return () => sources.forEach((source) => source.close());
  }, [drafts["application-1"].generationId, drafts["application-2"].generationId, drafts["application-3"].generationId, loadGeneration]);

  const draft = drafts[selectedTab];
  const run = runs[selectedTab];
  const selectedSkill = bootstrap?.skills.find((skill) => skill.name === draft.skillName);
  const selectedModel = bootstrap?.models.find((model) => model.model === draft.model);
  const isRunning = Boolean(run && activeStatuses.has(run.generation.status));
  const parametersValid = useMemo(() => validateParameters(selectedSkill?.parameterSchema, draft.skillParameters), [selectedSkill, draft.skillParameters]);
  const canGenerate = Boolean(settings.outputDirectory && bootstrap?.auth.eligible && selectedSkill?.runnable && selectedModel?.supportedEfforts.includes(draft.effort) && draft.jobDescription.trim() && draft.jobDescription.length <= 100_000 && parametersValid && !isRunning);

  function persistSelection(nextDraft: Draft) {
    const preferences = loadPreferences();
    preferences.skillName = nextDraft.skillName;
    preferences.model = nextDraft.model;
    preferences.effort = nextDraft.effort;
    if (nextDraft.skillName) preferences.skillParametersByName[nextDraft.skillName] = nextDraft.skillParameters;
    savePreferences(preferences);
  }

  function notify(message: string) {
    setToast(message);
  }

  async function refresh() {
    try {
      const { data } = await api<BootstrapPayload>("/api/bootstrap/refresh", sessionToken, { method: "POST" });
      setBootstrap(data);
      setDrafts((current) => {
        const next = { ...current };
        for (const tab of tabs) {
          const reconciled = reconcile(current[tab.id], data);
          next[tab.id] = reconciled.draft;
          saveDraft(tab.id, reconciled.draft);
          if (reconciled.notice) setNotice(reconciled.notice);
        }
        return next;
      });
      setError("");
    } catch (refreshError) { setError(refreshError instanceof Error ? refreshError.message : String(refreshError)); }
  }

  async function generate() {
    setError("");
    try {
      const { data } = await api<{ generationId: string }>("/api/generations", sessionToken, {
        method: "POST",
        body: JSON.stringify({
          applicationTabId: selectedTab,
          jobDescription: draft.jobDescription,
          questions: draft.questions,
          skillName: draft.skillName,
          skillParameters: draft.skillParameters,
          model: draft.model,
          effort: draft.effort,
        }),
      });
      const nextDraft = { ...draft, generationId: data.generationId };
      updateDraft(selectedTab, nextDraft);
      persistSelection(nextDraft);
      await loadGeneration(selectedTab, data.generationId);
    } catch (generationError) { setError(generationError instanceof Error ? generationError.message : String(generationError)); }
  }

  async function cancel() {
    if (!draft.generationId) return;
    try {
      await api(`/api/generations/${draft.generationId}/cancel`, sessionToken, { method: "POST" });
      await loadGeneration(selectedTab, draft.generationId);
    } catch (cancelError) { setError(cancelError instanceof Error ? cancelError.message : String(cancelError)); }
  }

  async function updateKeep(kept: boolean) {
    if (!run) return;
    try {
      await api(`/api/generations/${run.generation.id}/keep`, sessionToken, { method: "POST", body: JSON.stringify({ kept }) });
      await loadGeneration(selectedTab, run.generation.id);
      notify(kept ? "Generation will be kept on this machine." : "A new 30-day retention period has started.");
    } catch (keepError) { setError(keepError instanceof Error ? keepError.message : String(keepError)); }
  }

  async function deleteRun() {
    if (!run || !window.confirm("Permanently delete this generation and its isolated workspace?")) return;
    try {
      await api(`/api/generations/${run.generation.id}`, sessionToken, { method: "DELETE" });
      updateDraft(selectedTab, { generationId: undefined });
      setRuns((current) => ({ ...current, [selectedTab]: undefined }));
      notify("Generation deleted.");
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : String(deleteError)); }
  }

  function resetApplication() {
    const preferred = preferredDraft();
    const nextDraft = bootstrap ? reconcile(preferred, bootstrap).draft : preferred;
    updateDraft(selectedTab, nextDraft);
    setRuns((current) => ({ ...current, [selectedTab]: undefined }));
    setError("");
    notify("Application reset. Your saved defaults were preserved.");
  }

  async function savePdfSettings() {
    setSavingSettings(true);
    setError("");
    try {
      const { data } = await api<PdfSettings>("/api/settings", sessionToken, { method: "POST", body: JSON.stringify({ outputDirectory: settingsInput }) });
      setSettings(data);
      setSettingsInput(data.outputDirectory);
      notify("Default CV output directory saved.");
      setPage("applications");
    } catch (settingsError) {
      setError(settingsError instanceof Error ? settingsError.message : String(settingsError));
    } finally {
      setSavingSettings(false);
    }
  }

  const authLabel = bootstrap?.auth.eligible ? `ChatGPT${bootstrap.auth.planType ? ` · ${bootstrap.auth.planType}` : ""}` : bootstrap?.auth.authMode === "apiKey" ? "API key unsupported" : "Not signed in";

  return <div className="app-shell">
    <header className="masthead">
      <div>
        <p className="eyebrow">Local Codex workspace</p>
        <h1>Job application studio</h1>
        <p className="lede">Three independent workspaces for tailored CVs and application answers.</p>
      </div>
      <div className="masthead-actions"><div className={`account ${bootstrap?.auth.eligible ? "good" : "warn"}`}><span className="pulse" />{loading ? "Connecting…" : authLabel}</div><div className="page-switch"><button className={page === "applications" ? "selected" : ""} onClick={() => setPage("applications")}>Applications</button><button className={page === "settings" ? "selected" : ""} onClick={() => setPage("settings")}>Settings</button></div></div>
    </header>

    {page === "applications" && <nav className="tabs" aria-label="Applications">
      {tabs.map((tab) => <button key={tab.id} className={selectedTab === tab.id ? "tab selected" : "tab"} onClick={() => setSelectedTab(tab.id)}>
        <span>{tab.label}</span><span className={`status-dot ${runs[tab.id]?.generation.status ?? "idle"}`}>{statusLabels[runs[tab.id]?.generation.status ?? ""] ?? "Idle"}</span>
      </button>)}
    </nav>}

    {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notice">×</button></div>}
    {toast && <div className="toast" role="status" aria-live="polite">✓ {toast}</div>}
    {error && <div className="error-banner" role="alert">{error}</div>}
    {page === "applications" && !bootstrap?.auth.eligible && !loading && <div className="auth-card"><strong>{bootstrap?.auth.authMode === "apiKey" ? "This application requires ChatGPT sign-in. API-key usage is not supported." : "Codex is not signed in."}</strong>{bootstrap?.auth.authMode === "apiKey" && <code>codex logout</code>}<code>codex login</code><button className="secondary" onClick={() => void refresh()}>Check again</button></div>}
    {page === "applications" && !settings.outputDirectory && <div className="auth-card"><strong>Choose where generated CV PDFs should be saved.</strong><span>Generation remains disabled until an absolute output directory is configured.</span><button className="secondary" onClick={() => setPage("settings")}>Open Settings</button></div>}

    {page === "settings" && <SettingsPage value={settingsInput} savedValue={settings.outputDirectory} saving={savingSettings} onChange={setSettingsInput} onSave={() => void savePdfSettings()} />}

    {page === "applications" && <main className="workspace">
      <section className="panel inputs" aria-labelledby="job-heading">
        <div className="section-heading"><span>01</span><div><h2 id="job-heading">Job input</h2><p>Source material is copied into this run only.</p></div></div>
        <label htmlFor={`${selectedTab}-description`}>Job description <em>Required</em></label>
        <textarea id={`${selectedTab}-description`} className="job-description" value={draft.jobDescription} maxLength={100_000} onChange={(event) => updateDraft(selectedTab, { jobDescription: event.target.value })} placeholder="Paste the complete role description…" />
        <div className="field-meta"><span>{!draft.jobDescription.trim() && "A job description is required."}</span><span>{draft.jobDescription.length.toLocaleString()} / 100,000</span></div>

        <div className="questions-title"><h3>Application questions</h3><span>{draft.questions.length} / 50</span></div>
        <div className="questions">
          {draft.questions.map((question, index) => <div className="question" key={index}>
            <label htmlFor={`${selectedTab}-q-${index}`}>Question {index + 1}</label>
            <div className="question-row"><textarea id={`${selectedTab}-q-${index}`} value={question} maxLength={10_000} rows={2} onChange={(event) => updateDraft(selectedTab, (current) => ({ ...current, questions: current.questions.map((item, itemIndex) => itemIndex === index ? event.target.value : item) }))} />
              {index >= 5 && <button className="icon-button" aria-label={`Remove question ${index + 1}`} onClick={() => updateDraft(selectedTab, (current) => ({ ...current, questions: current.questions.filter((_, itemIndex) => itemIndex !== index) }))}>×</button>}
            </div>
          </div>)}
        </div>
        <button className="secondary" disabled={draft.questions.length >= 50} onClick={() => updateDraft(selectedTab, (current) => ({ ...current, questions: [...current.questions, ""] }))}>+ Add question</button>
      </section>

      <section className="panel configuration" aria-labelledby="configuration-heading">
        <div className="section-heading"><span>02</span><div><h2 id="configuration-heading">Generator configuration</h2><p>Choose one compatible local skill and model.</p></div></div>
        <label htmlFor={`${selectedTab}-skill`}>CV skill <em>Required</em></label>
        <select id={`${selectedTab}-skill`} value={draft.skillName} onChange={(event) => {
          const skillName = event.target.value;
          const preferences = loadPreferences();
          const skill = bootstrap?.skills.find((item) => item.name === skillName);
          const defaults = parameterDefaults(skill?.parameterSchema);
          const skillParameters = { ...defaults, ...(preferences.skillParametersByName[skillName] ?? {}) };
          const next = { ...draft, skillName, skillParameters };
          updateDraft(selectedTab, next); persistSelection(next);
        }}><option value="">Select a skill…</option>{bootstrap?.skills.map((skill) => <option key={skill.name} value={skill.name} disabled={!skill.runnable}>{skill.displayName}{!skill.runnable ? " — incompatible" : ""}</option>)}</select>
        {selectedSkill && <p className="description">{selectedSkill.description}{selectedSkill.disabledReason && ` ${selectedSkill.disabledReason}`}</p>}
        {selectedSkill?.parameterSchema && <ParameterFields schema={selectedSkill.parameterSchema} values={draft.skillParameters} onChange={(skillParameters) => { const next = { ...draft, skillParameters }; updateDraft(selectedTab, next); persistSelection(next); }} />}

        <label htmlFor={`${selectedTab}-model`}>Model <em>Required</em></label>
        <select id={`${selectedTab}-model`} value={draft.model} onChange={(event) => {
          const model = bootstrap?.models.find((item) => item.model === event.target.value);
          if (!model) return;
          const next = { ...draft, model: model.model, effort: fallbackEffort(model, draft.effort) };
          updateDraft(selectedTab, next); persistSelection(next); notify("Model and reasoning effort saved as defaults.");
        }}>{bootstrap?.models.map((model) => <option key={model.model} value={model.model}>{model.displayName}</option>)}</select>

        <fieldset><legend>Reasoning effort</legend><div className="efforts">{(["low", "medium", "high"] as ReasoningEffort[]).map((effort) => <label key={effort} className={draft.effort === effort ? "effort selected" : "effort"}><input type="radio" name={`${selectedTab}-effort`} checked={draft.effort === effort} disabled={!selectedModel?.supportedEfforts.includes(effort)} onChange={() => { const next = { ...draft, effort }; updateDraft(selectedTab, next); persistSelection(next); notify("Reasoning effort saved as the default."); }} /><span>{effort === "low" ? "Light" : effort[0]!.toUpperCase() + effort.slice(1)}</span></label>)}</div></fieldset>
        <button className="refresh-link" onClick={() => void refresh()}>Refresh skills & models</button>

        <div className="run-card">
          <div><span className="run-label">Application status</span><strong>{run ? statusLabels[run.generation.status] : "Ready to begin"}</strong>{isRunning && <small className="backend-running"><span />Backend processing is active</small>}{run?.generation.codexStatus && <small>Codex: {run.generation.codexStatus}</small>}</div>
          {isRunning ? <button className="danger" onClick={() => void cancel()}>Cancel generation</button> : <button className="primary" disabled={!canGenerate} onClick={() => void generate()}>Generate CV</button>}
        </div>
        {run && <ActivityPanel events={run.events ?? []} active={isRunning} />}
        {run?.generation.error && <div className="inline-error">{run.generation.error}</div>}
        {run?.pendingInput && <InteractiveInput run={run} token={sessionToken} onDone={() => void loadGeneration(selectedTab, run.generation.id)} />}
      </section>
    </main>}

    {page === "applications" && run?.generation.status === "completed" && run.result && <ResultPanel result={run.result} generationId={run.generation.id} pdfPath={run.generation.pdfPath} pdfWarning={run.generation.pdfWarning} onNotify={notify} />}
    {page === "applications" && run && ["completed", "failed", "cancelled"].includes(run.generation.status) && <section className="retention panel"><div><strong>{run.generation.kept ? "Kept on this machine" : `Automatic deletion ${run.generation.expiresAt ? new Date(run.generation.expiresAt).toLocaleString() : "scheduled"}`}</strong><p>Each generation retains its own input snapshot, diagnostics, and validated result.</p></div><div className="retention-actions"><button className="primary" onClick={resetApplication}>Reset application</button><button className="secondary" onClick={() => void updateKeep(!run.generation.kept)}>{run.generation.kept ? "Remove keep" : "Keep"}</button><button className="danger" onClick={() => void deleteRun()}>Delete now</button></div></section>}
    <footer><span>Codex {bootstrap?.codexVersion ?? "—"}</span><span>Active workspaces {bootstrap?.capacity.active ?? 0} / {bootstrap?.capacity.limit ?? GENERATION_CAPACITY}</span><span>Runs stay on this machine</span></footer>
  </div>;
}

function parameterDefaults(schema?: ParameterSchema): Record<string, unknown> {
  if (!schema) return {};
  return Object.fromEntries(Object.entries(schema.properties).flatMap(([name, property]) => property.default !== undefined ? [[name, property.default]] : []));
}

function validateParameters(schema: ParameterSchema | undefined, values: Record<string, unknown>): boolean {
  if (!schema) return Object.keys(values).length === 0;
  if (!(schema.required ?? []).every((name) => values[name] !== undefined && values[name] !== "")) return false;
  return Object.entries(values).every(([name, value]) => {
    const property = schema.properties[name];
    if (!property) return false;
    if (property.enum && !property.enum.includes(value as never)) return false;
    if (property.type === "string") return typeof value === "string";
    if (property.type === "boolean") return typeof value === "boolean";
    if (property.type === "integer") return Number.isInteger(value) && (property.minimum === undefined || Number(value) >= property.minimum) && (property.maximum === undefined || Number(value) <= property.maximum);
    return typeof value === "number" && Number.isFinite(value) && (property.minimum === undefined || value >= property.minimum) && (property.maximum === undefined || value <= property.maximum);
  });
}

function ParameterFields({ schema, values, onChange }: { schema: ParameterSchema; values: Record<string, unknown>; onChange(values: Record<string, unknown>): void }) {
  return <div className="parameters">{Object.entries(schema.properties).map(([name, property]) => {
    const label = property.title ?? name; const required = schema.required?.includes(name);
    if (property.type === "boolean") return <label className="checkbox" key={name}><input type="checkbox" checked={Boolean(values[name])} onChange={(event) => onChange({ ...values, [name]: event.target.checked })} />{label}{required && <em>Required</em>}</label>;
    if (property.enum) return <div key={name}><label htmlFor={`parameter-${name}`}>{label} {required && <em>Required</em>}</label><select id={`parameter-${name}`} value={String(values[name] ?? "")} onChange={(event) => { const next = { ...values }; if (event.target.value === "") delete next[name]; else next[name] = property.type === "integer" || property.type === "number" ? Number(event.target.value) : event.target.value; onChange(next); }}><option value="">Select…</option>{property.enum.map((option) => <option key={String(option)} value={String(option)}>{String(option)}</option>)}</select></div>;
    return <div key={name}><label htmlFor={`parameter-${name}`}>{label} {required && <em>Required</em>}</label><input id={`parameter-${name}`} type={property.type === "integer" || property.type === "number" ? "number" : "text"} value={String(values[name] ?? "")} onChange={(event) => { const next = { ...values }; if (event.target.value === "") delete next[name]; else next[name] = property.type === "integer" || property.type === "number" ? Number(event.target.value) : event.target.value; onChange(next); }} /></div>;
  })}</div>;
}

function InteractiveInput({ run, token, onDone }: { run: GenerationPayload; token: string; onDone(): void }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const pending = run.pendingInput!;
  async function submit(action: "accept" | "cancel") {
    await api(`/api/generations/${run.generation.id}/input-response`, token, { method: "POST", body: JSON.stringify({ requestId: pending.requestId, action, answers }) });
    onDone();
  }
  return <div className="input-request"><strong>Codex needs input</strong>{pending.questions.map((question) => <div key={question.id}><label htmlFor={`input-${question.id}`}>{question.question}</label>{question.options?.length ? <select id={`input-${question.id}`} value={answers[question.id] ?? ""} onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value })}><option value="">Select…</option>{question.options.map((option) => <option key={option.label}>{option.label}</option>)}</select> : <input id={`input-${question.id}`} value={answers[question.id] ?? ""} onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value })} />}</div>)}<div className="actions"><button className="primary" onClick={() => void submit("accept")}>Continue</button><button className="danger" onClick={() => void submit("cancel")}>Cancel generation</button></div></div>;
}

function SettingsPage({ value, savedValue, saving, onChange, onSave }: { value: string; savedValue: string; saving: boolean; onChange(value: string): void; onSave(): void }) {
  const valid = value.trim().startsWith("/") || /^[A-Za-z]:[\\\\/]/.test(value.trim());
  return <main className="settings-page panel">
    <div className="section-heading"><span>SET</span><div><h2>PDF output settings</h2><p>Configure the default disk location used by every completed generation.</p></div></div>
    <div className="settings-grid">
      <div>
        <label htmlFor="pdf-output-directory">Default CV output directory <em>Required</em></label>
        <input id="pdf-output-directory" value={value} maxLength={4_096} onChange={(event) => onChange(event.target.value)} placeholder="/Users/you/Documents/CVs" autoComplete="off" />
        <p className="description">Use an absolute directory path. The backend creates it if needed and verifies that it is writable.</p>
        {value && !valid && <p className="settings-error" role="alert">Enter an absolute path, such as <code>/Users/you/Documents/CVs</code>.</p>}
        <button className="primary" disabled={!valid || saving || value === savedValue} onClick={onSave}>{saving ? "Saving…" : "Save output directory"}</button>
      </div>
      <aside className="path-preview"><span>Generated PDF layout</span><code>{value || "/your/output/directory"}/yy_mm_dd/Person_Company.pdf</code><p>JSON remains preserved in the isolated generation record. The styled PDF is also copied to this directory.</p></aside>
    </div>
  </main>;
}

function ActivityPanel({ events, active }: { events: GenerationEvent[]; active: boolean }) {
  const activity = events.filter((event) => event.type === "status" || event.type === "progress").slice(-18);
  return <section className={`activity-panel ${active ? "active" : ""}`} aria-label="Codex activity" aria-live="polite">
    <div className="activity-heading"><div>{active && <span className="spinner" />}<strong>{active ? "Live backend activity" : "Generation activity"}</strong></div><span>{activity.length} updates</span></div>
    {active && <div className="activity-track"><span /></div>}
    <ol>{activity.map((event) => <li key={event.id} className={event.data.kind === "agent_message" ? "agent-log" : ""}><time>{new Date(event.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time><span>{activityMessage(event)}</span></li>)}</ol>
  </section>;
}

function activityMessage(event: GenerationEvent): string {
  if (typeof event.data.message === "string") return event.data.message;
  if (typeof event.data.status === "string") return statusLabels[event.data.status] ?? event.data.status;
  return "Generation updated.";
}

export function ResultPanel({ result, generationId, pdfPath, pdfWarning, onNotify }: { result: Record<string, unknown>; generationId: string; pdfPath?: string; pdfWarning?: string; onNotify(message: string): void }) {
  const answers = Array.isArray(result.jobQuestionAnswers) ? result.jobQuestionAnswers as Array<{ question: string; answer: string }> : [];
  const json = JSON.stringify(result, null, 2);
  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      onNotify(`${label} copied to clipboard.`);
    } catch {
      onNotify(`Could not copy ${label.toLowerCase()}.`);
    }
  }
  const allAnswers = answers.map((answer, index) => `${index + 1}. ${answer.question}\n${answer.answer}`).join("\n\n");
  return <section className="results panel"><div className="section-heading"><span>03</span><div><h2>Generated CV and answers</h2><p>The JSON was validated, rendered through the CV template, and saved as PDF.</p></div></div>{pdfPath && <div className="pdf-success"><span>PDF saved</span><strong>{pdfPath}</strong>{pdfWarning && <p>{pdfWarning}</p>}</div>}<div className="result-actions"><a className="button-link primary" href={`/api/generations/${generationId}/pdf`} onClick={() => onNotify("CV PDF download started.")}>Download CV PDF</a><button className="secondary" onClick={() => void copy(json, "CV JSON")}>Copy CV JSON</button>{answers.length > 0 && <button className="secondary" onClick={() => void copy(allAnswers, "All answers")}>Copy all answers</button>}<a className="button-link" href={`/api/generations/${generationId}/download`} onClick={() => onNotify("CV JSON download started.")}>Download JSON</a></div><h3>{String(result.personNameOnCV ?? "Tailored CV")}</h3><p className="summary">{String(result.summary ?? "")}</p>{answers.length > 0 && <div className="answers"><h3>Application answers</h3>{answers.map((answer, index) => <article key={index}><span>Question {index + 1}</span><strong>{answer.question}</strong><p>{answer.answer}</p><button className="refresh-link" onClick={() => void copy(answer.answer, `Answer ${index + 1}`)}>Copy answer</button></article>)}</div>}<details><summary>Raw JSON</summary><pre>{json}</pre></details></section>;
}
