import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { screen, fireEvent } from "@testing-library/react";
import { mockAll, mockNavigate, mockLocation } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { STORAGE_KEYS, CURRENT_PROFILE_ID, type TaxProfile, type TaxResult } from "@/lib/types";
import { saveProfile } from "@/lib/storage";
import { formatNumber } from "@/lib/utils";

/**
 * Packet heal-1-02: 핵심 페이지 3종 실장(/, /input, /result)으로 통과 경로 확보
 *
 * Home/Input/Result 파일 자체는 이미 존재하지만(heal-1-01, 0007, 0008), 이 패킷은
 * 추가로 다음을 요구한다:
 * - /input: 손상된 localStorage 값에도 안전하게 폴백
 * - /result: taxService 계산 파사드(computeAndPersistResult, 0005)를 통해 결과를 얻고,
 *   세 자리 콤마·음수=추가납부로 표기
 * - AdSlot/TossRewardAd: env(광고 슬롯/그룹 id) 미설정·SDK 미지원 환경에서도 크래시 없음
 * - HEX 하드코딩/Tailwind/inline 여백 덮어쓰기 없음
 * - 3개 페이지 실제 라우팅 이동
 */

mockAll();

// CountUp의 rAF 애니메이션은 jsdom에서 타이밍이 불안정하므로, 최종값을 동기적으로
// 표시하는 스텁으로 교체해 표기 포맷(콤마)만 결정적으로 검증한다.
vi.mock("@/components/CountUp", () => ({
  CountUp: ({ value, unit = "원", testId }: { value: number; unit?: string; testId?: string }) =>
    React.createElement(
      "span",
      { "data-testid": testId },
      `${new Intl.NumberFormat("ko-KR").format(value)}${unit}`,
    ),
}));

// /result가 taxEngine을 직접 호출하는 대신 이 계산 파사드(0005)를 통해 결과를 얻어야
// 한다(AC-2). Result.tsx가 이 모듈을 (직접 또는 useServices() 경유로) import하면
// 아래 mock이 적용된다.
vi.mock("@/services/taxService", () => ({
  computeAndPersistResult: vi.fn(),
  loadOrInitDeductions: vi.fn(async () => ({
    creditCard: 0,
    medical: 0,
    education: 0,
    irp: 0,
    insurance: 0,
  })),
  simulate: vi.fn(),
}));

import Input from "@/pages/Input";
import Result from "@/pages/Result";
import { computeAndPersistResult } from "@/services/taxService";
import { TossAds, loadFullScreenAd } from "@apps-in-toss/web-framework";
import { AdSlot } from "@/components/AdSlot";
import { TossRewardAd } from "@/components/TossRewardAd";

const PROFILE_KEY = `${STORAGE_KEYS.profile}::${CURRENT_PROFILE_ID}`;

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

function setLocationState(state: unknown) {
  (mockLocation as { state: unknown }).state = state;
}

describe("핵심 페이지 3종 실장(/, /input, /result)으로 통과 경로 확보", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    setLocationState(null);
    mockLocation.pathname = "/result";
  });

  // ── AC-1: /input 저장 시 localStorage(:v1) 반영, 파싱 실패는 기본값 폴백 ──
  describe("AC-1: /input localStorage 저장·폴백", () => {
    it("AC-1[P0]: 유효 입력 제출 시 taxback:profile:v1::current 키에 정확한 값이 반영된다", () => {
      renderWithRouter(React.createElement(Input));

      fireEvent.click(screen.getByTestId("income-type-chip-employee"));
      fireEvent.change(screen.getByTestId("annual-salary-field"), {
        target: { value: "60000000" },
      });
      fireEvent.click(screen.getByRole("button", { name: /환급액 계산/ }));

      const raw = localStorage.getItem(PROFILE_KEY);
      expect(raw).not.toBeNull();
      const saved = JSON.parse(raw as string) as TaxProfile;
      expect(saved.annualSalary).toBe(60000000);
      expect(saved.incomeType).toBe("employee");
    });

    it("AC-1[P0]: 손상된 JSON이 저장돼 있어도 크래시 없이 기본값(빈 입력칸)으로 렌더된다", () => {
      localStorage.setItem(PROFILE_KEY, "{not-valid-json::");

      expect(() => renderWithRouter(React.createElement(Input))).not.toThrow();

      expect((screen.getByTestId("annual-salary-field") as HTMLInputElement).value).toBe("");
      expect((screen.getByTestId("dependents-field") as HTMLInputElement).value).toBe("");
    });
  });

  // ── AC-2: /result가 계산 파사드 결과를 세 자리 콤마·음수=추가납부로 표기 ──
  describe("AC-2: /result 계산 파사드 호출 + 콤마/음수 표기", () => {
    it("AC-2[P0]: taxService.computeAndPersistResult(계산 파사드)가 profileId로 호출되고, 반환값이 세 자리 콤마로 표시된다", async () => {
      saveProfile(PROFILE);
      setLocationState({ profileId: CURRENT_PROFILE_ID });

      const facadeResult: TaxResult = {
        profileId: CURRENT_PROFILE_ID,
        taxYear: 2026,
        estimatedTax: 1234567,
        withheld: 2469134,
        refund: 1234567,
        effectiveRate: 0.1,
        needsComprehensiveFiling: false,
        deductionBreakdown: [],
        computedAt: 1700000000000,
      };
      vi.mocked(computeAndPersistResult).mockResolvedValueOnce(facadeResult);

      renderWithRouter(React.createElement(Result));

      const hero = await screen.findByTestId("refund-hero");
      expect(vi.mocked(computeAndPersistResult)).toHaveBeenCalledWith(
        CURRENT_PROFILE_ID,
        expect.anything(),
      );
      // 세 자리 콤마: 1234567 -> "1,234,567원"
      expect(formatNumber(1234567)).toBe("1,234,567");
      expect(hero.textContent).toContain("1,234,567");
    });

    it("AC-2[P0]: 환급액이 음수(추가 납부)면 '추가납부'로 표기하고 절대값을 콤마로 표시한다", async () => {
      saveProfile(PROFILE);
      setLocationState({ profileId: CURRENT_PROFILE_ID });

      const facadeResult: TaxResult = {
        profileId: CURRENT_PROFILE_ID,
        taxYear: 2026,
        estimatedTax: 3456789,
        withheld: 2000000,
        refund: -1456789,
        effectiveRate: 0.15,
        needsComprehensiveFiling: false,
        deductionBreakdown: [],
        computedAt: 1700000000000,
      };
      vi.mocked(computeAndPersistResult).mockResolvedValueOnce(facadeResult);

      renderWithRouter(React.createElement(Result));

      const hero = await screen.findByTestId("refund-hero");
      // 음수는 절대값(1,456,789)으로 표시하고, 음수 부호 그대로("-1,456,789")는 노출하지 않는다
      expect(hero.textContent).toContain("1,456,789");
      expect(hero.textContent).not.toContain("-1,456,789");

      const summary = await screen.findByTestId("tax-summary-card");
      expect(summary.textContent).toContain("추가납부");
    });
  });

  // ── AC-3: AdSlot/TossRewardAd가 env 변수 미설정 시에도 크래시 없이 폴백 렌더 ──
  describe("AC-3: 광고 컴포넌트 env 미설정 폴백", () => {
    it("AC-3[P0]: AdSlot은 배너 미지원(SDK/env 없음) 환경에서도 콘솔 에러 없이 빈 컨테이너로 렌더된다", () => {
      const isSupportedSpy = vi
        .spyOn(TossAds.attachBanner, "isSupported")
        .mockImplementation(() => {
          throw new Error("WebView 밖 — SDK 미지원");
        });
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // adGroupId는 env(VITE_TOSS_AD_GROUP_ID) 미설정 시 호출부가 넘기는 fallback 값을 흉내낸다.
      const { container } = renderWithRouter(
        React.createElement(AdSlot, { adGroupId: "result-banner" }),
      );

      expect(container.querySelector('[data-ad-group-id="result-banner"]')).not.toBeNull();
      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
      isSupportedSpy.mockRestore();
    });

    it("AC-3[P0]: TossRewardAd는 광고 로드가 실패(env/SDK 미지원)해도 크래시 없이 children을 자동 노출한다", async () => {
      vi.mocked(loadFullScreenAd).mockImplementationOnce(() => {
        throw new Error("SDK 미지원");
      });
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() =>
        renderWithRouter(
          React.createElement(TossRewardAd, {
            slotId: "result-unlock",
            children: React.createElement(
              "span",
              { "data-testid": "gated-content" },
              "결과",
            ),
          }),
        ),
      ).not.toThrow();

      expect(await screen.findByTestId("gated-content")).toBeTruthy();
      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  // ── AC-4: HEX 하드코딩·Tailwind/inline 여백 덮어쓰기 0건 ──
  describe("AC-4: HEX 하드코딩 / inline 여백 덮어쓰기 금지", () => {
    it("AC-4[P0]: Home/Input/Result 소스에 HEX 색상 리터럴이 없다", () => {
      const files = ["Home.tsx", "Input.tsx", "Result.tsx"].map((f) =>
        readFileSync(resolve(__dirname, "../pages", f), "utf-8"),
      );
      const hexColorPattern = /#[0-9a-fA-F]{3,8}\b/g;

      files.forEach((source) => {
        const matches = source.match(hexColorPattern) ?? [];
        expect(matches).toEqual([]);
      });
    });

    it("AC-4[P0]: Home/Input/Result 소스에 TDS 컴포넌트 margin/padding 인라인 덮어쓰기가 없다", () => {
      const files = ["Home.tsx", "Input.tsx", "Result.tsx"].map((f) =>
        readFileSync(resolve(__dirname, "../pages", f), "utf-8"),
      );
      const inlineSpacingPattern = /style=\{\{[^}]*(margin|padding)/;

      files.forEach((source) => {
        expect(inlineSpacingPattern.test(source)).toBe(false);
      });
    });
  });

  // ── AC-5: 3개 페이지 라우팅 이동 및 빌드 통과 ──
  describe("AC-5: 3개 페이지 라우팅 이동", () => {
    it("AC-5[P0]: /, /input, /result 세 경로 모두 실제 페이지 컴포넌트를 렌더한다(플레이스홀더 아님)", async () => {
      const App = (await import("@/App")).default;

      const home = renderWithRouter(React.createElement(App), { initialEntries: ["/"] });
      expect(screen.queryByText("준비 중인 화면이에요")).toBeNull();
      home.unmount();

      const input = renderWithRouter(React.createElement(App), { initialEntries: ["/input"] });
      expect(screen.getByText("소득 입력").textContent).toBe("소득 입력");
      expect(screen.queryByText("준비 중인 화면이에요")).toBeNull();
      input.unmount();

      const result = renderWithRouter(React.createElement(App), { initialEntries: ["/result"] });
      expect(screen.getByText("예상 환급액").textContent).toBe("예상 환급액");
      expect(screen.queryByText("준비 중인 화면이에요")).toBeNull();
      result.unmount();
    });

    it("AC-5[P0]: Input 저장 완료 후 실제로 navigate('/result', ...)가 호출된다", () => {
      renderWithRouter(React.createElement(Input));

      fireEvent.click(screen.getByTestId("income-type-chip-employee"));
      fireEvent.change(screen.getByTestId("annual-salary-field"), {
        target: { value: "45000000" },
      });
      fireEvent.click(screen.getByRole("button", { name: /환급액 계산/ }));

      expect(mockNavigate).toHaveBeenCalledWith("/result", {
        state: { profileId: CURRENT_PROFILE_ID },
      });
    });
  });
});
