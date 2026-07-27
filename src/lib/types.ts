export type IncomeType = "employee" | "freelancer" | "multi";

export interface TaxProfile {
  id: string;
  taxYear: number;
  incomeType: IncomeType;
  annualSalary: number;
  freelanceIncome: number;
  dependents: number;
  createdAt: number;
  updatedAt: number;
}

export interface DeductionInput {
  creditCard: number;
  medical: number;
  education: number;
  irp: number;
  insurance: number;
}

export interface DeductionBreakdownItem {
  key: keyof DeductionInput;
  label: string;
  savedTax: number;
}

export interface TaxResult {
  profileId: string;
  taxYear: number;
  estimatedTax: number;
  withheld: number;
  refund: number;
  effectiveRate: number;
  needsComprehensiveFiling: boolean;
  deductionBreakdown: DeductionBreakdownItem[];
  computedAt: number;
}

export type ChecklistItemKey = "irp" | "pension" | "medical" | "creditCardRatio" | "insurance";

export interface ChecklistItem {
  key: ChecklistItemKey;
  label: string;
  limit: number;
  current: number;
  done: boolean;
}

export interface ChecklistState {
  taxYear: number;
  items: ChecklistItem[];
  achievedRate: number;
}

export interface AppMeta {
  onboardingSeen: boolean;
  lastResultByYear: Record<number, TaxResult>;
}

export type RouteState = {
  "/": undefined;
  "/input": undefined | { editProfileId: string };
  "/result": { profileId: string };
  "/simulate": { profileId: string; focusKey?: keyof DeductionInput };
  "/filing": undefined;
  "/checklist": undefined;
};

export const STORAGE_KEYS = {
  profile: "taxback:profile:v1",
  deductions: "taxback:deductions:v1",
  result: "taxback:result:v1",
  checklist: "taxback:checklist:v1",
  meta: "taxback:meta:v1",
} as const;
