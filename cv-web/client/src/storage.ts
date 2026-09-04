import type { ApplicationTabId, ReasoningEffort } from "../../shared/types";

export interface Draft {
  jobDescription: string;
  questions: string[];
  skillName: string;
  skillParameters: Record<string, unknown>;
  model: string;
  effort: ReasoningEffort;
  generationId?: string;
}

export interface Preferences {
  version: 1;
  skillName: string;
  model: string;
  effort: ReasoningEffort;
  skillParametersByName: Record<string, Record<string, unknown>>;
}

const PREFERENCE_KEY = "cv-web:preferences:v1";

export function emptyDraft(): Draft {
  return { jobDescription: "", questions: Array(5).fill(""), skillName: "", skillParameters: {}, model: "", effort: "medium" };
}

export function loadDraft(tab: ApplicationTabId): Draft {
  try {
    const stored = sessionStorage.getItem(`cv-web:draft:${tab}:v1`);
    const parsed = JSON.parse(stored ?? "null") as Partial<Draft> | null;
    if (!parsed) {
      const preferences = loadPreferences();
      return {
        ...emptyDraft(),
        skillName: preferences.skillName,
        skillParameters: preferences.skillParametersByName[preferences.skillName] ?? {},
        model: preferences.model,
        effort: preferences.effort,
      };
    }
    return { ...emptyDraft(), ...parsed, questions: Array.isArray(parsed.questions) && parsed.questions.length >= 5 ? parsed.questions : Array(5).fill("") };
  } catch {
    return emptyDraft();
  }
}

export function saveDraft(tab: ApplicationTabId, draft: Draft): void {
  sessionStorage.setItem(`cv-web:draft:${tab}:v1`, JSON.stringify(draft));
}

export function loadPreferences(): Preferences {
  try {
    const parsed = JSON.parse(localStorage.getItem(PREFERENCE_KEY) ?? "null") as Preferences | null;
    if (parsed?.version === 1) return parsed;
  } catch { /* start with safe defaults */ }
  return { version: 1, skillName: "", model: "", effort: "medium", skillParametersByName: {} };
}

export function savePreferences(preferences: Preferences): void {
  localStorage.setItem(PREFERENCE_KEY, JSON.stringify(preferences));
}
