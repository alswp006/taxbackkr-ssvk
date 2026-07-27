import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type {
  TaxProfile,
  DeductionInput,
  TaxResult,
  AppMeta,
} from "@/lib/types";
import { STORAGE_KEYS } from "@/lib/types";

/**
 * Packet 0005: 세금 계산 서비스 파사드 (taxService)
 *
 * Tests for orchestration layer that combines:
 * - loadProfile() → getTaxResult()
 * - calcTax() + calcDeductionBreakdown() → simulate()
 * - saveResult() + loadMeta() → computeAndPersistResult()
 * - loadDeductions() + default init → loadOrInitDeductions()
 *
 * File under test: src/services/taxService.ts (not yet implemented)
 */

describe("세금 계산 서비스 파사드 (packet 0005)", () => {
  // ============================================================================
  // Test Setup & Cleanup
  // ============================================================================

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ============================================================================
  // F3-AC-1 [P0]: computeAndPersistResult(profileId, computedAt)
  // - Profile load fail → null
  // - Profile load success → TaxResult + saveResult() + meta.lastResultByYear[taxYear]
  // ============================================================================

  describe("F3-AC-1: computeAndPersistResult — profile load + calculate + save meta", () => {
    it("should return null when profile does not exist", async () => {
      // Simulating: profileId "nonexistent" has no stored profile
      const result = await computeAndPersistResult("nonexistent", 1735689600000);

      expect(result).toBeNull();
    });

    it("should load profile, calculate tax, and persist result + meta for success case", async () => {
      // Setup: Store a profile
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
      localStorage.setItem(
        `${STORAGE_KEYS.profile}::profile-1`,
        JSON.stringify(profile)
      );

      // Setup: Store deductions (or none)
      const deductions: DeductionInput = {
        creditCard: 10000000,
        medical: 0,
        education: 0,
        irp: 0,
        insurance: 0,
      };
      localStorage.setItem(
        `${STORAGE_KEYS.deductions}::profile-1`,
        JSON.stringify(deductions)
      );

      const computedAt = 1735689600000;

      // Act
      const result = await computeAndPersistResult("profile-1", computedAt);

      // Assert: Returns TaxResult
      expect(result).not.toBeNull();
      expect(result!.profileId).toBe("profile-1");
      expect(result!.taxYear).toBe(2026);
      expect(result!.estimatedTax).toBeGreaterThanOrEqual(0);
      expect(result!.computedAt).toBe(computedAt);

      // Assert: Result was saved to storage
      const saved = localStorage.getItem(`${STORAGE_KEYS.result}::profile-1`);
      expect(saved).not.toBeNull();
      const parsedSaved = JSON.parse(saved!) as TaxResult;
      expect(parsedSaved.profileId).toBe("profile-1");

      // Assert: meta.lastResultByYear[2026] was updated
      const metaRaw = localStorage.getItem(STORAGE_KEYS.meta);
      expect(metaRaw).not.toBeNull();
      const meta = JSON.parse(metaRaw!) as AppMeta;
      expect(meta.lastResultByYear).toBeDefined();
      expect(meta.lastResultByYear[2026]).toBeDefined();
      expect(meta.lastResultByYear[2026].profileId).toBe("profile-1");
    });

    it("should calculate with default deductions (0) if not stored", async () => {
      // Setup: Store profile only, NO deductions
      const profile: TaxProfile = {
        id: "profile-2",
        taxYear: 2025,
        incomeType: "freelancer",
        annualSalary: 0,
        freelanceIncome: 5000000,
        dependents: 0,
        createdAt: 1735689600000,
        updatedAt: 1735689600000,
      };
      localStorage.setItem(
        `${STORAGE_KEYS.profile}::profile-2`,
        JSON.stringify(profile)
      );

      const computedAt = 1735689600000;

      // Act
      const result = await computeAndPersistResult("profile-2", computedAt);

      // Assert: Should calculate with zero deductions
      expect(result).not.toBeNull();
      expect(result!.profileId).toBe("profile-2");
      expect(result!.estimatedTax).toBeGreaterThanOrEqual(0);

      // Assert: deductionBreakdown should be present even with 0 deductions
      expect(Array.isArray(result!.deductionBreakdown)).toBe(true);
      expect(result!.deductionBreakdown.length).toBeGreaterThan(0);
      result!.deductionBreakdown.forEach((item) => {
        expect(item.savedTax).toBe(0);
      });
    });

    it("should update meta.lastResultByYear correctly for multiple years", async () => {
      // Setup: Two profiles with different tax years
      const profile2025: TaxProfile = {
        id: "profile-2025",
        taxYear: 2025,
        incomeType: "employee",
        annualSalary: 40000000,
        freelanceIncome: 0,
        dependents: 0,
        createdAt: 1735689600000,
        updatedAt: 1735689600000,
      };
      const profile2026: TaxProfile = {
        id: "profile-2026",
        taxYear: 2026,
        incomeType: "employee",
        annualSalary: 50000000,
        freelanceIncome: 0,
        dependents: 1,
        createdAt: 1735689600000,
        updatedAt: 1735689600000,
      };

      localStorage.setItem(
        `${STORAGE_KEYS.profile}::profile-2025`,
        JSON.stringify(profile2025)
      );
      localStorage.setItem(
        `${STORAGE_KEYS.profile}::profile-2026`,
        JSON.stringify(profile2026)
      );

      // Act: Compute both
      const result2025 = await computeAndPersistResult(
        "profile-2025",
        1735689600000
      );
      const result2026 = await computeAndPersistResult(
        "profile-2026",
        1735689600000
      );

      // Assert: Both stored in meta
      const metaRaw = localStorage.getItem(STORAGE_KEYS.meta);
      const meta = JSON.parse(metaRaw!) as AppMeta;
      expect(meta.lastResultByYear[2025]).toBeDefined();
      expect(meta.lastResultByYear[2026]).toBeDefined();
      expect(meta.lastResultByYear[2025].profileId).toBe("profile-2025");
      expect(meta.lastResultByYear[2026].profileId).toBe("profile-2026");
    });
  });

  // ============================================================================
  // F3-AC-2 [P1]: loadOrInitDeductions(profileId)
  // - No stored deductions → return all-zero defaults
  // - Stored deductions → return parsed value
  // ============================================================================

  describe("F3-AC-2: loadOrInitDeductions — load or return zero defaults", () => {
    it("should return zero-initialized deductions when not stored", async () => {
      const result = await loadOrInitDeductions("profile-nodata");

      expect(result).toEqual({
        creditCard: 0,
        medical: 0,
        education: 0,
        irp: 0,
        insurance: 0,
      });
    });

    it("should return stored deductions when they exist", async () => {
      const stored: DeductionInput = {
        creditCard: 15000000,
        medical: 3000000,
        education: 1500000,
        irp: 4500000,
        insurance: 1000000,
      };
      localStorage.setItem(
        `${STORAGE_KEYS.deductions}::profile-x`,
        JSON.stringify(stored)
      );

      const result = await loadOrInitDeductions("profile-x");

      expect(result).toEqual(stored);
      expect(result.creditCard).toBe(15000000);
      expect(result.medical).toBe(3000000);
      expect(result.education).toBe(1500000);
      expect(result.irp).toBe(4500000);
      expect(result.insurance).toBe(1000000);
    });

    it("should handle corrupted storage gracefully and return defaults", async () => {
      // Simulate corrupted JSON
      localStorage.setItem(
        `${STORAGE_KEYS.deductions}::profile-bad`,
        "{ broken json }"
      );

      const result = await loadOrInitDeductions("profile-bad");

      // Should fallback to defaults, not throw
      expect(result).toEqual({
        creditCard: 0,
        medical: 0,
        education: 0,
        irp: 0,
        insurance: 0,
      });
    });
  });

  // ============================================================================
  // F3-AC-3 [P0]: simulate(profile, deductions, computedAt)
  // Returns combination of calcTax + calcDeductionBreakdown
  // ============================================================================

  describe("F3-AC-3: simulate — orchestrate calcTax + calcDeductionBreakdown", () => {
    it("should return TaxResult with deductionBreakdown from combined calculation", async () => {
      const profile: TaxProfile = {
        id: "sim-1",
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
        medical: 2000000,
        education: 1000000,
        irp: 3000000,
        insurance: 500000,
      };
      const computedAt = 1735689600000;

      // Act
      const result = await simulate(profile, deductions, computedAt);

      // Assert: Returns TaxResult
      expect(result).not.toBeNull();
      expect(result!.profileId).toBe("sim-1");
      expect(result!.taxYear).toBe(2026);
      expect(result!.computedAt).toBe(computedAt);

      // Assert: Contains deductionBreakdown with correct keys
      expect(Array.isArray(result!.deductionBreakdown)).toBe(true);
      expect(result!.deductionBreakdown.length).toBeGreaterThan(0);

      const breakdown = result!.deductionBreakdown;
      const keys = breakdown.map((item) => item.key);
      expect(keys).toContain("creditCard");
      expect(keys).toContain("medical");
      expect(keys).toContain("education");
      expect(keys).toContain("irp");
      expect(keys).toContain("insurance");

      // Assert: Each item has label and savedTax
      breakdown.forEach((item) => {
        expect(item.label).toBeTruthy();
        expect(typeof item.savedTax).toBe("number");
        expect(item.savedTax).toBeGreaterThanOrEqual(0);
      });

      // Assert: Tax results are valid
      expect(result!.estimatedTax).toBeGreaterThanOrEqual(0);
      expect(result!.refund).toBe(result!.withheld - result!.estimatedTax);
      expect(result!.effectiveRate).toBeGreaterThanOrEqual(0);
      expect(result!.effectiveRate).toBeLessThanOrEqual(1);
    });

    it("should handle zero deductions in simulation", async () => {
      const profile: TaxProfile = {
        id: "sim-zero",
        taxYear: 2026,
        incomeType: "employee",
        annualSalary: 40000000,
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

      const result = await simulate(profile, deductions, 1735689600000);

      // Should still return valid breakdown even with zero deductions
      expect(result).not.toBeNull();
      expect(result!.deductionBreakdown.length).toBeGreaterThan(0);
      result!.deductionBreakdown.forEach((item) => {
        expect(item.savedTax).toBe(0);
      });
    });

    it("should calculate needsComprehensiveFiling based on freelanceIncome", async () => {
      const profileSmall: TaxProfile = {
        id: "sim-small",
        taxYear: 2026,
        incomeType: "multi",
        annualSalary: 30000000,
        freelanceIncome: 2000000, // Below 3M threshold
        dependents: 0,
        createdAt: 1735689600000,
        updatedAt: 1735689600000,
      };
      const profileLarge: TaxProfile = {
        id: "sim-large",
        taxYear: 2026,
        incomeType: "multi",
        annualSalary: 30000000,
        freelanceIncome: 4000000, // Above 3M threshold
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

      const resultSmall = await simulate(profileSmall, deductions, 1735689600000);
      const resultLarge = await simulate(profileLarge, deductions, 1735689600000);

      // Small freelance income → false
      expect(resultSmall!.needsComprehensiveFiling).toBe(false);

      // Large freelance income → true
      expect(resultLarge!.needsComprehensiveFiling).toBe(true);
    });
  });

  // ============================================================================
  // F3-AC-4 [P1]: All functions are pure compositions with safe defaults
  // No exceptions thrown; always return safe values or null
  // ============================================================================

  describe("F3-AC-4: Safety & pure composition — no exceptions, safe defaults", () => {
    it("should not throw when computeAndPersistResult is called with invalid profileId", async () => {
      // Act & Assert: Should not throw
      expect(async () => {
        await computeAndPersistResult("", 1735689600000);
      }).not.toThrow();

      expect(async () => {
        await computeAndPersistResult("nonexistent", 1735689600000);
      }).not.toThrow();
    });

    it("should not throw when simulate receives edge-case deductions", async () => {
      const profile: TaxProfile = {
        id: "safe-1",
        taxYear: 2026,
        incomeType: "employee",
        annualSalary: 50000000,
        freelanceIncome: 0,
        dependents: 1,
        createdAt: 1735689600000,
        updatedAt: 1735689600000,
      };

      // Negative deductions (should be clamped by calcTax)
      const badDeductions: DeductionInput = {
        creditCard: -5000000,
        medical: -1000000,
        education: 0,
        irp: 0,
        insurance: 0,
      };

      expect(async () => {
        await simulate(profile, badDeductions, 1735689600000);
      }).not.toThrow();

      const result = await simulate(profile, badDeductions, 1735689600000);
      expect(result).not.toBeNull();
      expect(result!.estimatedTax).toBeGreaterThanOrEqual(0);
    });

    it("should return safe defaults for loadOrInitDeductions with any profileId", async () => {
      const nullId = await loadOrInitDeductions("");
      const undefinedId = await loadOrInitDeductions("undefined");
      const longId = await loadOrInitDeductions(
        "a".repeat(1000)
      );

      expect(nullId).toEqual({
        creditCard: 0,
        medical: 0,
        education: 0,
        irp: 0,
        insurance: 0,
      });
      expect(undefinedId).toEqual(nullId);
      expect(longId).toEqual(nullId);
    });

    it("should preserve refund identity: refund = withheld - estimatedTax in simulate", async () => {
      const profile: TaxProfile = {
        id: "safe-refund",
        taxYear: 2026,
        incomeType: "employee",
        annualSalary: 50000000,
        freelanceIncome: 0,
        dependents: 1,
        createdAt: 1735689600000,
        updatedAt: 1735689600000,
      };
      const deductions: DeductionInput = {
        creditCard: 15000000,
        medical: 1000000,
        education: 500000,
        irp: 2000000,
        insurance: 300000,
      };

      const result = await simulate(profile, deductions, 1735689600000);

      // Refund identity must hold
      expect(result!.refund).toBe(result!.withheld - result!.estimatedTax);
      expect(result!.refund).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // Integration: Full flow — computeAndPersistResult + loadOrInitDeductions
  // ============================================================================

  describe("Integration: Full flow — profile load → simulate → persist → reload meta", () => {
    it("should complete full flow: store profile → compute → verify meta → reload", async () => {
      // Setup: Store initial profile
      const profile: TaxProfile = {
        id: "integration-1",
        taxYear: 2026,
        incomeType: "employee",
        annualSalary: 55000000,
        freelanceIncome: 0,
        dependents: 2,
        createdAt: 1735689600000,
        updatedAt: 1735689600000,
      };
      const deductions: DeductionInput = {
        creditCard: 18000000,
        medical: 2500000,
        education: 800000,
        irp: 5000000,
        insurance: 1200000,
      };

      localStorage.setItem(
        `${STORAGE_KEYS.profile}::integration-1`,
        JSON.stringify(profile)
      );
      localStorage.setItem(
        `${STORAGE_KEYS.deductions}::integration-1`,
        JSON.stringify(deductions)
      );

      // Act 1: Compute and persist
      const result = await computeAndPersistResult("integration-1", 1735689600000);

      expect(result).not.toBeNull();
      expect(result!.profileId).toBe("integration-1");

      // Act 2: Load deductions
      const loaded = await loadOrInitDeductions("integration-1");

      expect(loaded).toEqual(deductions);

      // Act 3: Simulate with loaded deductions
      const simulated = await simulate(profile, loaded, 1735689600000);

      expect(simulated).not.toBeNull();
      expect(simulated!.profileId).toBe("integration-1");

      // Assert: Persisted result matches simulation
      const metaRaw = localStorage.getItem(STORAGE_KEYS.meta);
      const meta = JSON.parse(metaRaw!) as AppMeta;
      const persistedResult = meta.lastResultByYear[2026];

      expect(persistedResult.estimatedTax).toBe(result!.estimatedTax);
      expect(persistedResult.refund).toBe(result!.refund);
      expect(persistedResult.deductionBreakdown.length).toBe(
        result!.deductionBreakdown.length
      );
    });

    it("should handle sequential year calculations correctly", async () => {
      const computedAt = 1735689600000;

      // Setup: Two profiles for different years
      for (let year = 2025; year <= 2026; year++) {
        const profile: TaxProfile = {
          id: `year-${year}`,
          taxYear: year,
          incomeType: "employee",
          annualSalary: 50000000 + year * 1000000,
          freelanceIncome: 0,
          dependents: 1,
          createdAt: computedAt,
          updatedAt: computedAt,
        };
        localStorage.setItem(
          `${STORAGE_KEYS.profile}::year-${year}`,
          JSON.stringify(profile)
        );
      }

      // Act: Compute for both years
      for (let year = 2025; year <= 2026; year++) {
        await computeAndPersistResult(`year-${year}`, computedAt);
      }

      // Assert: Both results in meta
      const metaRaw = localStorage.getItem(STORAGE_KEYS.meta);
      const meta = JSON.parse(metaRaw!) as AppMeta;

      expect(meta.lastResultByYear[2025]).toBeDefined();
      expect(meta.lastResultByYear[2026]).toBeDefined();
      expect(meta.lastResultByYear[2025].taxYear).toBe(2025);
      expect(meta.lastResultByYear[2026].taxYear).toBe(2026);

      // Verify that different years have different tax calculations
      const tax2025 = meta.lastResultByYear[2025].estimatedTax;
      const tax2026 = meta.lastResultByYear[2026].estimatedTax;
      expect(tax2025).not.toBe(tax2026);
    });
  });
});

// ============================================================================
// Mock Function Stubs (will be implemented in taxService.ts)
// These are placeholder declarations for type checking during TDD red phase
// ============================================================================

/**
 * Load profile by ID and calculate tax, then persist result + meta.lastResultByYear
 * Returns null if profile not found, otherwise returns TaxResult
 *
 * Implementation will:
 * 1. loadProfile(profileId) → TaxProfile | null
 * 2. If null, return null
 * 3. loadOrInitDeductions(profileId) → DeductionInput
 * 4. calcTax(profile, deductions, computedAt) → TaxResult
 * 5. saveResult(profileId, result)
 * 6. loadMeta() → AppMeta | null
 * 7. Update meta.lastResultByYear[taxYear] = result
 * 8. saveMeta(meta)
 * 9. Return result
 */
async function computeAndPersistResult(
  profileId: string,
  computedAt: number
): Promise<TaxResult | null> {
  // TDD red phase — this will fail until src/services/taxService.ts is implemented
  throw new Error("computeAndPersistResult not yet implemented");
}

/**
 * Load deductions from storage, or return zero-initialized defaults
 *
 * Implementation will:
 * 1. loadDeductions(profileId) → DeductionInput | null
 * 2. If null, return { creditCard: 0, medical: 0, education: 0, irp: 0, insurance: 0 }
 * 3. Otherwise return loaded value
 */
async function loadOrInitDeductions(
  profileId: string
): Promise<DeductionInput> {
  // TDD red phase — this will fail until src/services/taxService.ts is implemented
  throw new Error("loadOrInitDeductions not yet implemented");
}

/**
 * Simulate tax calculation with given profile and deductions
 * Combines calcTax() + calcDeductionBreakdown()
 *
 * Implementation will:
 * 1. calcTax(profile, deductions, computedAt) → TaxResult (with deductionBreakdown filled in by calcTax)
 * 2. Return result (calcTax already includes deductionBreakdown)
 * Note: calcTax already calls calcDeductionBreakdown internally, so this is mostly a pass-through
 */
async function simulate(
  profile: TaxProfile,
  deductions: DeductionInput,
  computedAt: number
): Promise<TaxResult | null> {
  // TDD red phase — this will fail until src/services/taxService.ts is implemented
  throw new Error("simulate not yet implemented");
}
