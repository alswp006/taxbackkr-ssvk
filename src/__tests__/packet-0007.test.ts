import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { STORAGE_KEYS, CURRENT_PROFILE_ID, type TaxProfile } from "@/lib/types";

mockAll();

// Input.tsx not yet implemented — this import will fail until the Coder creates it.
import Input from "@/pages/Input";

const PROFILE_KEY = `${STORAGE_KEYS.profile}::${CURRENT_PROFILE_ID}`;

function readSavedProfile(): TaxProfile | null {
  const raw = localStorage.getItem(PROFILE_KEY);
  return raw ? (JSON.parse(raw) as TaxProfile) : null;
}

describe("소득 입력 페이지 /input (packet 0007)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
  });

  // ── AC-1 [P0]: 제출 성공 → saveProfile + navigate('/result', { state: { profileId } }) ──
  describe("AC-1[P0]: 제출 성공 흐름", () => {
    it("AC-1[P0]: employee 선택 + 유효 입력 제출 시 프로필 저장 후 /result로 이동한다", () => {
      renderWithRouter(React.createElement(Input));

      fireEvent.click(screen.getByTestId("income-type-chip-employee"));
      fireEvent.change(screen.getByTestId("annual-salary-field"), {
        target: { value: "50000000" },
      });
      fireEvent.change(screen.getByTestId("dependents-field"), {
        target: { value: "1" },
      });
      fireEvent.click(screen.getByRole("button", { name: /환급액 계산/ }));

      const saved = readSavedProfile();
      expect(saved?.incomeType).toBe("employee");
      expect(saved?.annualSalary).toBe(50000000);
      expect(saved?.dependents).toBe(1);
      expect(mockNavigate).toHaveBeenCalledWith("/result", {
        state: { profileId: CURRENT_PROFILE_ID },
      });
    });

    it("AC-1[P0]: 유효성 검사 실패 시 프로필을 저장하지 않고 navigate도 실행하지 않는다", () => {
      renderWithRouter(React.createElement(Input));

      fireEvent.click(screen.getByTestId("income-type-chip-employee"));
      // annualSalary left empty
      fireEvent.click(screen.getByRole("button", { name: /환급액 계산/ }));

      expect(readSavedProfile()).toBeNull();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  // ── AC-2 [P0]: multi 선택 시 freelance-income-field 노출 ──
  describe("AC-2[P0]: N잡(multi) 프리랜서 수입 필드 노출", () => {
    it("AC-2[P0]: incomeType='multi' 선택 시 data-testid='freelance-income-field' 가 나타난다", () => {
      renderWithRouter(React.createElement(Input));

      expect(screen.queryByTestId("freelance-income-field")).toBeNull();

      fireEvent.click(screen.getByTestId("income-type-chip-multi"));

      expect(screen.getByTestId("freelance-income-field").tagName).toBe("INPUT");
    });

    it("AC-2[P0]: incomeType='employee' 선택 시에는 freelance-income-field가 노출되지 않는다", () => {
      renderWithRouter(React.createElement(Input));

      fireEvent.click(screen.getByTestId("income-type-chip-employee"));

      expect(screen.queryByTestId("freelance-income-field")).toBeNull();
    });
  });

  // ── AC-3 [P1]: 빈 연봉 거부 ──
  it("AC-3[P1]: 연봉 미입력 상태로 제출하면 '연봉을 입력해주세요' 에러가 표시된다", () => {
    renderWithRouter(React.createElement(Input));

    fireEvent.click(screen.getByTestId("income-type-chip-employee"));
    fireEvent.click(screen.getByRole("button", { name: /환급액 계산/ }));

    expect(screen.getByText("연봉을 입력해주세요").textContent).toBe("연봉을 입력해주세요");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // ── AC-4 [P1]: 10억 초과 거부 ──
  it("AC-4[P1]: 연봉이 10억원을 초과하면 '10억원 이하로 입력해주세요' 에러가 표시된다", () => {
    renderWithRouter(React.createElement(Input));

    fireEvent.click(screen.getByTestId("income-type-chip-employee"));
    fireEvent.change(screen.getByTestId("annual-salary-field"), {
      target: { value: "2000000000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /환급액 계산/ }));

    expect(screen.getByText("10억원 이하로 입력해주세요").textContent).toBe(
      "10억원 이하로 입력해주세요",
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // ── AC-5 [P1]: 숫자 키패드 노출 ──
  it("AC-5[P1]: 연봉·부양가족 TextField는 inputMode='numeric'을 갖는다", () => {
    renderWithRouter(React.createElement(Input));

    expect((screen.getByTestId("annual-salary-field") as HTMLInputElement).inputMode).toBe(
      "numeric",
    );
    expect((screen.getByTestId("dependents-field") as HTMLInputElement).inputMode).toBe(
      "numeric",
    );
  });

  // ── AC-6 [P1]: 기존 프로필 프리필 ──
  it("AC-6[P1]: 기존 taxback:profile:v1이 있으면 모든 필드가 프리필된다", () => {
    const existing: TaxProfile = {
      id: CURRENT_PROFILE_ID,
      taxYear: 2026,
      incomeType: "multi",
      annualSalary: 42000000,
      freelanceIncome: 8000000,
      dependents: 2,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(existing));

    renderWithRouter(React.createElement(Input));

    expect((screen.getByTestId("annual-salary-field") as HTMLInputElement).value).toBe(
      "42000000",
    );
    expect((screen.getByTestId("dependents-field") as HTMLInputElement).value).toBe("2");
    expect((screen.getByTestId("freelance-income-field") as HTMLInputElement).value).toBe(
      "8000000",
    );
    expect(screen.getByTestId("income-type-chip-multi").getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  // ── AC-7 [P1]: 레이아웃 계약 — ScreenScaffold + SubmitFooter(display=block) ──
  it("AC-7[P1]: ScreenScaffold 골격 안에 SubmitFooter 단일 전체폭 버튼만 렌더된다(중첩 버튼 없음)", () => {
    const { container } = renderWithRouter(React.createElement(Input));

    // ScreenScaffold renders Top inside a <nav role="navigation">
    expect(screen.getByRole("navigation").tagName).toBe("NAV");

    const ctaButton = screen.getByRole("button", { name: /환급액 계산/ });
    expect(ctaButton.tagName).toBe("BUTTON");
    // No nested <button><button> (FixedBottomCTA must not wrap a TDS <Button>)
    expect(container.querySelectorAll("button button").length).toBe(0);
  });

  // ── AC-8 [P0]: 외부 이탈 금지 ──
  describe("AC-8[P0]: 외부 URL 이동 금지", () => {
    it("AC-8[P0]: 정상 제출 흐름에서 window.open이 호출되지 않는다", () => {
      const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
      const hrefBefore = window.location.href;

      renderWithRouter(React.createElement(Input));
      fireEvent.click(screen.getByTestId("income-type-chip-employee"));
      fireEvent.change(screen.getByTestId("annual-salary-field"), {
        target: { value: "50000000" },
      });
      fireEvent.click(screen.getByRole("button", { name: /환급액 계산/ }));

      expect(openSpy).not.toHaveBeenCalled();
      expect(window.location.href).toBe(hrefBefore);
      openSpy.mockRestore();
    });

    it("AC-8[P0]: 소득 유형 Chip 전환 인터랙션에서도 window.open이 호출되지 않는다", () => {
      const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

      renderWithRouter(React.createElement(Input));
      fireEvent.click(screen.getByTestId("income-type-chip-freelancer"));
      fireEvent.click(screen.getByTestId("income-type-chip-multi"));
      fireEvent.click(screen.getByTestId("income-type-chip-employee"));

      expect(openSpy).not.toHaveBeenCalled();
      openSpy.mockRestore();
    });
  });
});
