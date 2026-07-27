import type { TaxProfile, DeductionInput, TaxResult, AppMeta, ChecklistState } from './types';
import { STORAGE_KEYS } from './types';

type WriteResult = { ok: true } | { ok: false; reason: 'quota' };

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJSON<T>(key: string, value: T): WriteResult {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch {
    return { ok: false, reason: 'quota' };
  }
}

export function saveProfile(profile: TaxProfile): WriteResult {
  const toSave: TaxProfile = { ...profile, updatedAt: Date.now() };
  return writeJSON(`${STORAGE_KEYS.profile}::${profile.id}`, toSave);
}

export function loadProfile(profileId: string): TaxProfile | null {
  return readJSON<TaxProfile>(`${STORAGE_KEYS.profile}::${profileId}`);
}

export function saveDeductions(profileId: string, deductions: DeductionInput): WriteResult {
  return writeJSON(`${STORAGE_KEYS.deductions}::${profileId}`, deductions);
}

export function loadDeductions(profileId: string): DeductionInput | null {
  return readJSON<DeductionInput>(`${STORAGE_KEYS.deductions}::${profileId}`);
}

export function saveResult(profileId: string, result: TaxResult): WriteResult {
  return writeJSON(`${STORAGE_KEYS.result}::${profileId}`, result);
}

export function loadResult(profileId: string): TaxResult | null {
  return readJSON<TaxResult>(`${STORAGE_KEYS.result}::${profileId}`);
}

export function saveMeta(meta: AppMeta): WriteResult {
  return writeJSON(STORAGE_KEYS.meta, meta);
}

export function loadMeta(): AppMeta | null {
  return readJSON<AppMeta>(STORAGE_KEYS.meta);
}

export function saveChecklist(checklist: ChecklistState): WriteResult {
  return writeJSON(STORAGE_KEYS.checklist, checklist);
}

export function loadChecklist(): ChecklistState | null {
  return readJSON<ChecklistState>(STORAGE_KEYS.checklist);
}
