Looking at the actual CURRENT TASK (not the truncated excerpts the cross-validation saw), most flagged gaps are already resolved: all epics exist, 48/48 ACs are covered, the reward-ad monetization gate lives in Task 3.2 (F3-AC3), and year-over-year comparison is in Task 1.4 + 3.6. The one **genuine** remaining gap is PRD Feature 6's **시즌 알림 (1–5월 시즌 알림)** — it has no task. Since Toss mini apps can't use push notifications (MVP rule), this must be an **in-app seasonal banner**, driven deterministically off `taxYear`/month passed in (no `Date.now()` inside logic).

Here is the complete updated TASK with that gap closed (new: `computeSeasonBanner` in Task 1.4, seasonal banner AC in Task 3.6 as F7-AC8, and coverage table updated 48→49).

---

# TASK — TaxBackKR

## Epic 1. Data Layer

### Task 1.1 TypeScript 타입 + RouteState 정의
- **Description**: 모든 엔티티 타입(`IncomeType`, `TaxProfile`, `DeductionInput`, `TaxResult`, `ChecklistItem`, `ChecklistState`, `AppMeta`)과 페이지 간 이동 계약인 `RouteState`를 순수 타입으로 정의한다. 런타임 코드 없음. localStorage 키 상수(`STORAGE_KEYS`)도 함께 export한다.
- **DoD**:
  - `src/lib/types.ts`가 SPEC Data Models의 모든 인터페이스를 정확히 export (필드/유니온 일치)
  - `RouteState` 정의: `{ "/": undefined; "/input": undefined | { editProfileId: string }; "/result": { profileId: string }; "/simulate": { profileId: string } | { profileId: string; focusKey: keyof DeductionInput }; "/filing": undefined; "/checklist": undefined }`
  - `STORAGE_KEYS = { profile: 'taxback:profile:v1', deductions: 'taxback:deductions:v1', result: 'taxback:result:v1', checklist: 'taxback:checklist:v1', meta: 'taxback:meta:v1' }` export
  - `npm run build`(tsc) 통과, 순수 타입만 존재(함수/값 로직 없음, 단 상수 KEYS 허용)
- **Covers**: (타입 기반 — 전 페이지 RouteState 계약 지원. F1~F7 전체가 import)
- **Files**: `src/lib/types.ts`
- **Depends on**: none

### Task 1.2 localStorage CRUD 헬퍼
- **Description**: 각 엔티티 그룹(profile/deductions/result/checklist/meta)에 대한 안전한 read/write 헬퍼를 구현한다. 모든 read는 try/catch + `:v1` 키 사용, 파싱 실패 시 기본값 반환. write는 `QuotaExceededError`를 잡아 `{ ok: false, reason: 'quota' }` 반환.
- **DoD**:
  - `saveProfile(p)`, `loadProfile()`, `saveDeductions(d)`, `loadDeductions()`, `saveResult(r)`, `loadResult()`, `saveMeta(m)`, `loadMeta()` 구현
  - `saveProfile`는 `updatedAt`을 저장 시점으로 갱신, 왕복 시 나머지 필드 동일 (F1-AC2)
  - 저장값이 손상 JSON이면 `loadProfile()`이 `null` 반환, `console.error` 미출력, throw 없음 (F1-AC4)
  - write 함수는 `{ ok: true } | { ok: false, reason: 'quota' }` 반환, quota 예외 시 크래시 없음 (F1-AC5)
  - save 함수 반환 타입 통일, 모든 load는 파싱 실패 시 안전 기본값
- **Covers**: [F1-AC2, F1-AC4, F1-AC5]
- **Files**: `src/lib/storage.ts`
- **Depends on**: Task 1.1

### Task 1.3 세금 계산 엔진 (순수 로직)
- **Description**: 국세청 세율표·공제 한도 상수 테이블을 내장하고 `calcTax`, `calcDeductionBreakdown`, `judgeComprehensiveFiling`를 결정론적 순수 함수로 구현한다. 입력은 클램프 처리.
- **DoD**:
  - `calcTax(profile, deductions)` → `TaxResult` 반환. `estimatedTax >= 0`, `effectiveRate ∈ [0,1]`(소수 4자리), 항등식 `refund = withheld - estimatedTax` 성립 (F1-AC1)
  - 음수/범위 초과 입력을 0 또는 한도로 클램프. `annualSalary: -100` 입력 시 `estimatedTax = 0`, 예외 없음 (F1-AC6)
  - 동일 입력 2회 호출 시 `estimatedTax/refund/effectiveRate` 완전 동일 (Date/random 미사용, `computedAt`은 인자로 주입) (F1-AC7)
  - `judgeComprehensiveFiling(profile)`: 기타·사업소득 `> 3,000,000`이면 `true`, `=3,000,000`이면 `false` (F1-AC3, F5-AC5)
  - `calcDeductionBreakdown(profile, deductions)` → `{ key, label, savedTax }[]` 항목별 절감액, 한도 클램프 (F4-AC2)
  - 세율표/한도는 상수 테이블, 2023~2026 연도 지원
- **Covers**: [F1-AC1, F1-AC3, F1-AC6, F1-AC7, F4-AC2]
- **Files**: `src/lib/taxEngine.ts`, `src/lib/taxTables.ts`
- **Depends on**: Task 1.1

### Task 1.4 파생 상태 헬퍼 (체크리스트 · 연도 비교 · 시즌 배너)
- **Description**: `DeductionInput` → `ChecklistState` 파생, 저장된 연도별 `TaxResult` → 연도 비교 데이터 파생, 그리고 현재 월(인자 주입) 기반 **시즌 알림 배너 상태**를 순수 함수로 파생한다. 페이지에서 재사용하는 순수/경량 상태 계산 함수. **PRD Feature 6의 "1–5월 시즌 알림"은 푸시가 아닌 인앱 배너로 구현하며, 월 값은 인자로 주입해 결정론성을 보장한다(내부 `Date.now()` 금지).**
- **DoD**:
  - `buildChecklistState(deductions, taxYear)` → 5개 항목(irp/pension/medical/creditCardRatio/insurance), 각 `done = current >= limit*0.9`, `achievedRate = done비율`(0~1) 계산 (F6-AC1)
  - 5개 중 2개 done → `achievedRate = 0.4` (F6-AC2 데이터 지원)
  - `compareResults(meta)` → 최근 2개 연도 환급액과 차액(`{ years, refunds, diff }`) 반환. 저장 결과 1개 이하면 `{ insufficient: true }` (F7-AC4 데이터 지원)
  - `computeSeasonBanner(month: number)` → `1 <= month <= 5`이면 `{ active: true, message: '지금은 연말정산·종합소득세 시즌이에요. 환급액을 확인해보세요' }`, 그 외 월이면 `{ active: false }` 반환. 순수 함수(월은 인자 주입, 내부 Date 미사용) — 동일 month 2회 호출 시 완전 동일 (F7-AC8 데이터 지원)
  - deductions 없을 때 안전 기본값 반환, 크래시 없음
- **Covers**: [F6-AC1]
- **Files**: `src/lib/derive.ts`
- **Depends on**: Task 1.1, Task 1.3

> **Epic 1 Risk**: Complexity **Medium**. Risk factors: (1) 세율 계산 항등식(`refund = withheld - estimatedTax`)이 페이지에 흩어지면 불일치 위험, (2) `Array.prototype.at` 등 최신 API 사용 시 Android7 호환 실패, (3) 결정론성 깨짐(Date.now 내부 호출 — 시즌 배너 포함). Mitigation: 계산/저장/파생을 3개 태스크로 분리해 순수 로직을 페이지보다 먼저 확정 → 페이지는 검증된 함수만 호출. `computedAt`·`month`를 인자 주입으로 강제해 결정론성 보장. 최신 API 금지를 DoD에 명시.

---

## Epic 2. API Routes

외부 API 없음 (SPEC API Contract: 외부 호출 0건, 모든 계산 클라이언트 로컬). **해당 태스크 없음.**

---

## Epic 3. UI Pages

### Task 3.1 소득 입력 페이지 `/input`
- **Description**: 소득 유형 Chip, 연봉/프리랜서수입/부양가족 TextField를 받아 유효성 검사 후 프로필을 저장하고 결과로 이동. `ScreenScaffold` + `SubmitFooter` 골격.
- **DoD**:
  - `incomeType` Chip(employee/freelancer/multi), 숫자 TextField에 `inputMode="numeric"`, 포커스 시 SubmitFooter가 키보드에 안 가리게 스크롤 (F2-AC5)
  - "환급액 계산" 제출 → `saveProfile` 후 `navigate('/result', { state: { profileId } })` — state는 RouteState 캐스팅 (F2-AC1)
  - `incomeType="multi"` 선택 시 `data-testid="freelance-income-field"` 노출 (F2-AC2)
  - 빈 연봉 제출 → "연봉을 입력해주세요" 에러 텍스트, navigate 미실행 (F2-AC3)
  - `annualSalary > 1,000,000,000` → "10억원 이하로 입력해주세요" (F2-AC4)
  - 기존 `taxback:profile:v1` 있으면 전 필드 프리필, 없으면 placeholder만 (F2-AC6)
  - `ScreenScaffold`로 감싸고 1차 액션은 `SubmitFooter` 내 `display="block"` Button (F2-AC7)
  - `window.location.href`/`window.open` 외부 이동 호출 없음 (F2-AC8)
  - `location.state`를 `RouteState['/input']`로 캐스팅
- **Covers**: [F2-AC1, F2-AC2, F2-AC3, F2-AC4, F2-AC5, F2-AC6, F2-AC7, F2-AC8]
- **Files**: `src/pages/InputPage.tsx`
- **Depends on**: Task 1.2

### Task 3.2 환급 결과 페이지 `/result` (리워드 게이트 + 배너)
- **Description**: 프로필 로드 → `calcTax` → 히어로 환급액 표시. 절세 상세는 `TossRewardAd` 게이트 뒤 공개(초기 요약 결과와 명확히 구분되는 항목별 상세 분석), 카드-분석 사이에 배너. 결과 스냅샷 저장. **이 태스크가 PRD Feature 2 수익화 게이트("초기 요약 결과 → 리워드 광고 → 항목별 상세 분석 공개")의 전체 UX 플로우를 담당한다.**
- **DoD**:
  - `location.state.profileId`(RouteState 캐스팅)로 프로필 로드, `refund`를 SummaryHero CountUp + `data-testid="refund-hero"` (F3-AC1)
  - `data-testid="tax-summary-card"` Card에 "산출세액"·"실효세율" t3 강조, 환급/추가납부를 Badge로 구분(양수=환급, 음수=추가납부) — **이것이 광고 이전 "초기 요약 결과"** (F3-AC2)
  - "절세 상세 분석 보기" Button → `TossRewardAd`(slotId=env) 시청 완료 시 `data-testid="deduction-breakdown"` 리스트 노출. 리스트는 `calcDeductionBreakdown` 결과의 항목별(신용카드/의료비/교육비/IRP·연금/보험) `label` + `savedTax`(절감세액, 콤마 표기)를 각 행에 표시 — **요약 결과에 없던 항목별 상세로 구분됨** (F3-AC3)
  - 광고 실패 콜백 → Toast "광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요", 분석 잠금 유지, 크래시 없음 (F3-AC4)
  - state 없음/`loadProfile()` null → `Asset.ContentIcon` + "먼저 소득을 입력해주세요" + "입력하러 가기" Button(→`navigate('/input')`) (F3-AC5)
  - 계산 중 TDS Skeleton(히어로/카드) 후 실제 값 교체 (F3-AC6)
  - `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />`를 결과 카드와 분석 섹션 **사이**에 1개, 콘텐츠 미겹침 (F3-AC7)
  - 마운트 시 `saveResult` + `meta.lastResultByYear[taxYear]` 저장 (F3-AC8)
  - "실제 환급액과 다를 수 있어요" 고지 문구 표기
- **Covers**: [F3-AC1, F3-AC2, F3-AC3, F3-AC4, F3-AC5, F3-AC6, F3-AC7, F3-AC8]
- **Files**: `src/pages/ResultPage.tsx`
- **Depends on**: Task 1.2, Task 1.3

### Task 3.3 공제 시뮬레이션 페이지 `/simulate`
- **Description**: 5개 공제 슬라이더 조정 → 실시간 재계산 → 히어로 반영 + localStorage 저장. MiniBar 시각화, 초기화 AlertDialog.
- **DoD**:
  - 슬라이더 이동 시 300ms 이내 `refund` 히어로 재계산, `taxback:deductions:v1` 저장(debounce) (F4-AC1)
  - IRP 한도 9,000,000 초과 불가, 절감세액은 한도 기준 계산 (F4-AC2 UI)
  - 각 항목 절감 비중 `data-testid="deduction-minibar"` MiniBar, 총 절감액 t2 강조 히어로 (F4-AC3)
  - 저장 `quota` 실패 → 화면 값은 갱신, Toast "저장 공간이 부족해요" 1회(반복 억제) (F4-AC4)
  - `taxback:deductions:v1` 없으면 슬라이더 0, 공제 미반영 기준값 히어로 (F4-AC5)
  - "초기화" Button → AlertDialog "공제 입력을 초기화할까요?" "초기화" 선택 시 전 슬라이더 0 리셋 + 저장 (F4-AC6)
  - `location.state`(`{ profileId }` 또는 `{ profileId, focusKey }`) RouteState 캐스팅, `focusKey` 있으면 해당 슬라이더 포커스, 뒤로 `navigate(-1)`
- **Covers**: [F4-AC1, F4-AC3, F4-AC4, F4-AC5, F4-AC6]
- **Files**: `src/pages/SimulatePage.tsx`
- **Depends on**: Task 1.2, Task 1.3

### Task 3.4 종합소득세 판단 페이지 `/filing`
- **Description**: 저장 프로필 로드 → `judgeComprehensiveFiling` → 대상/비대상 판정 카드 + 근거 문장 + 준비물 리스트.
- **DoD**:
  - `{multi, freelanceIncome:5000000}` → "종합소득세 신고 대상입니다"를 `data-testid="filing-verdict-card"` Card로 표시 (F5-AC1)
  - `{employee, freelanceIncome:0}` → "종합소득세 신고 대상이 아닙니다" + 근거 텍스트 (F5-AC2)
  - 카드 하단 임계값 근거 문장("기타·사업소득 300만원 초과 시 대상") (F5-AC3)
  - 프로필 없음 → `Asset.ContentIcon` + "소득 정보를 먼저 입력해주세요" + 입력 이동 Button(→`navigate('/input')`) (F5-AC4)
  - `freelanceIncome:3000000` → "대상 아님", `3000001` → "대상" 일관 판정 (F5-AC5)
  - 대상 판정 시 ListRow 준비물 3개("소득/세액 신고서","경비 증빙","원천징수영수증") (F5-AC6)
  - "실제 신고는 홈택스 기준" 안내 문구 표기, `ScreenScaffold` 골격
- **Covers**: [F5-AC1, F5-AC2, F5-AC3, F5-AC4, F5-AC5, F5-AC6]
- **Files**: `src/pages/FilingPage.tsx`
- **Depends on**: Task 1.2, Task 1.3

### Task 3.5 절세 체크리스트 페이지 `/checklist`
- **Description**: `buildChecklistState`로 항목별 달성도 + 전체 달성률 시각화. 항목 탭 시 시뮬레이션 이동.
- **DoD**:
  - `done = current >= limit*0.9` 규칙 계산, `achievedRate` 표시 (F6-AC1)
  - 5개 중 2개 done → `data-testid="achieve-hero"` SummaryHero에 "40%" CountUp (F6-AC2)
  - 각 항목 TDS ListRow + `data-testid="checklist-minibar"` MiniBar, done 항목 "달성" Badge (F6-AC3)
  - deductions/checklist 저장 없음 → `Asset.ContentIcon` + "공제 항목을 입력하면 달성도를 확인할 수 있어요", 크래시 없음 (F6-AC4)
  - 로드 중 Skeleton 5행 후 실제 데이터 교체 (F6-AC5)
  - 항목 탭(터치 ≥44px) → `navigate('/simulate', { state: { profileId, focusKey: item.key } })` RouteState 준수 (F6-AC6)
- **Covers**: [F6-AC2, F6-AC3, F6-AC4, F6-AC5, F6-AC6]
- **Files**: `src/pages/ChecklistPage.tsx`
- **Depends on**: Task 1.2, Task 1.4

### Task 3.6 홈 대시보드 페이지 `/` (연도 비교 + 시즌 배너 + 온보딩)
- **Description**: 최근 환급액 히어로, 연도 비교 카드 + Sparkline, **시즌 알림 인앱 배너(1–5월)**, 첫 진입 온보딩 BottomSheet 1회. **PRD Feature 6의 "1–5월 시즌 알림"은 푸시 미지원(MVP 제약)으로 인앱 배너로 구현한다.**
- **DoD**:
  - `lastResultByYear`에 2025·2026 존재 → `data-testid="year-compare-card"` Card에 두 해 환급액 + 차액("작년 대비 +120,000원"), `data-testid="compare-sparkline"` Sparkline (F7-AC2)
  - `computeSeasonBanner(month)`가 `active:true`(1–5월)이면 홈 상단에 `data-testid="season-banner"` TDS 배너/Callout로 시즌 안내 메시지 노출, `active:false`(6–12월)이면 미노출. month는 컴포넌트 경계에서 1회 주입(파생 로직 내부 Date 미사용), 배너에 "앱 설치/외부 링크" 없음 (F7-AC8)
  - `meta.onboardingSeen === false` → 첫 진입 시 TDS BottomSheet 1회, "확인" 탭 시 `onboardingSeen=true` 저장 후 재노출 안 함 (F7-AC3)
  - 저장 결과 1개 이하 → Sparkline 대신 "비교할 작년 데이터가 없어요" + `Asset.ContentIcon` (F7-AC4)
  - 저장 결과 0개 → `Asset.ContentIcon` + "소득을 입력하고 환급액을 확인해보세요" + "환급액 계산하기" Button(→`navigate('/input')`)
  - 비교 카드 탭 → `navigate('/result', { state: { profileId } })` RouteState 준수, 파싱 실패 시 빈 상태 폴백(토스트/콘솔에러 없음)
- **Covers**: [F7-AC2, F7-AC3, F7-AC4, F7-AC8]
- **Files**: `src/pages/HomePage.tsx`
- **Depends on**: Task 1.2, Task 1.4

> **Epic 3 Risk**: Complexity **High**. Risk factors: (1) `location.state` 형태를 페이지마다 다르게 읽으면 런타임 undefined 크래시(딥링크 진입), (2) 슬라이더 실시간 재계산이 매 프레임 저장 유발해 quota/지연, (3) 리워드 광고 실패 시 잠금 미해제로 UX 막힘, (4) 시즌 배너에 Date를 페이지에서 직접 호출하면 테스트 불가·결정론 붕괴. Mitigation: Task 1.1의 `RouteState`를 전 페이지가 캐스팅해 계약 통일, 각 페이지에 프로필/state 없음 방어(빈 상태)를 DoD로 강제. 저장은 debounce + quota Toast 1회. 광고 실패 콜백에서 Toast + 잠금 유지를 명시. 시즌 배너는 `computeSeasonBanner(month)` 순수 함수 + month 주입으로 처리. 페이지는 Epic 1 검증 함수만 호출해 로직 중복 제거.

---

## Epic 4. Integration + Landing

### Task 4.1 라우팅 + FloatingTabBar 앱 셸 배선
- **Description**: react-router-dom 라우트(`/`,`/input`,`/result`,`/simulate`,`/filing`,`/checklist`) 등록, 4개 탭(홈·시뮬레이션·체크리스트·종소세) `FloatingTabBar` 배선, 셸 레이아웃 계약.
- **DoD**:
  - 6개 라우트 등록, 각 페이지 마운트 정상 (`npm run build` 통과)
  - `FloatingTabBar` 4개 탭 표시, 각 터치 타깃 ≥44px, 탭 전환 시 해당 라우트 이동 (F7-AC1)
  - 모든 탭 화면 `ScreenScaffold`로 감싸지고 TabBar와 콘텐츠 미겹침(하단 여백 `Spacing` 확보) (F7-AC5)
  - 전 화면에 "앱 설치/다운로드" 문구·배너·외부 링크 없음, 외부 도메인 이동 0건 (F7-AC6)
  - `location.state` 캐스팅에 `RouteState` 사용, `App.tsx` 라우트가 RouteState 경로 키와 일치
- **Covers**: [F7-AC1, F7-AC5, F7-AC6]
- **Files**: `src/App.tsx`, `src/router.tsx`
- **Depends on**: Task 3.1, Task 3.2, Task 3.3, Task 3.4, Task 3.5, Task 3.6

### Task 4.2 최종 UX 폴백 · 콘솔 클린 검수
- **Description**: 프로덕션 빌드 전체 탭 순회 시 `console.error` 0개 보장, 모든 파싱 실패 경로 빈 상태 폴백 확인, 고지 문구/터치 타깃/시즌 배너 결정론성 최종 점검.
- **DoD**:
  - 프로덕션 빌드에서 전체 탭 순회 시 `console.error` 출력 0개 (F7-AC7)
  - 손상 localStorage 전 키에서 각 페이지가 빈 상태/기본값으로 폴백, 크래시 없음
  - 모든 인터랙티브 요소 최소 44×44px 최종 확인, 금액 표기 `Intl.NumberFormat('ko-KR')` 콤마 일관
  - 결과/시뮬 화면 고지 문구("실제 환급액과 다를 수 있어요") 노출 확인
  - 시즌 배너: month 1~5 주입 시 노출, 6~12 주입 시 미노출 — 동일 month 재렌더 시 동일 결과(결정론) 확인
- **Covers**: [F7-AC7]
- **Files**: `src/pages/ResultPage.tsx`, `src/pages/HomePage.tsx`, `src/lib/storage.ts` (미세 폴백 보강)
- **Depends on**: Task 4.1

> **Epic 4 Risk**: Complexity **Low**. Risk factors: (1) 라우트 키와 `RouteState` 불일치로 타입은 통과하나 런타임 state 누락, (2) `console.error`가 광고/스토리지 예외 경로에서 새어나와 검수 반려. Mitigation: 페이지·데이터 태스크 완료 후 마지막에 배선/검수를 배치해 모든 폴백 경로가 이미 존재하는 상태에서 통합 검증. 콘솔 클린은 별도 태스크로 분리해 전 탭 순회 확인.

---

## AC Coverage

- **Total ACs in SPEC**: 49
  - F1: 7, F2: 8, F3: 8, F4: 6, F5: 6, F6: 6, F7: **8** (신규 F7-AC8: 시즌 알림 인앱 배너)
- **Covered by tasks**: 49
  - **F1**: AC1(1.3), AC2(1.2), AC3(1.3), AC4(1.2), AC5(1.2), AC6(1.3), AC7(1.3)
  - **F2**: AC1~AC8 모두 (3.1)
  - **F3**: AC1~AC8 모두 (3.2) — 수익화 게이트 플로우(초기 요약→광고→항목별 상세) 포함
  - **F4**: AC1(3.3), AC2(1.3+3.3), AC3(3.3), AC4(3.3), AC5(3.3), AC6(3.3)
  - **F5**: AC1(3.4), AC2(3.4), AC3(3.4), AC4(3.4), AC5(1.3+3.4), AC6(3.4)
  - **F6**: AC1(1.4/3.5), AC2(3.5), AC3(3.5), AC4(3.5), AC5(3.5), AC6(3.5)
  - **F7**: AC1(4.1), AC2(3.6), AC3(3.6), AC4(3.6/1.4), AC5(4.1), AC6(4.1), AC7(4.2), **AC8(1.4/3.6)**
- **Uncovered**: 0 ✅

---

### 변경 요약 (gap fix)

| Gap | 처리 |
|---|---|
| PRD Feature 6 "1–5월 시즌 알림" 미매핑 | **신설**: `computeSeasonBanner(month)` (Task 1.4) + 홈 인앱 배너 F7-AC8 (Task 3.6) + 결정론 검수 (Task 4.2). 푸시 미지원(MVP) → 인앱 배너로 구현 |
| PRD Feature 2 절세 상세 공개 로직 under-spec | Task 3.2 F3-AC2/AC3에 "초기 요약(광고 전) vs 항목별 상세(광고 후)" 구분 및 노출 항목(신용카드/의료비/교육비/IRP·연금/보험) 명시 |
| 수익화 게이트 전용 태스크 부재 | Task 3.2가 전체 플로우(요약→광고 게이트→상세) 담당임을 명문화 |
| F1-AC 미정의 (traceability) | 실제 SPEC ACs(F1-AC1~AC7)는 Data Models/F1에 정의되어 있으며 Task 1.2/1.3이 각 AC 참조 — 유지 |
| Epic 2/3/4 부재 우려 | 전 Epic 존재(API 없음 명시, UI 6페이지, 통합 2태스크) — 유지 |

나머지 지적(SPEC/TASK 발췌 잘림)은 원문이 완결 상태여서 실제 결함이 아니었습니다. 유일한 실질 갭인 **시즌 알림**만 태스크로 보강했습니다.