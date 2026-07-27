import { test, expect } from '@playwright/test';

// nightcrew Sentinel smoke 팩 — Factory 산출(§7.1)
// 핵심 막: 연봉·소득 유형(직장인/프리랜서/N잡) 입력 → 예상 환급액/추가납부액 즉시 계산, 리워드 광고 시청 후 절세 항목별 상세 분석 공개 (신용카드·의료비·교육비 공제), 공제 항목 조정 슬라이더로 환급액 변화 실시간 시뮬레이션, 종합소득세 신고 대상 여부 자동 판단 (프리랜서·부업 수입 입력), 절세 체크리스트 (IRP·연금저축·의료비 한도 등) 달성도 표시
// 토스 브릿지 의존 구간(로그인·결제)은 외부 재현 불가 — 화면 도달 확인까지만.
const ROUTES = ["/","/Checklist","/Filing","/Home","/Input"];
// WebView 밖 실행에서만 나는 콘솔 에러는 무시(앱인토스 관례 — toss visual-smoke 템플릿 계승)
const IGNORED_CONSOLE = [/SafeAreaInsets/i, /granite/i, /apps-in-toss/i];

for (const route of ROUTES) {
  test(`smoke: ${route} 렌더링과 콘솔 에러 없음`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !IGNORED_CONSOLE.some((re) => re.test(msg.text()))) errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(String(err)));
    await page.goto(route);
    await expect(page.locator('body')).toBeVisible();
    expect(errors).toEqual([]);
  });
}
