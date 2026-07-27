import type { TaxProfile, DeductionInput, TaxResult, AppMeta, ChecklistState } from './types';

type WriteResult = { ok: true } | { ok: false; reason: 'quota' };

export function saveProfile(profile: TaxProfile): WriteResult {
  throw new Error('not implemented');
}

export function loadProfile(profileId: string): TaxProfile | null {
  throw new Error('not implemented');
}

export function saveDeductions(profileId: string, deductions: DeductionInput): WriteResult {
  throw new Error('not implemented');
}

export function loadDeductions(profileId: string): DeductionInput | null {
  throw new Error('not implemented');
}

export function saveResult(profileId: string, result: TaxResult): WriteResult {
  throw new Error('not implemented');
}

export function loadResult(profileId: string): TaxResult | null {
  throw new Error('not implemented');
}

export function saveMeta(meta: AppMeta): WriteResult {
  throw new Error('not implemented');
}

export function loadMeta(): AppMeta | null {
  throw new Error('not implemented');
}

export function saveChecklist(checklist: ChecklistState): WriteResult {
  throw new Error('not implemented');
}

export function loadChecklist(): ChecklistState | null {
  throw new Error('not implemented');
}