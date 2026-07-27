import type { TaxProfile, DeductionInput, TaxResult } from "@/lib/types";
import {
  loadProfile,
  loadDeductions,
  saveResult,
  loadMeta,
  saveMeta,
} from "@/lib/storage";
import { calcTax } from "@/lib/taxEngine";

const ZERO_DEDUCTIONS: DeductionInput = {
  creditCard: 0,
  medical: 0,
  education: 0,
  irp: 0,
  insurance: 0,
};

export async function loadOrInitDeductions(
  profileId: string
): Promise<DeductionInput> {
  const loaded = loadDeductions(profileId);
  return loaded ?? { ...ZERO_DEDUCTIONS };
}

export async function simulate(
  profile: TaxProfile,
  deductions: DeductionInput,
  computedAt: number
): Promise<TaxResult | null> {
  return calcTax(profile, deductions, computedAt);
}

export async function computeAndPersistResult(
  profileId: string,
  computedAt: number
): Promise<TaxResult | null> {
  const profile = loadProfile(profileId);
  if (!profile) return null;

  const deductions = await loadOrInitDeductions(profileId);
  const result = await simulate(profile, deductions, computedAt);
  if (!result) return null;

  saveResult(profileId, result);

  const meta = loadMeta() ?? { onboardingSeen: false, lastResultByYear: {} };
  meta.lastResultByYear[profile.taxYear] = result;
  saveMeta(meta);

  return result;
}
