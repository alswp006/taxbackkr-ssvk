import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import {
  mockTds,
  mockAppsInToss,
  mockRouter,
  mockNavigate,
  mockLocation,
} from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { CURRENT_PROFILE_ID, type TaxProfile, type DeductionInput } from "@/lib/types";
import { saveProfile, saveDeductions, loadResult, loadMeta } from "@/lib/storage";
import { calcTax, calcDeductionBreakdown } from "@/lib/taxEngine";
import { formatNumber } from "@/lib/utils";

mockTds();
mockAppsInToss();
mockRouter();

// CountUp의 rAF 애니메이션 루프는 jsdom에서 타이밍이 불안정하다(실제 시각과 rAF 셰임의 카운터가
// 서로 무관해 수렴이 느려질 수 있음). Result.tsx가 CountUp에 어떤 값을 넘기는지(=refund)만
// 검증하면 되므로, 최종값을 동기적으로 표시하는 스텁으로 교체해 테스트를 결정적으로 만든다.
vi.mock("@/components/CountUp", () => ({
  CountUp: ({ value, unit = "원", testId }: { value: number; unit?: string; testId?: string }) =>
    React.createElement(
      "span",
      { "data-testid": testId },
      `${new Intl.NumberFormat("ko-KR").format(value)}${unit}`,
    ),
}));

import { loadFullScreenAd, showFullScreenAd } from "@apps-in-toss/web-framework";

// Result.tsx not yet implemented — this import will fail until the Coder creates it.
import Result from "@/pages/Result";

const PROFILE: TaxProfile = {
  id: CURRENT_PROFILE_ID,
  taxYear: 2026,
  incomeType: "employee",
  annualSalary: 50000000,
  freelanceIncome: 0,
  dependents: 1,
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

// F4-AC5 규칙(taxback:deductions:v1 없음 → 공제 0 기준)에 따라, 저장된 공제가 없을 때
// Result.tsx는 이 기본값으로 calcTax를 호출해야 한다.
const ZERO_DEDUCTIONS: DeductionInput = {
  creditCard: 0,
  medical: 0,
  education: 0,
  irp: 0,
  insurance: 0,
};

const DEDUCTIONS: DeductionInput = {
  creditCard: 3000000,
  medical: 1000000,
  education: 0,
  irp: 2000000,
  insurance: 500000,
};

function renderResult() {
  return renderWithRouter(React.createElement(Result));
}

// mockLocation.state is typed as `null` by inference in mocks.ts (a shared mutable
// singleton) — cast the write so tests can set a realistic RouteState value.
function setLocationState(state: unknown) {
  (mockLocation as { state: unknown }).state = state;
}

function expectEnabled(el: HTMLElement) {
  expect((el as HTMLButtonElement).disabled).toBe(false);
}

describe("환급 결과 페이지 /result (리워드 게이트+배너, packet 0008)", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    // react-router-dom is mocked project-wide (see mocks.ts) — useLocation() always returns
    // this shared mutable object, so tests must set it directly rather than via MemoryRouter entries.
    setLocationState(null);
    mockLocation.pathname = "/result";
  });

  // ── AC-1[P0] & AC-6[P1]: 프로필 로드 성공 → refund CountUp 표시(로딩 후 실제 값으로 교체) ──
  it("AC-1[P0]: profileId로 프로필을 로드해 calcTax의 refund를 refund-hero에 표시한다", async () => {
    saveProfile(PROFILE);
    setLocationState({ profileId: CURRENT_PROFILE_ID });
    const expected = calcTax(PROFILE, ZERO_DEDUCTIONS, 0);

    renderResult();

    // findBy는 로딩(Skeleton) 이후 비동기적으로 실제 값이 나타나는 것도 함께 검증한다(AC-6).
    const hero = await screen.findByTestId("refund-hero");
    expect(hero.textContent).toContain(`${formatNumber(expected.refund)}원`);
    expect(expected.refund).toBeGreaterThan(0);
  });

  // ── AC-2[P0]: 결과 카드 레이아웃 계약 ──
  it("AC-2[P0]: tax-summary-card에 산출세액·실효세율이 t3로 강조되고 환급 Badge가 표시된다", async () => {
    saveProfile(PROFILE);
    setLocationState({ profileId: CURRENT_PROFILE_ID });
    const expected = calcTax(PROFILE, ZERO_DEDUCTIONS, 0);

    renderResult();

    const card = await screen.findByTestId("tax-summary-card");
    expect(card.textContent).toContain("산출세액");
    expect(card.textContent).toContain("실효세율");
    expect(card.textContent).toContain(formatNumber(expected.estimatedTax));

    const t3Elements = card.querySelectorAll('[data-typography="t3"]');
    expect(t3Elements.length).toBeGreaterThanOrEqual(2);

    const badge = within(card).getByRole("status");
    expect(badge.textContent).toContain("환급");
  });

  // ── AC-3[P0]: 리워드 광고 시청 완료 → 절세 상세 분석 공개 ──
  it("AC-3[P0]: 절세 상세 분석 보기 → 광고 시청 완료 시 항목별 절감액이 콤마 포맷으로 노출된다", async () => {
    saveProfile(PROFILE);
    saveDeductions(CURRENT_PROFILE_ID, DEDUCTIONS);
    setLocationState({ profileId: CURRENT_PROFILE_ID });
    const expectedBreakdown = calcDeductionBreakdown(PROFILE, DEDUCTIONS);

    renderResult();
    await screen.findByTestId("tax-summary-card");

    // 광고 시청 전에는 잠겨 있어야 한다
    expect(screen.queryByTestId("deduction-breakdown")).toBeNull();

    await waitFor(() => {
      expectEnabled(screen.getByRole("button", { name: /절세 상세 분석 보기/ }));
    });
    fireEvent.click(screen.getByRole("button", { name: /절세 상세 분석 보기/ }));

    const breakdown = await screen.findByTestId("deduction-breakdown");
    for (const item of expectedBreakdown) {
      expect(breakdown.textContent).toContain(item.label);
      expect(breakdown.textContent).toContain(formatNumber(item.savedTax));
    }
    // 신용카드 300만원 * 15% = 450,000 — 콤마 포맷 구체값 검증
    expect(breakdown.textContent).toContain("450,000");
  });

  // ── AC-4[P1]: 광고 실패 → Toast + 잠금 유지 ──
  it("AC-4[P1]: 광고 시청 실패 시 Toast 안내가 뜨고 분석은 잠금 유지된다", async () => {
    saveProfile(PROFILE);
    saveDeductions(CURRENT_PROFILE_ID, DEDUCTIONS);
    setLocationState({ profileId: CURRENT_PROFILE_ID });

    vi.mocked(showFullScreenAd).mockImplementationOnce(
      ((opts: { onError?: (e: unknown) => void }) => {
        setTimeout(() => opts.onError?.({ code: "AD_LOAD_FAILED" }), 0);
      }) as unknown as typeof showFullScreenAd,
    );

    renderResult();
    await screen.findByTestId("tax-summary-card");

    await waitFor(() => {
      expectEnabled(screen.getByRole("button", { name: /절세 상세 분석 보기/ }));
    });
    fireEvent.click(screen.getByRole("button", { name: /절세 상세 분석 보기/ }));

    const toast = await screen.findByText("광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요");
    expect(toast.textContent).toBe("광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요");
    expect(screen.queryByTestId("deduction-breakdown")).toBeNull();
  });

  // ── AC-5[P1]: 프로필 없음 방어 ──
  describe("AC-5[P1]: 프로필 없음 방어", () => {
    it("AC-5[P1]: location.state 없이 직접 진입하면 빈 상태와 입력하러 가기 버튼을 보여준다", () => {
      // mockLocation.state는 beforeEach에서 null로 초기화됨
      renderResult();

      expect(screen.getByText("먼저 소득을 입력해주세요").textContent).toBe(
        "먼저 소득을 입력해주세요",
      );
      const cta = screen.getByRole("button", { name: /입력하러 가기/ });
      fireEvent.click(cta);
      expect(mockNavigate).toHaveBeenCalledWith("/input");
    });

    it("AC-5[P1]: profileId는 있으나 저장된 프로필이 없으면(loadProfile null) 빈 상태를 보여준다", () => {
      setLocationState({ profileId: CURRENT_PROFILE_ID }); // saveProfile() 호출 없음
      renderResult();

      expect(screen.getByText("먼저 소득을 입력해주세요").textContent).toBe(
        "먼저 소득을 입력해주세요",
      );
      expect(screen.queryByTestId("refund-hero")).toBeNull();
    });
  });

  // ── AC-7[P2]: 배너 광고 배치(카드-분석 사이 1개) ──
  it("AC-7[P2]: 결과 카드와 분석 섹션 사이에 배너 광고가 정확히 1개 배치된다", async () => {
    saveProfile(PROFILE);
    setLocationState({ profileId: CURRENT_PROFILE_ID });

    const { container } = renderResult();
    await screen.findByTestId("tax-summary-card");

    // AdSlot 루트 엘리먼트는 data-ad-group-id 속성을 갖는다(src/components/AdSlot.tsx)
    const banners = container.querySelectorAll("[data-ad-group-id]");
    expect(banners.length).toBe(1);
  });

  // ── AC-8[P0]: 결과 스냅샷 저장 ──
  it("AC-8[P0]: 마운트 시 taxback:result:v1과 meta.lastResultByYear에 결과를 저장한다", async () => {
    saveProfile(PROFILE);
    setLocationState({ profileId: CURRENT_PROFILE_ID });
    const expected = calcTax(PROFILE, ZERO_DEDUCTIONS, 0);

    renderResult();
    await screen.findByTestId("refund-hero");

    const savedResult = loadResult(CURRENT_PROFILE_ID);
    expect(savedResult?.refund).toBe(expected.refund);
    expect(savedResult?.estimatedTax).toBe(expected.estimatedTax);

    const meta = loadMeta();
    expect(meta?.lastResultByYear?.[PROFILE.taxYear]?.refund).toBe(expected.refund);
  });

  // ── 고지 문구: "실제 환급액과 다를 수 있어요" ──
  it("결과 화면에 '실제 환급액과 다를 수 있어요' 고지 문구가 표시된다", async () => {
    saveProfile(PROFILE);
    setLocationState({ profileId: CURRENT_PROFILE_ID });

    renderResult();
    await screen.findByTestId("refund-hero");

    expect(screen.getByText("실제 환급액과 다를 수 있어요").textContent).toBe(
      "실제 환급액과 다를 수 있어요",
    );
  });

  // ── 참고: loadFullScreenAd import 자체가 살아있는지(모듈 목이 깨지지 않았는지) 확인 ──
  it("apps-in-toss SDK의 loadFullScreenAd/showFullScreenAd가 목 함수로 사용 가능하다", () => {
    expect(vi.isMockFunction(loadFullScreenAd)).toBe(true);
    expect(vi.isMockFunction(showFullScreenAd)).toBe(true);
  });
});
