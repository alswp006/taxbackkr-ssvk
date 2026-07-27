# Shared Context (auto-generated — do NOT modify)


## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
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

```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
  components/
    AdSlot.tsx
    Amount.tsx
    BottomCTA.tsx
    Card.tsx
    CountUp.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
    PageShell.tsx
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
  hooks/
  lib/
    storage.ts
    types.ts
    utils.ts
  main.tsx
  pages/
    Home.tsx
    __TdsGallery.tsx
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void
- types.ts: export type IncomeType = "employee" | "freelancer" | "multi"; export interface TaxProfile; export interface DeductionInput; export interface DeductionBreakdownItem; export interface TaxResult; export type ChecklistItemKey = "irp" | "pension" | "medical" | "creditCardRatio" | "insurance"; export interface ChecklistItem; export interface ChecklistState
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string

### Components (src/components/)
- AdSlot.tsx: AdSlot
- Amount.tsx: Amount
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- CountUp.tsx: CountUp
- FloatingTabBar.tsx: FloatingTabBar
- MiniBar.tsx: MiniBar
- PageShell.tsx: PageShell
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: TypeScript 타입 + RouteState 계약 정의 (files: src/lib/types.ts)
- 0002: localStorage CRUD 헬퍼 (files: src/lib/storage.ts)
- 0003: 세금 계산 엔진 + 세율표 상수 (files: src/lib/taxEngine.ts, src/lib/taxTables.ts)