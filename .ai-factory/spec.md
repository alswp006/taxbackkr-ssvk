# SPEC — TaxBackKR

세금 환급 계산기 미니앱. 아래 SPEC은 PRD를 기준으로 하며, PRD에 없는 사실은 [Assumptions]에 명시했다.

> **AI 고지 판단**: 본 앱의 환급액/추가납부액 계산과 절세 분석은 **국세청 세율표·공제 한도 기반 결정론적 규칙 엔진**으로 산출한다. 생성형 AI(LLM)를 사용하지 않으므로 "생성형 AI 고지 의무"는 해당되지 않는다. (근거: PRD Core Features 1·2는 세율/공제 계산이며 생성 모델 언급 없음 → [Assumptions] 참조)

---

## Common Principles

- **플랫폼/기술**: Vite + React + TypeScript, 라우팅은 react-router-dom, 데이터는 localStorage. 서버 코드 없음.
- **UI**: 모든 화면은 TDS(@toss/tds-mobile) 컴포넌트로만 구성. 하단 탭 네비게이션은 템플릿 제공 `FloatingTabBar`, 페이지 골격은 `ScreenScaffold`, 하단 고정 1차 액션은 `SubmitFooter` 사용. 여백은 TDS `Spacing`(size prop 필수)만 사용, Tailwind/inline 여백 덮어쓰기 금지.
- **색상**: HEX 하드코딩 금지. `var(--tds-color-*)` 또는 TDS 컴포넌트만 사용(다크모드 지원).
- **인증**: 토스 세션 자동 제공. 로그인 함수 호출 없음. 사용자 식별 필요 시 `getIsTossLoginIntegratedService()`로 연동 상태만 확인.
- **화폐/숫자**: 금액은 원(KRW) 정수, 세 자리 콤마 표기(`Intl.NumberFormat('ko-KR')`). 음수 환급 = 추가납부.
- **터치 타깃**: 모든 인터랙티브 요소 최소 44×44px.
- **광고**: 배너 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />`, 리워드 게이트 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>`. 배너는 콘텐츠 섹션 사이/결과 하단에만 배치, 콘텐츠와 겹치지 않음.
- **외부 이탈 금지**: `window.location.href`/`window.open`으로 외부 URL 이동 금지(법률 고지·공공기관 링크 제외). 외부 분석 솔루션(GA/Amplitude) 사용 금지.
- **호환성**: Android 7+, iOS 16+. 최신 전용 API(예: `Array.prototype.at` 미폴리필 등) 사용 금지.
- **콘솔**: 프로덕션 빌드에서 `console.error` 출력 0개.

---

## Data Models

### TaxProfile — 사용자 소득/입력 프로필
| field | type | constraints |
|---|---|---|
| id | `string` | uuid, 필수 |
| taxYear | `number` | 연도, 2023~2026 |
| incomeType | `'employee' \| 'freelancer' \| 'multi'` | 필수 (직장인/프리랜서/N잡) |
| annualSalary | `number` | 근로소득 총급여, 0~1,000,000,000 정수 |
| freelanceIncome | `number` | 사업/기타소득, 0~1,000,000,000 정수 (직장인은 0) |
| dependents | `number` | 부양가족 수, 0~15 정수 |
| createdAt | `number` | epoch ms |
| updatedAt | `number` | epoch ms |

```ts
export type IncomeType = 'employee' | 'freelancer' | 'multi';
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
```

### DeductionInput — 공제 항목 입력/슬라이더 값
```ts
export interface DeductionInput {
  creditCard: number;   // 신용카드 사용액, 0~100,000,000
  medical: number;      // 의료비, 0~50,000,000
  education: number;    // 교육비, 0~50,000,000
  irp: number;          // IRP/연금저축 납입액, 0~9,000,000
  insurance: number;    // 보장성 보험료, 0~2,000,000
}
```

### TaxResult — 계산 결과(스냅샷)
```ts
export interface TaxResult {
  profileId: string;
  taxYear: number;
  estimatedTax: number;      // 산출세액(원)
  withheld: number;          // 기납부/원천징수 추정(원)
  refund: number;            // 환급액(양수)/추가납부(음수)
  effectiveRate: number;     // 실효세율(0~1, 소수 4자리)
  needsComprehensiveFiling: boolean; // 종소세 신고 대상 여부
  deductionBreakdown: { key: keyof DeductionInput; label: string; savedTax: number }[];
  computedAt: number;
}
```

### ChecklistState — 절세 체크리스트
```ts
export interface ChecklistItem {
  key: 'irp' | 'pension' | 'medical' | 'creditCardRatio' | 'insurance';
  label: string;
  limit: number;      // 공제 한도(원)
  current: number;    // 현재 납입/사용액(원)
  done: boolean;      // current >= limit*0.9
}
export interface ChecklistState {
  taxYear: number;
  items: ChecklistItem[];
  achievedRate: number; // done 비율 0~1
}
```

### AppMeta — 앱 상태 플래그
```ts
export interface AppMeta {
  onboardingSeen: boolean;
  lastResultByYear: Record<number, TaxResult>; // 연도별 최근 결과(비교용)
}
```

### localStorage 키 / 크기 추정
| key | shape | 추정 크기 |
|---|---|---|
| `taxback:profile:v1` | `TaxProfile` | ~0.3 KB |
| `taxback:deductions:v1` | `DeductionInput` | ~0.2 KB |
| `taxback:result:v1` | `TaxResult` | ~0.6 KB |
| `taxback:checklist:v1` | `ChecklistState` | ~0.5 KB |
| `taxback:meta:v1` | `AppMeta` (연도별 결과 최대 4개) | ~2.5 KB |
| **합계** | | **< 5 KB (5MB 한도 대비 여유)** |

- 모든 read는 `try/catch` + 스키마 버전(`:v1`) 확인. 파싱 실패 시 기본값 반환(콘솔 에러 금지).

---

## Feature List

### F1. 데이터 저장 계층 & 세금 계산 엔진 (순수 로직)
- **Description**: localStorage 읽기/쓰기 헬퍼와 국세청 세율표·공제 한도 기반 결정론적 계산 함수(`calcTax`, `calcDeductionBreakdown`, `judgeComprehensiveFiling`)를 제공한다. UI 없는 순수 TypeScript 모듈로, F2~F8이 공유한다.
- **Data**: TaxProfile, DeductionInput, TaxResult, AppMeta
- **API**: 없음 (내부 로직)
- **Requirements**:
  - **AC-1 [U][P0]**: Scenario: 근로소득 환급 계산
    - Given `{ incomeType: "employee", annualSalary: 50000000, freelanceIncome: 0, dependents: 1 }`, 공제 `{ creditCard: 20000000, medical: 0, education: 0, irp: 0, insurance: 0 }`
    - When `calcTax(profile, deductions)` 호출
    - Then `TaxResult`를 반환하고 `estimatedTax >= 0`, `effectiveRate`는 0~1, `refund = withheld - estimatedTax` 항등식이 성립
  - **AC-2 [U][P0]**: Scenario: 저장/복원 왕복
    - Given `TaxProfile` 객체
    - When `saveProfile(p)` 후 `loadProfile()` 호출
    - Then 저장 전과 동일한 필드 값을 가진 객체가 반환됨(`updatedAt` 갱신 제외)
  - **AC-3 [U][P0]**: Scenario: 종소세 대상 판단 규칙
    - Given `{ incomeType: "freelancer", freelanceIncome: 3000000 }`
    - When `judgeComprehensiveFiling(profile)` 호출
    - Then `true` 반환 (기타/사업소득 3,000,000원 초과 규칙 — [Assumptions] 임계값 참조)
  - **AC-4 [W][P1]**: Scenario: 손상된 저장 데이터
    - Given `localStorage['taxback:profile:v1'] = "{broken json"`
    - When `loadProfile()` 호출
    - Then `null` 반환하고 `console.error` 미출력, throw 하지 않음
  - **AC-5 [W][P1]**: Scenario: 저장 용량 초과
    - Given `saveProfile()`가 `QuotaExceededError`를 던지는 상황
    - When 저장 시도
    - Then `{ ok: false, reason: "quota" }` 반환하고 앱은 크래시하지 않음
  - **AC-6 [W][P1]**: Scenario: 음수/비정상 입력 방어
    - Given `{ annualSalary: -100 }`
    - When `calcTax` 호출
    - Then 입력을 0으로 클램프하여 계산하고 `estimatedTax = 0` 반환(예외 없음)
  - **AC-7 [U][P0]**: Scenario: 계산 결정론성
    - Given 동일 입력 2회
    - When `calcTax` 두 번 호출
    - Then 두 `TaxResult`의 `estimatedTax`, `refund`, `effectiveRate`가 완전히 동일

---

### F2. 소득 입력 화면
- **Description**: 소득 유형(직장인/프리랜서/N잡), 연봉, 프리랜서 수입, 부양가족 수를 입력받아 프로필을 저장하고 결과 화면으로 이동한다. 모바일 키보드 대응과 실시간 유효성 검사를 포함한다.
- **Data**: TaxProfile
- **API**: 없음
- **Requirements**:
  - **AC-1 [E][P0]**: Scenario: 소득 입력 제출 성공
    - Given 토스 로그인 유저, TDS Chip으로 `incomeType: "employee"` 선택
    - When TDS TextField에 `annualSalary: 50000000`, `dependents: 1` 입력 후 SubmitFooter의 TDS Button "환급액 계산" 탭
    - Then `taxback:profile:v1`에 저장되고 `navigate('/result', { state: { profileId } })` 실행
  - **AC-2 [O][P0]**: Scenario: N잡 선택 시 프리랜서 수입 필드 노출
    - Given `incomeType` Chip에서 "multi" 선택
    - When 화면 렌더
    - Then `freelanceIncome` TDS TextField(`data-testid="freelance-income-field"`)가 표시됨
  - **AC-3 [W][P1]**: Scenario: 빈 연봉 거부
    - Given `incomeType: "employee"`
    - When `annualSalary` 미입력(빈 문자열) 상태로 제출
    - Then TDS TextField 하단에 에러 텍스트 "연봉을 입력해주세요" 표시, navigate 미실행
  - **AC-4 [W][P1]**: Scenario: 범위 초과 입력 거부
    - Given `annualSalary: 2000000000` 입력
    - When 제출
    - Then 에러 텍스트 "10억원 이하로 입력해주세요" 표시
  - **AC-5 [E][P1]**: Scenario: 숫자 키패드 노출
    - Given 금액/부양가족 TextField 포커스
    - When 키보드가 올라옴
    - Then 해당 TextField는 `inputMode="numeric"`로 숫자 키패드를 노출하고, 포커스 시 하단 SubmitFooter가 키보드에 가리지 않도록 스크롤됨
  - **AC-6 [S][P1]**: Scenario: 기존 프로필 프리필
    - Given `taxback:profile:v1`에 이전 입력 존재
    - When 입력 화면 진입
    - Then 모든 필드가 저장값으로 프리필되고, 값이 없으면 빈 폼(placeholder만) 표시
  - **AC-7 [U][P1]**: Scenario: 레이아웃 계약
    - Given 입력 화면 렌더
    - Then `ScreenScaffold`로 감싸지고, 1차 액션은 `SubmitFooter` 내 `display="block"` TDS Button이며, 좌측 글자폭 버튼을 쓰지 않음
  - **AC-8 [W][P0]**: Scenario: 외부 이탈 금지
    - Given 입력 화면
    - When 어떤 인터랙션이든 발생
    - Then `window.location.href`/`window.open` 외부 URL 호출이 발생하지 않음

---

### F3. 환급 결과 화면 (리워드 광고 게이트)
- **Description**: 프로필 기반 예상 환급액/추가납부액을 히어로 숫자로 즉시 보여주고, 실효세율·산출세액을 카드로 표시한다. 절세 상세 분석(항목별 절감액)은 TossRewardAd 게이트 뒤에서 공개한다.
- **Data**: TaxProfile, TaxResult, DeductionInput
- **API**: 없음
- **Requirements**:
  - **AC-1 [E][P0]**: Scenario: 결과 계산 및 표시
    - Given `location.state.profileId`로 프로필 로드 성공
    - When 화면 진입
    - Then `calcTax` 결과의 `refund`를 SummaryHero(CountUp)로 표시하고 `data-testid="refund-hero"`를 가짐
  - **AC-2 [U][P0]**: Scenario: 결과 카드 레이아웃 계약
    - Given 결과 화면 렌더
    - Then `data-testid="tax-summary-card"` TDS Card 안에 "산출세액", "실효세율"이 t3 강조 타이포로 표기되고, 환급/추가납부 여부는 TDS 배지(양수=환급, 음수=추가납부)로 구분됨
  - **AC-3 [E][P0]**: Scenario: 리워드 광고 후 절세 분석 공개
    - Given 사용자가 TDS Button "절세 상세 분석 보기" 탭
    - When `TossRewardAd`(slotId=env) 광고 시청 완료
    - Then `deductionBreakdown` 항목별 절감액 리스트가 `data-testid="deduction-breakdown"`로 표시됨
  - **AC-4 [W][P1]**: Scenario: 광고 로드 실패 대체
    - Given 리워드 광고 로드/시청이 실패(에러 콜백)
    - When "절세 상세 분석 보기" 탭
    - Then TDS Toast "광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요" 표시하고 분석은 잠금 유지, 앱 크래시 없음
  - **AC-5 [W][P1]**: Scenario: 프로필 없음 방어
    - Given `location.state`가 없거나 `loadProfile()` 결과 null
    - When 결과 화면 직접 진입(딥링크)
    - Then 빈 상태 `Asset.ContentIcon` + 안내 "먼저 소득을 입력해주세요" + TDS Button "입력하러 가기"(→ `navigate('/input')`) 표시
  - **AC-6 [S][P1]**: Scenario: 계산 로딩 상태
    - Given 계산 진행 중(≥1 프레임)
    - While 계산 미완료
    - Then TDS Skeleton(히어로/카드 자리)이 표시되고 완료 시 실제 값으로 교체됨
  - **AC-7 [O][P2]**: Scenario: 배너 광고 배치
    - Where 광고 슬롯 활성
    - Then `<AdSlot>` 배너를 결과 카드와 절세 분석 섹션 **사이**에 1개 배치하고 콘텐츠와 겹치지 않음
  - **AC-8 [E][P0]**: Scenario: 결과 스냅샷 저장
    - Given 결과 계산 완료
    - When 화면 마운트
    - Then `taxback:result:v1`와 `taxback:meta:v1.lastResultByYear[taxYear]`에 `TaxResult` 저장

---

### F4. 공제 조정 슬라이더 시뮬레이션
- **Description**: 신용카드·의료비·교육비·IRP·보험 공제액을 TDS 기반 슬라이더로 조정하면 환급액이 실시간 재계산되어 히어로 숫자에 반영된다. 조정값은 localStorage에 저장된다.
- **Data**: DeductionInput, TaxResult
- **API**: 없음
- **Requirements**:
  - **AC-1 [E][P0]**: Scenario: 슬라이더 조정 → 실시간 재계산
    - Given IRP 슬라이더 현재값 0
    - When IRP를 `3000000`으로 이동
    - Then 300ms 이내 `refund` 히어로 값이 재계산되어 갱신되고 `taxback:deductions:v1`에 저장됨
  - **AC-2 [U][P0]**: Scenario: 한도 클램프
    - Given IRP 공제 한도 9,000,000
    - When 슬라이더 최대로 이동
    - Then IRP 입력값이 9,000,000을 초과하지 않고, 절감세액은 한도 기준으로 계산됨
  - **AC-3 [U][P1]**: Scenario: 시뮬레이션 시각화 계약
    - Given 조정 화면 렌더
    - Then 각 공제 항목의 절감 비중을 `data-testid="deduction-minibar"` MiniBar로 표시하고, 총 절감액은 t2 강조 타이포로 표기
  - **AC-4 [W][P1]**: Scenario: 저장 실패 시 UX 유지
    - Given 저장이 `quota`로 실패
    - When 슬라이더 조정
    - Then 화면 값은 정상 갱신되고 TDS Toast "저장 공간이 부족해요" 1회 표시(반복 억제)
  - **AC-5 [S][P1]**: Scenario: 초기 로딩 빈 상태
    - Given `taxback:deductions:v1` 없음
    - While 첫 진입
    - Then 모든 슬라이더 0, 히어로는 공제 미반영 기준값 표시
  - **AC-6 [E][P2]**: Scenario: 초기화 버튼
    - Given 사용자가 TDS Button "초기화" 탭
    - When 확인 TDS AlertDialog "공제 입력을 초기화할까요?"에서 "초기화" 선택
    - Then 모든 슬라이더 0으로 리셋되고 저장 갱신

---

### F5. 종합소득세 신고 대상 판단
- **Description**: 프리랜서/부업 수입을 입력받아 종합소득세 신고 대상 여부를 규칙 기반으로 판단하고, 대상이면 필요한 준비물 안내를 카드로 표시한다. 판단 근거를 텍스트로 명시한다.
- **Data**: TaxProfile, TaxResult(`needsComprehensiveFiling`)
- **API**: 없음
- **Requirements**:
  - **AC-1 [E][P0]**: Scenario: 신고 대상 판정 표시
    - Given `{ incomeType: "multi", annualSalary: 40000000, freelanceIncome: 5000000 }`
    - When 종소세 화면 진입
    - Then "종합소득세 신고 대상입니다" 결과가 `data-testid="filing-verdict-card"` TDS Card로 표시됨
  - **AC-2 [E][P0]**: Scenario: 비대상 판정
    - Given `{ incomeType: "employee", freelanceIncome: 0 }`
    - When 화면 진입
    - Then "종합소득세 신고 대상이 아닙니다"와 판단 근거 텍스트 표시
  - **AC-3 [U][P1]**: Scenario: 판단 근거 명시
    - Given 임의의 판정 결과
    - Then 카드 하단에 임계값 근거(예: "기타·사업소득 300만원 초과 시 대상") 문장을 표기
  - **AC-4 [W][P1]**: Scenario: 프로필 미입력
    - Given 프로필 없음
    - When 화면 진입
    - Then 빈 상태 `Asset.ContentIcon` + "소득 정보를 먼저 입력해주세요" + 입력 이동 TDS Button 표시
  - **AC-5 [W][P1]**: Scenario: 경계값 처리
    - Given `freelanceIncome: 3000000` (임계값 정확히)
    - When 판정
    - Then 규칙(초과 시 대상)에 따라 "대상 아님"으로 일관 판정하고, 3,000,001원은 "대상"으로 판정
  - **AC-6 [O][P2]**: Scenario: 준비물 체크 리스트
    - Where 대상 판정
    - Then TDS ListRow로 준비물 3개("소득/세액 신고서", "경비 증빙", "원천징수영수증")를 표시

---

### F6. 절세 체크리스트 & 달성도
- **Description**: IRP·연금저축·의료비·신용카드 사용비율·보험 등 공제 항목의 한도 대비 달성도를 체크리스트로 보여준다. 각 항목의 진행률과 전체 달성률을 시각화한다.
- **Data**: ChecklistState, DeductionInput
- **API**: 없음
- **Requirements**:
  - **AC-1 [U][P0]**: Scenario: 달성도 계산
    - Given `DeductionInput` 저장값 존재
    - When 체크리스트 화면 진입
    - Then 각 항목 `done = current >= limit*0.9` 규칙으로 계산되고 `achievedRate`(done 비율)가 표시됨
  - **AC-2 [U][P0]**: Scenario: 달성률 히어로 계약
    - Given 5개 항목 중 2개 done
    - Then `data-testid="achieve-hero"` SummaryHero에 "40%"가 CountUp으로 표시됨
  - **AC-3 [U][P1]**: Scenario: 항목 리스트 표현
    - Given 체크리스트 렌더
    - Then 각 항목은 TDS ListRow로 렌더되고, 한도 대비 진행률을 `data-testid="checklist-minibar"` MiniBar로 표시하며 done 항목엔 TDS 배지 "달성" 노출
  - **AC-4 [W][P1]**: Scenario: 데이터 없음 빈 상태
    - Given `taxback:deductions:v1`/`taxback:checklist:v1` 없음
    - When 진입
    - Then 빈 상태 `Asset.ContentIcon` + "공제 항목을 입력하면 달성도를 확인할 수 있어요" 표시, 크래시 없음
  - **AC-5 [S][P1]**: Scenario: 로딩 상태
    - While localStorage 로드 중
    - Then TDS Skeleton 리스트(5행) 표시 후 실제 데이터로 교체
  - **AC-6 [E][P2]**: Scenario: 항목 탭 → 조정 이동
    - Given 체크리스트 항목 탭(터치 타깃 ≥44px)
    - When 탭
    - Then `navigate('/simulate', { state: { focusKey: item.key } })`로 해당 슬라이더로 이동

---

### F7. 연도 비교 & 앱 셸/네비게이션
- **Description**: 하단 `FloatingTabBar`로 홈/시뮬레이션/체크리스트/종소세 화면을 전환하고, 작년(저장된) 결과와 올해 결과의 환급액 차이를 홈 대시보드에 요약한다. 첫 진입 온보딩 안내 1회를 포함한다.
- **Data**: AppMeta(`lastResultByYear`), TaxResult
- **API**: 없음
- **Requirements**:
  - **AC-1 [U][P0]**: Scenario: 탭 네비게이션
    - Given 앱 진입
    - Then 하단 `FloatingTabBar`에 4개 탭(홈·시뮬레이션·체크리스트·종소세)이 표시되고 각 탭 터치 타깃 ≥44px, 탭 전환 시 해당 라우트로 이동
  - **AC-2 [E][P1]**: Scenario: 연도 비교 표시
    - Given `lastResultByYear`에 2025·2026 결과 존재
    - When 홈 진입
    - Then `data-testid="year-compare-card"` Card에 두 해 환급액과 차액(예: "작년 대비 +120,000원")을 표기하고, 추이를 `data-testid="compare-sparkline"` Sparkline으로 시각화
  - **AC-3 [E][P1]**: Scenario: 첫 이용 온보딩
    - Given `taxback:meta:v1.onboardingSeen`가 false
    - When 홈 첫 진입
    - Then TDS BottomSheet 안내 1회 표시, "확인" 탭 시 `onboardingSeen=true` 저장 후 재노출 안 함
  - **AC-4 [W][P1]**: Scenario: 비교 데이터 부족
    - Given 저장된 결과가 1개 이하
    - When 홈 진입
    - Then Sparkline 대신 빈 상태 "비교할 작년 데이터가 없어요" + `Asset.ContentIcon` 표시
  - **AC-5 [U][P1]**: Scenario: 앱 셸 레이아웃 계약
    - Given 모든 탭 화면
    - Then 각 화면은 `ScreenScaffold`로 감싸지고 `FloatingTabBar`와 콘텐츠가 겹치지 않도록 하단 여백을 `Spacing`으로 확보
  - **AC-6 [W][P0]**: Scenario: 외부 앱 설치/이탈 유도 금지
    - Given 어떤 화면이든
    - Then "앱을 설치하세요"/"다운로드" 문구·배너·외부 링크가 존재하지 않고, 외부 도메인 이동이 발생하지 않음
  - **AC-7 [U][P1]**: Scenario: 콘솔 클린
    - Given 프로덕션 빌드에서 전체 탭을 순회
    - Then `console.error` 출력이 0개

---

## Screen Definitions

### S1. 홈 대시보드 — `/`
- **TDS 컴포넌트**: ScreenScaffold, Top(타이틀), TDS Card, SummaryHero(CountUp), Sparkline, TDS Button(display="block"), BottomSheet(온보딩), FloatingTabBar, AdSlot(배너), Spacing.
- **Loading**: 결과/메타 로드 중 TDS Skeleton(히어로+카드).
- **Empty**: 저장 결과 0개 → `Asset.ContentIcon` + "소득을 입력하고 환급액을 확인해보세요" + TDS Button "환급액 계산하기".
- **Error**: 파싱 실패 → 빈 상태로 폴백(토스트 없음, 콘솔 에러 없음).
- **Touch**: "환급액 계산하기" 버튼, 연도 비교 카드 탭 ≥44px.
- **Layout 계약**: `data-testid="year-compare-card"` Card + `data-testid="compare-sparkline"`. 히어로는 최근 환급액 CountUp.
- **Navigation 계약**:
  - Outgoing: 계산 버튼 → `navigate('/input')`; 비교 카드 → `navigate('/result', { state: { profileId: string } })`.
  - Incoming: `location.state` 없음(탭 루트).

### S2. 소득 입력 — `/input`
- **TDS 컴포넌트**: ScreenScaffold, Top, TDS Chip(소득 유형), TDS TextField(연봉/프리랜서수입/부양가족, `inputMode="numeric"`), SubmitFooter + TDS Button, Spacing.
- **Loading**: 프리필 로드 중 필드 Skeleton(짧음).
- **Empty**: 저장 프로필 없음 → placeholder만 노출.
- **Error**: 유효성 실패 → 각 TextField 하단 에러 텍스트("연봉을 입력해주세요" 등).
- **Touch**: Chip, 각 TextField, 제출 버튼 ≥44px. 키보드 노출 시 SubmitFooter 가림 방지 스크롤.
- **Layout 계약**: SubmitFooter 하단 고정 `display="block"` 버튼.
- **Navigation 계약**:
  - Outgoing: 제출 → `navigate('/result', { state: { profileId: string } })`.
  - Incoming: `location.state = undefined | { editProfileId: string }`.

### S3. 환급 결과 — `/result`
- **TDS 컴포넌트**: ScreenScaffold, Top, SummaryHero(CountUp), TDS Card, TDS Badge, TossRewardAd(게이트), AdSlot(배너), TDS ListRow(항목별 절감), Skeleton, Toast, Asset.ContentIcon, TDS Button.
- **Loading**: 계산 중 Skeleton(히어로+카드).
- **Empty**: state/프로필 없음 → 빈 상태 + "입력하러 가기".
- **Error**: 리워드 광고 실패 → Toast + 분석 잠금 유지.
- **Touch**: "절세 상세 분석 보기" 버튼 ≥44px.
- **Layout 계약**: `data-testid="refund-hero"`, `data-testid="tax-summary-card"`(t3 강조 + Badge), `data-testid="deduction-breakdown"`(광고 후 노출). 배너는 카드-분석 사이.
- **Navigation 계약**:
  - Outgoing: "공제 조정하기" → `navigate('/simulate', { state: { profileId: string } })`; "입력하러 가기" → `navigate('/input')`.
  - Incoming: `location.state = { profileId: string }`.

### S4. 공제 시뮬레이션 — `/simulate`
- **TDS 컴포넌트**: ScreenScaffold, Top, SummaryHero(CountUp), 슬라이더(TDS 제공 Slider/Range), MiniBar, TDS ListRow, TDS Button("초기화"), AlertDialog, Toast, Spacing.
- **Loading**: deductions 로드 중 Skeleton.
- **Empty**: 저장값 없음 → 슬라이더 0 기준값.
- **Error**: 저장 quota 실패 → Toast 1회.
- **Touch**: 슬라이더 핸들, 초기화 버튼 ≥44px.
- **Layout 계약**: `data-testid="deduction-minibar"`, 총 절감액 t2 강조 히어로.
- **Navigation 계약**:
  - Outgoing: 뒤로 → `navigate(-1)`.
  - Incoming: `location.state = { profileId: string } | { profileId: string, focusKey: keyof DeductionInput }`.

### S5. 종합소득세 판단 — `/filing`
- **TDS 컴포넌트**: ScreenScaffold, Top, TDS Card, TDS Badge, TDS ListRow, Asset.ContentIcon, TDS Button, Spacing.
- **Loading**: 프로필 로드 중 Skeleton.
- **Empty**: 프로필 없음 → 빈 상태 + 입력 이동.
- **Error**: 파싱 실패 → 빈 상태 폴백.
- **Touch**: 입력 이동 버튼, ListRow ≥44px.
- **Layout 계약**: `data-testid="filing-verdict-card"` + 근거 문장.
- **Navigation 계약**:
  - Outgoing: 입력 이동 → `navigate('/input')`.
  - Incoming: `location.state = undefined`(프로필은 localStorage에서 로드).

### S6. 절세 체크리스트 — `/checklist`
- **TDS 컴포넌트**: ScreenScaffold, Top, SummaryHero(CountUp), TDS ListRow, MiniBar, TDS Badge, Asset.ContentIcon, Skeleton, Spacing.
- **Loading**: Skeleton 5행.
- **Empty**: 입력 없음 → 빈 상태 안내.
- **Error**: 파싱 실패 → 빈 상태 폴백.
- **Touch**: 각 ListRow(탭 시 시뮬 이동) ≥44px.
- **Layout 계약**: `data-testid="achieve-hero"`, `data-testid="checklist-minibar"`, done 항목 Badge "달성".
- **Navigation 계약**:
  - Outgoing: 항목 탭 → `navigate('/simulate', { state: { profileId: string, focusKey: ChecklistItem['key'] } })`.
  - Incoming: `location.state = undefined`.
- **Scroll**: 항목 5개 고정 → 일반 스크롤(가상 스크롤 불필요). 리스트가 20행 초과로 확장될 경우 가상 스크롤 적용.

---

## API Contract

외부 API 없음 (모든 계산은 클라이언트 로컬 로직, 데이터는 localStorage).

- CORS/외부 로깅 항목은 해당 없음(외부 호출 0건).
- 향후 연도별 세율표를 외부에서 갱신해야 할 경우에만 별도 Railway API 서버를 도입하며, 응답 에러는 통일 형태 `{ error: string }`를 사용한다. (현 MVP 범위 외 — [Open Questions] 참조)

---

## Assumptions

1. **세율/공제 규칙은 결정론적**이며 앱 내 상수 테이블로 내장한다. 생성형 AI(LLM) 미사용 → AI 고지 의무 비해당.
2. **종소세 임계값**: 기타·사업소득 연 3,000,000원 **초과** 시 신고 대상으로 간주(간이 규칙). 실제 세법의 모든 예외(분리과세 선택 등)는 MVP 범위 외이며 결과 화면에 "실제 신고는 홈택스 기준" 안내 문구를 표기.
3. **원천징수/기납부세액**은 총급여 기준 간이 추정식으로 산출(정확한 원천징수영수증 입력은 MVP 범위 외).
4. 환급액은 **참고용 추정치**이며, 각 결과 화면에 "실제 환급액과 다를 수 있어요" 고지 문구를 표기.
5. 대상 세연도는 현재(2026) 기준 최근 4년(2023~2026)으로 제한.
6. 리워드/배너 광고 ID·IAP SKU는 앱인토스 콘솔에서 env로 주입되며 재빌드 불필요.
7. 사용자 식별은 불필요(모든 데이터 로컬 저장). 토스 로그인 연동 상태는 필요 시 `getIsTossLoginIntegratedService()`로만 확인.

## Open Questions

1. 세율표를 **연도별로 원격 갱신**할 필요가 있는가? (있다면 외부 API 서버 도입 검토 — 현 MVP는 내장 상수)
2. 신용카드 공제의 **총급여 25% 초과분** 계산 등 세부 규칙을 어느 수준까지 반영할 것인가(정밀도 vs. 단순화)?
3. 시즌(1–5월) **알림** 요구가 PRD에 있으나 미니앱은 푸시 미지원 — 홈 배너 안내로 대체하는 것이 맞는가?
4. IAP(광고 제거 등) 수익화 추가 여부 — 현 PRD는 ads-only.
5. 프로필을 **다중 저장**(가족/연도별 여러 시나리오)할 필요가 있는가, 단일 프로필로 충분한가?