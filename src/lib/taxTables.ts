import type { DeductionInput } from "@/lib/types";

/**
 * 국세청 종합소득세 누진세율표 (2023~2026, 과세표준 기준)
 * courseTax = taxableIncome * rate - deduction
 */
export interface TaxBracket {
  max: number;
  rate: number;
  deduction: number;
}

const STANDARD_BRACKETS: TaxBracket[] = [
  { max: 12_000_000, rate: 0.06, deduction: 0 },
  { max: 46_000_000, rate: 0.15, deduction: 1_260_000 },
  { max: 88_000_000, rate: 0.24, deduction: 5_760_000 },
  { max: 150_000_000, rate: 0.35, deduction: 15_440_000 },
  { max: 300_000_000, rate: 0.38, deduction: 19_940_000 },
  { max: 500_000_000, rate: 0.40, deduction: 25_940_000 },
  { max: 1_000_000_000, rate: 0.42, deduction: 35_940_000 },
  { max: Infinity, rate: 0.45, deduction: 65_940_000 },
];

export const TAX_BRACKETS_BY_YEAR: Record<number, TaxBracket[]> = {
  2023: STANDARD_BRACKETS,
  2024: STANDARD_BRACKETS,
  2025: STANDARD_BRACKETS,
  2026: STANDARD_BRACKETS,
};

export const DEFAULT_TAX_BRACKETS = STANDARD_BRACKETS;

/**
 * 근로소득공제표 (총급여 구간별 base + rate*(총급여-floor))
 */
export interface EmploymentDeductionBracket {
  upTo: number;
  floor: number;
  base: number;
  rate: number;
}

export const EMPLOYMENT_INCOME_DEDUCTION_TABLE: EmploymentDeductionBracket[] = [
  { upTo: 5_000_000, floor: 0, base: 0, rate: 0.7 },
  { upTo: 15_000_000, floor: 5_000_000, base: 3_500_000, rate: 0.4 },
  { upTo: 45_000_000, floor: 15_000_000, base: 7_500_000, rate: 0.15 },
  { upTo: 100_000_000, floor: 45_000_000, base: 12_000_000, rate: 0.05 },
  { upTo: Infinity, floor: 100_000_000, base: 14_750_000, rate: 0.02 },
];

/** 사업/기타소득 단순경비율(간소화) */
export const FREELANCE_EXPENSE_RATE = 0.6;

/** 인적공제(본인 포함 1인당) */
export const BASIC_DEDUCTION_PER_PERSON = 1_500_000;

/** 원천징수 간이 추정 배율(산출세액 대비) — 통상 소폭 과다원천징수되어 환급 발생 */
export const WITHHOLDING_BUFFER = 1.1;

/** 종합소득세 신고 대상 임계값(기타·사업소득, 원) — 초과 시 대상 */
export const COMPREHENSIVE_FILING_THRESHOLD = 3_000_000;

/** 소득/입력 클램프 한도 */
export const INCOME_MAX = 1_000_000_000;
export const DEPENDENTS_MAX = 15;

export const DEDUCTION_LIMITS: Record<keyof DeductionInput, number> = {
  creditCard: 3_000_000,
  medical: 7_000_000,
  education: 9_000_000,
  irp: 9_000_000,
  insurance: 1_000_000,
};

export const DEDUCTION_LABELS: Record<keyof DeductionInput, string> = {
  creditCard: "신용카드",
  medical: "의료비",
  education: "교육비",
  irp: "IRP/연금저축",
  insurance: "보험료",
};

/** 항목별 세액공제/소득공제 인정율(간소화) */
export const DEDUCTION_CREDIT_RATE: Record<keyof DeductionInput, number> = {
  creditCard: 0.15,
  medical: 0.15,
  education: 0.15,
  irp: 0.15,
  insurance: 0.12,
};

export const DEDUCTION_KEYS: (keyof DeductionInput)[] = [
  "creditCard",
  "medical",
  "education",
  "irp",
  "insurance",
];
