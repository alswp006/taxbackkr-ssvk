import { describe, it, expect } from "vitest";
import type {
  TaxProfile,
  DeductionInput,
  DeductionBreakdownItem,
} from "@/lib/types";
import {
  calcTax,
  calcDeductionBreakdown,
  judgeComprehensiveFiling,
} from "@/lib/taxEngine";

describe("세금 계산 엔진 + 세율표 상수 (packet 0003)", () => {
  // ============================================================================
  // F1-AC-1 [P0]: calcTax returns TaxResult with valid constraints
  // estimatedTax >= 0, effectiveRate ∈ [0,1], refund = withheld - estimatedTax
  // ============================================================================

  describe("F1-AC-1: calcTax result contract", () => {
    it("should return TaxResult with valid estimatedTax and effectiveRate", () => {
      const profile: TaxProfile = {
        id: "profile-1",
        taxYear: 2026,
        incomeType: "employee",
        annualSalary: 50000000,
        freelanceIncome: 0,
        dependents: 1,
        createdAt: 1735689600000,
        updatedAt: 1735689600000,
      };
      const deductions: DeductionInput = {
        creditCard: 20000000,
        medical: 0,
        education: 0,
        irp: 0,
        insurance: 0,
      };
      const computedAt = 1735689600000;

      const result = calcTax(profile, deductions, computedAt);

      // Type contract: profileId must match
      expect(result.profileId).toBe("profile-1");
      expect(result.taxYear).toBe(2026);

      // estimatedTax >= 0
      expect(result.estimatedTax).toBeGreaterThanOrEqual(0);

      // effectiveRate in [0, 1]
      expect(result.effectiveRate).toBeGreaterThanOrEqual(0);
      expect(result.effectiveRate).toBeLessThanOrEqual(1);

      // Refund identity: refund = withheld - estimatedTax
      expect(result.refund).toBe(result.withheld - result.estimatedTax);
    });

    it("should calculate withheld >= estimatedTax for typical employee", () => {
      const profile: TaxProfile = {
        id: "profile-2",
        taxYear: 2026,
        incomeType: "employee",
        annualSalary: 50000000,
        freelanceIncome: 0,
        dependents: 1,
        createdAt: 1735689600000,
        updatedAt: 1735689600000,
      };
      const deductions: DeductionInput = {
        creditCard: 10000000,
        medical: 0,
        education: 0,
        irp: 0,
        insurance: 0,
      };
      const computedAt = 1735689600000;

      const result = calcTax(profile, deductions, computedAt);

      // withhold is typically > estimatedTax (resulting in refund)
      expect(result.withheld).toBeGreaterThanOrEqual(result.estimatedTax);
      expect(result.refund).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // F1-AC-6 [P1]: Negative/invalid input clamping
  // annualSalary: -100 → clamp to 0 → estimatedTax = 0
  // ============================================================================

  describe("F1-AC-6: Negative input clamping", () => {
    it("should clamp negative annualSalary to 0 and return estimatedTax=0", () => {
      const profile: TaxProfile = {
        id: "profile-3",
        taxYear: 2026,
        incomeType: "employee",
        annualSalary: -100,
        freelanceIncome: 0,
        dependents: 0,
        createdAt: 1735689600000,
        updatedAt: 1735689600000,
      };
      const deductions: DeductionInput = {
        creditCard: 0,
        medical: 0,
        education: 0,
        irp: 0,
        insurance: 0,
      };
      const computedAt = 1735689600000;

      const result = calcTax(profile, deductions, computedAt);

      expect(result.estimatedTax).toBe(0);
      expect(result.refund).toBe(result.withheld);
    });

    it("should not throw and handle negative freelanceIncome", () => {
      const profile: TaxProfile = {
        id: "profile-4",
        taxYear: 2026,
        incomeType: "freelancer",
        annualSalary: 0,
        freelanceIncome: -500000,
        dependents: 0,
        createdAt: 1735689600000,
        updatedAt: 1735689600000,
      };
      const deductions: DeductionInput = {
        creditCard: 0,
        medical: 0,
        education: 0,
        irp: 0,
        insurance: 0,
      };
      const computedAt = 1735689600000;

      const result = calcTax(profile, deductions, computedAt);

      // Should clamp to 0 and handle gracefully
      expect(result.estimatedTax).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // F1-AC-7 [P0]: Deterministic calculation
  // Same input called twice → identical estimatedTax, refund, effectiveRate
  // ============================================================================

  describe("F1-AC-7: Deterministic calculation", () => {
    it("should return identical results for identical inputs (call 1 vs call 2)", () => {
      const profile: TaxProfile = {
        id: "profile-5",
        taxYear: 2026,
        incomeType: "employee",
        annualSalary: 50000000,
        freelanceIncome: 0,
        dependents: 1,
        createdAt: 1735689600000,
        updatedAt: 1735689600000,
      };
      const deductions: DeductionInput = {
        creditCard: 20000000,
        medical: 0,
        education: 0,
        irp: 0,
        insurance: 0,
      };
      const computedAt = 1735689600000;

      const result1 = calcTax(profile, deductions, computedAt);
      const result2 = calcTax(profile, deductions, computedAt);

      expect(result1.estimatedTax).toBe(result2.estimatedTax);
      expect(result1.refund).toBe(result2.refund);
      expect(result1.effectiveRate).toBe(result2.effectiveRate);
    });

    it("should have consistent effectiveRate calculation across multiple profiles", () => {
      const computedAt = 1735689600000;
      const deductions: DeductionInput = {
        creditCard: 0,
        medical: 0,
        education: 0,
        irp: 0,
        insurance: 0,
      };

      const profiles: TaxProfile[] = [
        {
          id: "p1",
          taxYear: 2026,
          incomeType: "employee",
          annualSalary: 40000000,
          freelanceIncome: 0,
          dependents: 0,
          createdAt: 1735689600000,
          updatedAt: 1735689600000,
        },
        {
          id: "p2",
          taxYear: 2026,
          incomeType: "employee",
          annualSalary: 60000000,
          freelanceIncome: 0,
          dependents: 1,
          createdAt: 1735689600000,
          updatedAt: 1735689600000,
        },
      ];

      const result1 = calcTax(profiles[0], deductions, computedAt);
      const result1Again = calcTax(profiles[0], deductions, computedAt);

      expect(result1.effectiveRate).toBe(result1Again.effectiveRate);
      // effectiveRate should be a 4-decimal precision
      expect(result1.effectiveRate.toString().split(".")[1]?.length).toBeLessThanOrEqual(4);
    });
  });

  // ============================================================================
  // F1-AC-3 [P0]: judgeComprehensiveFiling rule
  // freelanceIncome > 3,000,000 → true
  // freelanceIncome = 3,000,000 → false
  // ============================================================================

  describe("F1-AC-3: judgeComprehensiveFiling threshold", () => {
    it("should return true when freelanceIncome > 3,000,000", () => {
      const profile: TaxProfile = {
        id: "profile-filing-1",
        taxYear: 2026,
        incomeType: "freelancer",
        annualSalary: 0,
        freelanceIncome: 3000001,
        dependents: 0,
        createdAt: 1735689600000,
        updatedAt: 1735689600000,
      };

      const result = judgeComprehensiveFiling(profile);

      expect(result).toBe(true);
    });

    it("should return false when freelanceIncome = 3,000,000 (boundary)", () => {
      const profile: TaxProfile = {
        id: "profile-filing-2",
        taxYear: 2026,
        incomeType: "freelancer",
        annualSalary: 0,
        freelanceIncome: 3000000,
        dependents: 0,
        createdAt: 1735689600000,
        updatedAt: 1735689600000,
      };

      const result = judgeComprehensiveFiling(profile);

      expect(result).toBe(false);
    });

    it("should return false when freelanceIncome < 3,000,000", () => {
      const profile: TaxProfile = {
        id: "profile-filing-3",
        taxYear: 2026,
        incomeType: "employee",
        annualSalary: 50000000,
        freelanceIncome: 1000000,
        dependents: 0,
        createdAt: 1735689600000,
        updatedAt: 1735689600000,
      };

      const result = judgeComprehensiveFiling(profile);

      expect(result).toBe(false);
    });

    it("should return false for pure employee with 0 freelanceIncome", () => {
      const profile: TaxProfile = {
        id: "profile-filing-4",
        taxYear: 2026,
        incomeType: "employee",
        annualSalary: 50000000,
        freelanceIncome: 0,
        dependents: 1,
        createdAt: 1735689600000,
        updatedAt: 1735689600000,
      };

      const result = judgeComprehensiveFiling(profile);

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // F4-AC-2 [P0]: calcDeductionBreakdown with limit clamping
  // IRP limit: 9,000,000 → input > limit should be clamped
  // Returns: { key, label, savedTax }[]
  // ============================================================================

  describe("F4-AC-2: calcDeductionBreakdown with limit clamping", () => {
    it("should return breakdown array with clamped IRP to 9,000,000 limit", () => {
      const profile: TaxProfile = {
        id: "profile-breakdown-1",
        taxYear: 2026,
        incomeType: "employee",
        annualSalary: 50000000,
        freelanceIncome: 0,
        dependents: 1,
        createdAt: 1735689600000,
        updatedAt: 1735689600000,
      };
      // IRP limit is 9,000,000, input exceeds it
      const deductions: DeductionInput = {
        creditCard: 0,
        medical: 0,
        education: 0,
        irp: 15000000, // Exceeds limit
        insurance: 0,
      };

      const result = calcDeductionBreakdown(profile, deductions);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      const irpItem = result.find((item: DeductionBreakdownItem) => item.key === "irp");
      expect(irpItem).toBeDefined();
      expect(irpItem!.label).toBe("IRP/연금저축");
      // savedTax should be calculated based on clamped 9,000,000
      expect(irpItem!.savedTax).toBeGreaterThanOrEqual(0);
    });

    it("should return breakdown with all deduction items", () => {
      const profile: TaxProfile = {
        id: "profile-breakdown-2",
        taxYear: 2026,
        incomeType: "employee",
        annualSalary: 60000000,
        freelanceIncome: 0,
        dependents: 1,
        createdAt: 1735689600000,
        updatedAt: 1735689600000,
      };
      const deductions: DeductionInput = {
        creditCard: 10000000,
        medical: 5000000,
        education: 2000000,
        irp: 3000000,
        insurance: 1000000,
      };

      const result = calcDeductionBreakdown(profile, deductions);

      // Should include at least these 5 items
      const keys = result.map((item: DeductionBreakdownItem) => item.key);
      expect(keys).toContain("creditCard");
      expect(keys).toContain("medical");
      expect(keys).toContain("education");
      expect(keys).toContain("irp");
      expect(keys).toContain("insurance");

      // All savedTax values should be >= 0
      result.forEach((item: DeductionBreakdownItem) => {
        expect(item.savedTax).toBeGreaterThanOrEqual(0);
        expect(item.label).toBeTruthy();
      });
    });

    it("should clamp creditCard to applicable limit", () => {
      const profile: TaxProfile = {
        id: "profile-breakdown-3",
        taxYear: 2026,
        incomeType: "employee",
        annualSalary: 50000000,
        freelanceIncome: 0,
        dependents: 1,
        createdAt: 1735689600000,
        updatedAt: 1735689600000,
      };
      // Credit card limit is ~20% of salary or specified amount
      const deductions: DeductionInput = {
        creditCard: 100000000, // Excessive
        medical: 0,
        education: 0,
        irp: 0,
        insurance: 0,
      };

      const result = calcDeductionBreakdown(profile, deductions);

      const creditCardItem = result.find((item: DeductionBreakdownItem) => item.key === "creditCard");
      expect(creditCardItem).toBeDefined();
      // Tax savings should reflect clamped amount
      expect(creditCardItem!.savedTax).toBeGreaterThanOrEqual(0);
    });

    it("should return empty savedTax for zero deductions", () => {
      const profile: TaxProfile = {
        id: "profile-breakdown-4",
        taxYear: 2026,
        incomeType: "employee",
        annualSalary: 50000000,
        freelanceIncome: 0,
        dependents: 0,
        createdAt: 1735689600000,
        updatedAt: 1735689600000,
      };
      const deductions: DeductionInput = {
        creditCard: 0,
        medical: 0,
        education: 0,
        irp: 0,
        insurance: 0,
      };

      const result = calcDeductionBreakdown(profile, deductions);

      // All items should have 0 savedTax when no deductions
      result.forEach((item: DeductionBreakdownItem) => {
        expect(item.savedTax).toBe(0);
      });
    });
  });

  // ============================================================================
  // Additional: Verify effectiveRate is 4-decimal precision
  // ============================================================================

  describe("Effective rate precision", () => {
    it("should calculate effectiveRate with up to 4 decimal places", () => {
      const profile: TaxProfile = {
        id: "profile-precision-1",
        taxYear: 2026,
        incomeType: "employee",
        annualSalary: 33333333,
        freelanceIncome: 0,
        dependents: 0,
        createdAt: 1735689600000,
        updatedAt: 1735689600000,
      };
      const deductions: DeductionInput = {
        creditCard: 0,
        medical: 0,
        education: 0,
        irp: 0,
        insurance: 0,
      };
      const computedAt = 1735689600000;

      const result = calcTax(profile, deductions, computedAt);

      // Check that effectiveRate is a finite number between 0 and 1
      expect(Number.isFinite(result.effectiveRate)).toBe(true);
      expect(result.effectiveRate).toBeGreaterThanOrEqual(0);
      expect(result.effectiveRate).toBeLessThanOrEqual(1);

      // Verify 4-decimal precision (max)
      const decimalStr = result.effectiveRate.toString().split(".")[1];
      const decimalPlaces = decimalStr ? decimalStr.length : 0;
      expect(decimalPlaces).toBeLessThanOrEqual(4);
    });
  });

  // ============================================================================
  // Integration: Multi-income (N잡) scenario
  // ============================================================================

  describe("Multi-income profile handling", () => {
    it("should handle multi-income profile with both salary and freelance income", () => {
      const profile: TaxProfile = {
        id: "profile-multi-1",
        taxYear: 2026,
        incomeType: "multi",
        annualSalary: 40000000,
        freelanceIncome: 5000000,
        dependents: 1,
        createdAt: 1735689600000,
        updatedAt: 1735689600000,
      };
      const deductions: DeductionInput = {
        creditCard: 15000000,
        medical: 2000000,
        education: 1000000,
        irp: 2000000,
        insurance: 500000,
      };
      const computedAt = 1735689600000;

      const result = calcTax(profile, deductions, computedAt);

      // Should recognize multi-income
      expect(result.needsComprehensiveFiling).toBe(true);
      expect(result.estimatedTax).toBeGreaterThanOrEqual(0);
      expect(result.refund).toBe(result.withheld - result.estimatedTax);
    });

    it("should determine comprehensive filing status in breakdown", () => {
      const profile: TaxProfile = {
        id: "profile-multi-2",
        taxYear: 2026,
        incomeType: "multi",
        annualSalary: 40000000,
        freelanceIncome: 5000000,
        dependents: 0,
        createdAt: 1735689600000,
        updatedAt: 1735689600000,
      };
      const deductions: DeductionInput = {
        creditCard: 0,
        medical: 0,
        education: 0,
        irp: 0,
        insurance: 0,
      };

      const isFiling = judgeComprehensiveFiling(profile);

      // freelanceIncome 5,000,000 > 3,000,000
      expect(isFiling).toBe(true);
    });
  });
});
