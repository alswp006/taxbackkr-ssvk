import type {
  ChecklistItem,
  ChecklistItemKey,
  ChecklistState,
  DeductionInput,
  TaxResult,
} from "@/lib/types";

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

const EMPTY_DEDUCTIONS: DeductionInput = {
  creditCard: 0,
  medical: 0,
  education: 0,
  irp: 0,
  insurance: 0,
};

// 연금저축(단독 한도 600만)과 IRP(연금저축 포함 합산 한도 900만)는 같은 irp 입력값을
// 서로 다른 한도로 검사한다 — 실제 세법상 두 한도가 하나의 계좌 합계에서 파생되기 때문.
const CHECKLIST_CONFIG: Record<
  ChecklistItemKey,
  { label: string; limit: number; currentOf: (d: DeductionInput) => number }
> = {
  irp: { label: "IRP·연금계좌 합산", limit: 9_000_000, currentOf: (d) => d.irp },
  pension: { label: "연금저축", limit: 6_000_000, currentOf: (d) => d.irp },
  medical: { label: "의료비", limit: 3_000_000, currentOf: (d) => d.medical },
  creditCardRatio: { label: "신용카드 사용액", limit: 30_000_000, currentOf: (d) => d.creditCard },
  insurance: { label: "보장성보험료", limit: 2_000_000, currentOf: (d) => d.insurance },
};

const CHECKLIST_ORDER: ChecklistItemKey[] = ["irp", "pension", "medical", "creditCardRatio", "insurance"];

export function buildChecklistState(
  deductions: DeductionInput,
  taxYear: number
): ChecklistState {
  const safeDeductions = deductions ?? EMPTY_DEDUCTIONS;

  const items: ChecklistItem[] = CHECKLIST_ORDER.map((key) => {
    const config = CHECKLIST_CONFIG[key];
    const current = config.currentOf(safeDeductions);
    return {
      key,
      label: config.label,
      limit: config.limit,
      current,
      done: current >= config.limit * 0.9,
    };
  });

  const achievedRate = items.filter((item) => item.done).length / items.length;

  return { taxYear, items, achievedRate };
}

export function compareResults(meta: Record<number, TaxResult>): ComparisonResult {
  const results = Object.values(meta ?? {});

  if (results.length <= 1) {
    return { insufficient: true };
  }

  const sorted = [...results].sort((a, b) => a.taxYear - b.taxYear);
  const years = sorted.map((r) => r.taxYear);
  const refunds = sorted.map((r) => r.refund);
  const diff = refunds[refunds.length - 1] - refunds[0];

  return { years, refunds, diff };
}

export function computeSeasonBanner(month: number): SeasonBannerState {
  if (month >= 1 && month <= 5) {
    return {
      active: true,
      message: "지금은 연말정산·종합소득세 시즌이에요. 환급액을 확인해보세요",
    };
  }
  return { active: false };
}
