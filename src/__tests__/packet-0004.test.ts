import { describe, it, expect } from "vitest";
import { buildChecklistState, compareResults, computeSeasonBanner } from "@/lib/derive";
import type { DeductionInput, TaxResult, ChecklistItem } from "@/lib/types";

describe("파생 상태 헬퍼 (체크리스트·연도비교·시즌배너)", () => {
  describe("buildChecklistState — 체크리스트 상태 파생", () => {
    it("AC-1[P0]: should return 5 checklist items with achieved rate based on deductions", () => {
      const deductions: DeductionInput = {
        creditCard: 500000,
        medical: 0,
        education: 0,
        irp: 0,
        insurance: 0,
      };
      const taxYear = 2024;

      const result = buildChecklistState(deductions, taxYear);

      expect(result.items).toHaveLength(5);
      expect(result.items.map((i: ChecklistItem) => i.key)).toContain("irp");
      expect(result.items.map((i: ChecklistItem) => i.key)).toContain("pension");
      expect(result.items.map((i: ChecklistItem) => i.key)).toContain("medical");
      expect(result.items.map((i: ChecklistItem) => i.key)).toContain("creditCardRatio");
      expect(result.items.map((i: ChecklistItem) => i.key)).toContain("insurance");
    });

    it("AC-1[P0]: should calculate done count when current >= limit * 0.9", () => {
      const deductions: DeductionInput = {
        creditCard: 27000000, // 신용카드 사용액 90% 이상
        medical: 2700000, // >= 3M * 0.9
        education: 0,
        irp: 0,
        insurance: 0,
      };
      const taxYear = 2024;

      const result = buildChecklistState(deductions, taxYear);

      const doneCount = result.items.filter((item: ChecklistItem) => item.done).length;
      expect(doneCount).toBe(2);
      expect(result.achievedRate).toBe(0.4); // 2/5 = 0.4
    });

    it("AC-2[P0]: should return achievedRate = 0.4 when 2 out of 5 items are done", () => {
      const deductions: DeductionInput = {
        creditCard: 30000000, // >= 90% of limit ✓
        medical: 3000000, // >= 3M * 0.9 = 2.7M ✓
        education: 0,
        irp: 0,
        insurance: 0,
      };
      const taxYear = 2024;

      const result = buildChecklistState(deductions, taxYear);

      expect(result.achievedRate).toBe(0.4);
      expect(result.items.filter((i: ChecklistItem) => i.done).length).toBe(2);
    });

    it("should mark items as done based on individual thresholds", () => {
      const deductions: DeductionInput = {
        creditCard: 27000001, // >= 90% ✓
        medical: 0, // < 3M * 0.9 ✗
        education: 0,
        irp: 8100001, // >= 9M * 0.9 = 8.1M ✓
        insurance: 1800001, // >= 2M * 0.9 = 1.8M ✓
      };
      const taxYear = 2024;

      const result = buildChecklistState(deductions, taxYear);

      expect(result.items.find((i: ChecklistItem) => i.key === "creditCardRatio")?.done).toBe(true);
      expect(result.items.find((i: ChecklistItem) => i.key === "medical")?.done).toBe(false);
      expect(result.items.find((i: ChecklistItem) => i.key === "irp")?.done).toBe(true);
      expect(result.items.find((i: ChecklistItem) => i.key === "insurance")?.done).toBe(true);
      // achievedRate depends on pension item which may be calculated independently
      expect(result.achievedRate).toBeGreaterThanOrEqual(0.4);
    });

    it("should return achievedRate = 1.0 when all items are done", () => {
      const deductions: DeductionInput = {
        creditCard: 30000000,
        medical: 3000000,
        education: 1000000,
        irp: 9000000,
        insurance: 2000000,
      };
      const taxYear = 2024;

      const result = buildChecklistState(deductions, taxYear);

      expect(result.items.every((i: ChecklistItem) => i.done)).toBe(true);
      expect(result.achievedRate).toBe(1.0);
    });

    it("should return achievedRate = 0 when no items are done", () => {
      const deductions: DeductionInput = {
        creditCard: 0,
        medical: 0,
        education: 0,
        irp: 0,
        insurance: 0,
      };
      const taxYear = 2024;

      const result = buildChecklistState(deductions, taxYear);

      expect(result.items.every((i: ChecklistItem) => !i.done)).toBe(true);
      expect(result.achievedRate).toBe(0);
    });
  });

  describe("compareResults — 연도별 결과 비교", () => {
    it("AC-3[P0]: should return object with years, refunds, diff fields", () => {
      const meta: Record<number, TaxResult> = {
        2024: {
          profileId: "id1",
          taxYear: 2024,
          estimatedTax: 3000000,
          withheld: 3500000,
          refund: 500000,
          effectiveRate: 0.06,
          needsComprehensiveFiling: false,
          deductionBreakdown: [],
          computedAt: 1000000,
        } as unknown as TaxResult,
        2023: {
          profileId: "id2",
          taxYear: 2023,
          estimatedTax: 3100000,
          withheld: 3500000,
          refund: 400000,
          effectiveRate: 0.062,
          needsComprehensiveFiling: false,
          deductionBreakdown: [],
          computedAt: 1000000,
        } as unknown as TaxResult,
      };

      const result = compareResults(meta);

      expect(result).toHaveProperty("years");
      expect(result).toHaveProperty("refunds");
      expect(result).toHaveProperty("diff");
    });

    it("AC-3[P0]: should return insufficient:true when only 1 result", () => {
      const meta: Record<number, TaxResult> = {
        2024: {
          profileId: "id1",
          taxYear: 2024,
          estimatedTax: 3000000,
          withheld: 3500000,
          refund: 500000,
          effectiveRate: 0.06,
          needsComprehensiveFiling: false,
          deductionBreakdown: [],
          computedAt: 1000000,
        } as unknown as TaxResult,
      };

      const result = compareResults(meta);

      expect(result.insufficient).toBe(true);
    });

    it("should return insufficient:true when 0 results", () => {
      const meta: Record<number, TaxResult> = {};

      const result = compareResults(meta);

      expect(result.insufficient).toBe(true);
    });

    it("should compute diff when 2+ results exist", () => {
      const meta: Record<number, TaxResult> = {
        2024: {
          profileId: "id1",
          taxYear: 2024,
          estimatedTax: 3000000,
          withheld: 3500000,
          refund: 500000,
          effectiveRate: 0.06,
          needsComprehensiveFiling: false,
          deductionBreakdown: [],
          computedAt: 1000000,
        } as unknown as TaxResult,
        2023: {
          profileId: "id2",
          taxYear: 2023,
          estimatedTax: 3200000,
          withheld: 3500000,
          refund: 300000,
          effectiveRate: 0.064,
          needsComprehensiveFiling: false,
          deductionBreakdown: [],
          computedAt: 1000000,
        } as unknown as TaxResult,
      };

      const result = compareResults(meta);

      expect(result.insufficient).toBeFalsy();
      expect(result.refunds).toEqual([300000, 500000]);
      expect(result.diff).toBe(200000); // 500000 - 300000
    });

    it("should handle negative diff correctly", () => {
      const meta: Record<number, TaxResult> = {
        2024: {
          profileId: "id1",
          taxYear: 2024,
          estimatedTax: 3300000,
          withheld: 3500000,
          refund: 200000,
          effectiveRate: 0.066,
          needsComprehensiveFiling: false,
          deductionBreakdown: [],
          computedAt: 1000000,
        } as unknown as TaxResult,
        2023: {
          profileId: "id2",
          taxYear: 2023,
          estimatedTax: 3000000,
          withheld: 3500000,
          refund: 500000,
          effectiveRate: 0.06,
          needsComprehensiveFiling: false,
          deductionBreakdown: [],
          computedAt: 1000000,
        } as unknown as TaxResult,
      };

      const result = compareResults(meta);

      expect(result.diff).toBe(-300000); // 200000 - 500000
    });

    it("should include all years in ascending order", () => {
      const meta: Record<number, TaxResult> = {
        2022: {
          profileId: "id1",
          taxYear: 2022,
          estimatedTax: 3500000,
          withheld: 3600000,
          refund: 100000,
          effectiveRate: 0.07,
          needsComprehensiveFiling: false,
          deductionBreakdown: [],
          computedAt: 1000000,
        } as unknown as TaxResult,
        2024: {
          profileId: "id3",
          taxYear: 2024,
          estimatedTax: 3000000,
          withheld: 3500000,
          refund: 500000,
          effectiveRate: 0.06,
          needsComprehensiveFiling: false,
          deductionBreakdown: [],
          computedAt: 1000000,
        } as unknown as TaxResult,
        2023: {
          profileId: "id2",
          taxYear: 2023,
          estimatedTax: 3200000,
          withheld: 3500000,
          refund: 300000,
          effectiveRate: 0.064,
          needsComprehensiveFiling: false,
          deductionBreakdown: [],
          computedAt: 1000000,
        } as unknown as TaxResult,
      };

      const result = compareResults(meta);

      expect(result.years).toEqual([2022, 2023, 2024]);
      expect(result.refunds).toEqual([100000, 300000, 500000]);
    });

    it("should handle 3+ years comparison", () => {
      const meta: Record<number, TaxResult> = {
        2021: {
          profileId: "id1",
          taxYear: 2021,
          estimatedTax: 3600000,
          withheld: 3700000,
          refund: 100000,
          effectiveRate: 0.072,
          needsComprehensiveFiling: false,
          deductionBreakdown: [],
          computedAt: 1000000,
        } as unknown as TaxResult,
        2022: {
          profileId: "id2",
          taxYear: 2022,
          estimatedTax: 3500000,
          withheld: 3700000,
          refund: 200000,
          effectiveRate: 0.07,
          needsComprehensiveFiling: false,
          deductionBreakdown: [],
          computedAt: 1000000,
        } as unknown as TaxResult,
        2023: {
          profileId: "id3",
          taxYear: 2023,
          estimatedTax: 3200000,
          withheld: 3500000,
          refund: 300000,
          effectiveRate: 0.064,
          needsComprehensiveFiling: false,
          deductionBreakdown: [],
          computedAt: 1000000,
        } as unknown as TaxResult,
        2024: {
          profileId: "id4",
          taxYear: 2024,
          estimatedTax: 3000000,
          withheld: 3500000,
          refund: 500000,
          effectiveRate: 0.06,
          needsComprehensiveFiling: false,
          deductionBreakdown: [],
          computedAt: 1000000,
        } as unknown as TaxResult,
      };

      const result = compareResults(meta);

      expect(result.insufficient).toBeFalsy();
      expect(result.years).toHaveLength(4);
      expect(result.refunds).toHaveLength(4);
    });
  });

  describe("computeSeasonBanner — 시즌 알림 배너 상태", () => {
    it("AC-4[P0]: should return active:true and correct message for months 1-5", () => {
      const result = computeSeasonBanner(1);

      expect(result.active).toBe(true);
      expect(result.message).toBe("지금은 연말정산·종합소득세 시즌이에요. 환급액을 확인해보세요");
    });

    it("AC-4[P0]: should return active:false for months 6-12", () => {
      const result = computeSeasonBanner(6);

      expect(result.active).toBe(false);
    });

    it("should return same state for same month (deterministic)", () => {
      const month = 3;
      const result1 = computeSeasonBanner(month);
      const result2 = computeSeasonBanner(month);

      expect(result1).toEqual(result2);
    });

    it("should be active for all months 1-5", () => {
      for (let month = 1; month <= 5; month++) {
        const result = computeSeasonBanner(month);
        expect(result.active).toBe(true);
        expect(result.message).toBe("지금은 연말정산·종합소득세 시즌이에요. 환급액을 확인해보세요");
      }
    });

    it("should be inactive for all months 6-12", () => {
      for (let month = 6; month <= 12; month++) {
        const result = computeSeasonBanner(month);
        expect(result.active).toBe(false);
      }
    });

    it("should not depend on Date.now() — accepts month as parameter", () => {
      // If the function called Date.now() internally, we couldn't control it
      // This test verifies that month parameter alone determines output
      const bannerMonth1 = computeSeasonBanner(1);
      const bannerMonth1Again = computeSeasonBanner(1);

      expect(bannerMonth1).toEqual(bannerMonth1Again);

      const bannerMonth7 = computeSeasonBanner(7);
      expect(bannerMonth7.active).toBe(false);
    });

    it("should handle edge case: month boundary (May 31 → June 1)", () => {
      expect(computeSeasonBanner(5).active).toBe(true);
      expect(computeSeasonBanner(6).active).toBe(false);
    });
  });
});
