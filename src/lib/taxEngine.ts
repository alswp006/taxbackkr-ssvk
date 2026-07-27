import type {
  TaxProfile,
  DeductionInput,
  DeductionBreakdownItem,
  TaxResult,
} from "./types";

/**
 * Calculate tax result based on profile and deductions.
 * Returns TaxResult with estimatedTax, withheld, refund, and effectiveRate.
 * Refund identity: refund = withheld - estimatedTax
 */
export function calcTax(
  profile: TaxProfile,
  deductions: DeductionInput,
  computedAt: number
): TaxResult {
  // TODO: Implement tax calculation engine
  throw new Error("Not implemented");
}

/**
 * Calculate deduction breakdown for each item.
 * Clamps each deduction to its limit and calculates tax savings.
 * Returns array of { key, label, savedTax }
 */
export function calcDeductionBreakdown(
  profile: TaxProfile,
  deductions: DeductionInput
): DeductionBreakdownItem[] {
  // TODO: Implement deduction breakdown calculation
  throw new Error("Not implemented");
}

/**
 * Judge if profile requires comprehensive income tax filing.
 * Rule: freelanceIncome > 3,000,000 → true
 */
export function judgeComprehensiveFiling(profile: TaxProfile): boolean {
  // TODO: Implement comprehensive filing judgment
  throw new Error("Not implemented");
}
