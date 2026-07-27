import type { DeductionInput, ChecklistState, TaxResult } from "@/lib/types";

export interface ComparisonResult {
  insufficient?: boolean;
  years?: number[];
  refunds?: number[];
  diff?: number;
}

export interface SeasonBannerState {
  active: boolean;
  message?: string;
}

export function buildChecklistState(
  deductions: DeductionInput,
  taxYear: number
): ChecklistState {
  throw new Error("Not implemented");
}

export function compareResults(meta: Record<number, TaxResult>): ComparisonResult {
  throw new Error("Not implemented");
}

export function computeSeasonBanner(month: number): SeasonBannerState {
  throw new Error("Not implemented");
}
