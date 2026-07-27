import type {
  TaxProfile,
  DeductionInput,
  DeductionBreakdownItem,
  TaxResult,
} from "@/lib/types";
import {
  TAX_BRACKETS_BY_YEAR,
  DEFAULT_TAX_BRACKETS,
  EMPLOYMENT_INCOME_DEDUCTION_TABLE,
  FREELANCE_EXPENSE_RATE,
  BASIC_DEDUCTION_PER_PERSON,
  WITHHOLDING_BUFFER,
  COMPREHENSIVE_FILING_THRESHOLD,
  INCOME_MAX,
  DEPENDENTS_MAX,
  DEDUCTION_LIMITS,
  DEDUCTION_LABELS,
  DEDUCTION_CREDIT_RATE,
  DEDUCTION_KEYS,
} from "@/lib/taxTables";

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value);
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function calcEmploymentDeduction(salary: number): number {
  const s = Math.max(0, salary);
  for (const bracket of EMPLOYMENT_INCOME_DEDUCTION_TABLE) {
    if (s <= bracket.upTo) {
      return round(bracket.base + (s - bracket.floor) * bracket.rate);
    }
  }
  return 0;
}

function calcProgressiveTax(
  taxableIncome: number,
  brackets = DEFAULT_TAX_BRACKETS
): number {
  const income = Math.max(0, taxableIncome);
  for (const bracket of brackets) {
    if (income <= bracket.max) {
      return Math.max(0, round(income * bracket.rate - bracket.deduction));
    }
  }
  return 0;
}

function clampedDeductions(deductions: DeductionInput): DeductionInput {
  return {
    creditCard: clamp(deductions.creditCard, 0, DEDUCTION_LIMITS.creditCard),
    medical: clamp(deductions.medical, 0, DEDUCTION_LIMITS.medical),
    education: clamp(deductions.education, 0, DEDUCTION_LIMITS.education),
    irp: clamp(deductions.irp, 0, DEDUCTION_LIMITS.irp),
    insurance: clamp(deductions.insurance, 0, DEDUCTION_LIMITS.insurance),
  };
}

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
  const annualSalary = clamp(profile.annualSalary, 0, INCOME_MAX);
  const freelanceIncome = clamp(profile.freelanceIncome, 0, INCOME_MAX);
  const dependents = clamp(profile.dependents, 0, DEPENDENTS_MAX);

  const employmentDeduction = calcEmploymentDeduction(annualSalary);
  const earnedIncomeAmount = Math.max(0, annualSalary - employmentDeduction);
  const freelanceIncomeAmount = round(freelanceIncome * (1 - FREELANCE_EXPENSE_RATE));
  const totalIncomeAmount = earnedIncomeAmount + freelanceIncomeAmount;

  const personalDeduction = BASIC_DEDUCTION_PER_PERSON * (dependents + 1);
  const taxableIncome = Math.max(0, totalIncomeAmount - personalDeduction);

  const brackets = TAX_BRACKETS_BY_YEAR[profile.taxYear] ?? DEFAULT_TAX_BRACKETS;
  const courseTax = calcProgressiveTax(taxableIncome, brackets);

  const breakdown = calcDeductionBreakdown(profile, deductions);
  const totalCredits = breakdown.reduce((sum, item) => sum + item.savedTax, 0);

  const estimatedTax = Math.max(0, round(courseTax - totalCredits));
  const withheld = round(courseTax * WITHHOLDING_BUFFER);
  const refund = withheld - estimatedTax;

  const grossIncome = annualSalary + freelanceIncome;
  const effectiveRate = grossIncome > 0 ? clamp(round4(estimatedTax / grossIncome), 0, 1) : 0;

  return {
    profileId: profile.id,
    taxYear: profile.taxYear,
    estimatedTax,
    withheld,
    refund,
    effectiveRate,
    needsComprehensiveFiling: judgeComprehensiveFiling(profile),
    deductionBreakdown: breakdown,
    computedAt,
  };
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
  const clamped = clampedDeductions(deductions);

  return DEDUCTION_KEYS.map((key) => ({
    key,
    label: DEDUCTION_LABELS[key],
    savedTax: round(clamped[key] * DEDUCTION_CREDIT_RATE[key]),
  }));
}

/**
 * Judge if profile requires comprehensive income tax filing.
 * Rule: freelanceIncome > 3,000,000 → true
 */
export function judgeComprehensiveFiling(profile: TaxProfile): boolean {
  const freelanceIncome = clamp(profile.freelanceIncome, 0, INCOME_MAX);
  return freelanceIncome > COMPREHENSIVE_FILING_THRESHOLD;
}
