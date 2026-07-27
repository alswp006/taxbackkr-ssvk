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

/** 앱은 단일 활성 프로필만 유지한다([Assumptions] #7) — 프로필 저장/조회는 이 고정 id로 스코프됨 */
export const CURRENT_PROFILE_ID = "current";

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
    derive.ts
    storage.ts
    taxEngine.ts
    taxTables.ts
    types.ts
    utils.ts
  main.tsx
  pages/
    Home.tsx
    __TdsGallery.tsx
  services/
    sessionService.ts
    taxService.ts
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- derive.ts: export interface ComparisonResult; export interface SeasonBannerState; export function buildChecklistState( deductions: DeductionInput, taxYear: number ): ChecklistState; export function compareResults(meta: Record<number, TaxResult>): ComparisonResult; export function computeSeasonBanner(month: number): SeasonBannerState
- storage.ts: export function saveProfile(profile: TaxProfile): WriteResult; export function loadProfile(profileId: string): TaxProfile | null; export function saveDeductions(profileId: string, deductions: DeductionInput): WriteResult; export function loadDeductions(profileId: string): DeductionInput | null; export function saveResult(profileId: string, result: TaxResult): WriteResult; export function loadResult(profileId: string): TaxResult | null; export function saveMeta(meta: AppMeta): WriteResult; export function loadMeta(): AppMeta | null
- taxEngine.ts: export function calcTax( profile: TaxProfile, deductions: DeductionInput, computedAt: number ): TaxResult; export function calcDeductionBreakdown( profile: TaxProfile, deductions: DeductionInput ): DeductionBreakdownItem[]; export function judgeComprehensiveFiling(profile: TaxProfile): boolean
- taxTables.ts: export interface TaxBracket; export const TAX_BRACKETS_BY_YEAR: Record<number, TaxBracket[]> =; export const DEFAULT_TAX_BRACKETS = STANDARD_BRACKETS; export interface EmploymentDeductionBracket; export const EMPLOYMENT_INCOME_DEDUCTION_TABLE: EmploymentDeductionBracket[] = [; export const FREELANCE_EXPENSE_RATE = 0.6; export const BASIC_DEDUCTION_PER_PERSON = 1_500_000; export const WITHHOLDING_BUFFER = 1.1
- types.ts: export type IncomeType = "employee" | "freelancer" | "multi"; export interface TaxProfile; export interface DeductionInput; export interface DeductionBreakdownItem; export interface TaxResult; export type ChecklistItemKey = "irp" | "pension" | "medical" | "creditCardRatio" | "insurance"; export interface ChecklistItem; export interface ChecklistState
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string; export function generateId(): string

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

### Module Dependencies (import graph)
  lib/derive.ts → imports: lib/types
  lib/taxEngine.ts → imports: lib/types, lib/taxTables
  lib/taxTables.ts → imports: lib/types
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: TypeScript 타입 + RouteState 계약 정의 (files: src/lib/types.ts)
- 0002: localStorage CRUD 헬퍼 (files: src/lib/storage.ts)
- 0003: 세금 계산 엔진 + 세율표 상수 (files: src/lib/taxEngine.ts, src/lib/taxTables.ts)
- 0004: 파생 상태 헬퍼 (체크리스트·연도비교·시즌배너) (files: src/lib/derive.ts)
- 0005: 세금 계산 서비스 파사드 (files: src/services/taxService.ts)
- 0006: 세션·리워드 서비스 (files: src/services/sessionService.ts)
- 0007: 소득 입력 페이지 /input (files: src/pages/Input.tsx)
- 0008: 환급 결과 페이지 /result (리워드 게이트+배너) (files: src/pages/Result.tsx)
- heal-1-01: 앱셸 라우팅 + Provider + 스캐폴드 계약 확정 (files: src/App.tsx, src/router.tsx, src/app/AppProviders.tsx, src/app/tabs.ts, src/main.tsx)