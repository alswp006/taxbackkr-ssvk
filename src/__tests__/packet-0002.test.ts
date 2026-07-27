import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  saveProfile,
  loadProfile,
  saveDeductions,
  loadDeductions,
  saveResult,
  loadResult,
  saveMeta,
  loadMeta,
} from "@/lib/storage";
import type {
  TaxProfile,
  DeductionInput,
  TaxResult,
  AppMeta,
  ChecklistState,
  STORAGE_KEYS,
} from "@/lib/types";

describe("localStorage CRUD helpers (packet 0002)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ============================================================================
  // AC-1: All CRUD functions (save/load) for profile, deductions, result, meta
  // ============================================================================

  describe("AC-1: Profile CRUD", () => {
    it("should save and load profile with all fields", () => {
      const profile: TaxProfile = {
        id: "test-profile-1",
        taxYear: 2025,
        incomeType: "employee",
        annualSalary: 50000000,
        freelanceIncome: 0,
        dependents: 2,
        createdAt: 1000000,
        updatedAt: 1000000,
      };

      const profileSaveResult = saveProfile(profile);
      expect(profileSaveResult).toEqual({ ok: true });

      const loaded = loadProfile("test-profile-1");
      expect(loaded).not.toBeNull();
      expect(loaded!.id).toBe("test-profile-1");
      expect(loaded!.taxYear).toBe(2025);
      expect(loaded!.incomeType).toBe("employee");
      expect(loaded!.annualSalary).toBe(50000000);
      expect(loaded!.freelanceIncome).toBe(0);
      expect(loaded!.dependents).toBe(2);
    });

    it("should return null when profile not found", () => {
      const loaded = loadProfile("nonexistent-id");
      expect(loaded).toBeNull();
    });
  });

  describe("AC-1: Deductions CRUD", () => {
    it("should save and load deductions with all fields", () => {
      const profileId = "test-profile-1";
      const deductions: DeductionInput = {
        creditCard: 3000000,
        medical: 1500000,
        education: 500000,
        irp: 1000000,
        insurance: 800000,
      };

      const saveResult = saveDeductions(profileId, deductions);
      expect(saveResult).toEqual({ ok: true });

      const loaded = loadDeductions(profileId);
      expect(loaded).not.toBeNull();
      expect(loaded!.creditCard).toBe(3000000);
      expect(loaded!.medical).toBe(1500000);
      expect(loaded!.education).toBe(500000);
      expect(loaded!.irp).toBe(1000000);
      expect(loaded!.insurance).toBe(800000);
    });

    it("should return null when deductions not found", () => {
      const loaded = loadDeductions("nonexistent-id");
      expect(loaded).toBeNull();
    });
  });

  describe("AC-1: Result CRUD", () => {
    it("should save and load result with all fields", () => {
      const result: TaxResult = {
        profileId: "test-profile-1",
        taxYear: 2025,
        estimatedTax: 5000000,
        withheld: 4500000,
        refund: 500000,
        effectiveRate: 10.0,
        needsComprehensiveFiling: true,
        deductionBreakdown: [
          {
            key: "creditCard",
            label: "신용카드",
            savedTax: 150000,
          },
        ],
        computedAt: 1000000,
      };

      const resultSaveResult = saveResult("test-profile-1", result);
      expect(resultSaveResult).toEqual({ ok: true });

      const loaded = loadResult("test-profile-1");
      expect(loaded).not.toBeNull();
      expect(loaded!.profileId).toBe("test-profile-1");
      expect(loaded!.estimatedTax).toBe(5000000);
      expect(loaded!.refund).toBe(500000);
      expect(loaded!.effectiveRate).toBe(10.0);
      expect(loaded!.needsComprehensiveFiling).toBe(true);
      expect(loaded!.deductionBreakdown.length).toBe(1);
      expect(loaded!.deductionBreakdown[0].key).toBe("creditCard");
    });

    it("should return null when result not found", () => {
      const loaded = loadResult("nonexistent-id");
      expect(loaded).toBeNull();
    });
  });

  describe("AC-1: Meta CRUD", () => {
    it("should save and load meta with all fields", () => {
      const meta: AppMeta = {
        onboardingSeen: true,
        lastResultByYear: {
          2025: {
            profileId: "test-profile-1",
            taxYear: 2025,
            estimatedTax: 5000000,
            withheld: 4500000,
            refund: 500000,
            effectiveRate: 10.0,
            needsComprehensiveFiling: true,
            deductionBreakdown: [],
            computedAt: 1000000,
          },
        },
      };

      const metaSaveResult = saveMeta(meta);
      expect(metaSaveResult).toEqual({ ok: true });

      const loaded = loadMeta();
      expect(loaded).not.toBeNull();
      expect(loaded!.onboardingSeen).toBe(true);
      expect(loaded!.lastResultByYear[2025]).toBeDefined();
      expect(loaded!.lastResultByYear[2025].refund).toBe(500000);
    });

    it("should return null when meta not found", () => {
      const loaded = loadMeta();
      expect(loaded).toBeNull();
    });
  });

  // ============================================================================
  // AC-2[F1]: updatedAt must be updated on save and roundtrip correctly
  // ============================================================================

  describe("AC-2[F1]: updatedAt field handling", () => {
    it("should update updatedAt to current time on save", () => {
      const profile: TaxProfile = {
        id: "test-profile-2",
        taxYear: 2025,
        incomeType: "freelancer",
        annualSalary: 0,
        freelanceIncome: 30000000,
        dependents: 1,
        createdAt: 1000000,
        updatedAt: 1000000,
      };

      const beforeSave = Date.now();
      saveProfile(profile);
      const afterSave = Date.now();

      const loaded = loadProfile("test-profile-2");
      expect(loaded).not.toBeNull();
      expect(loaded!.updatedAt).toBeGreaterThanOrEqual(beforeSave);
      expect(loaded!.updatedAt).toBeLessThanOrEqual(afterSave);
    });

    it("should preserve all other profile fields during roundtrip except updatedAt", () => {
      const profile: TaxProfile = {
        id: "test-profile-3",
        taxYear: 2025,
        incomeType: "multi",
        annualSalary: 40000000,
        freelanceIncome: 10000000,
        dependents: 3,
        createdAt: 1500000,
        updatedAt: 1500000,
      };

      saveProfile(profile);
      const loaded = loadProfile("test-profile-3");

      expect(loaded).not.toBeNull();
      expect(loaded!.id).toBe(profile.id);
      expect(loaded!.taxYear).toBe(profile.taxYear);
      expect(loaded!.incomeType).toBe(profile.incomeType);
      expect(loaded!.annualSalary).toBe(profile.annualSalary);
      expect(loaded!.freelanceIncome).toBe(profile.freelanceIncome);
      expect(loaded!.dependents).toBe(profile.dependents);
      expect(loaded!.createdAt).toBe(profile.createdAt);
      expect(loaded!.updatedAt).not.toBe(profile.updatedAt);
      expect(loaded!.updatedAt).toBeGreaterThan(profile.updatedAt);
    });
  });

  // ============================================================================
  // AC-3[F1]: Corrupted JSON should return null without throwing or logging error
  // ============================================================================

  describe("AC-3[F1]: Corrupted data handling", () => {
    it("should return null for corrupted profile JSON without throwing", () => {
      localStorage.setItem("taxback:profile:v1::test-profile-4", "not-valid-json{{{");

      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      const loaded = loadProfile("test-profile-4");

      expect(loaded).toBeNull();
      expect(spy).not.toHaveBeenCalled();

      spy.mockRestore();
    });

    it("should return null for corrupted deductions JSON without throwing", () => {
      localStorage.setItem(
        "taxback:deductions:v1::test-profile-5",
        "]{invalid json"
      );

      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      const loaded = loadDeductions("test-profile-5");

      expect(loaded).toBeNull();
      expect(spy).not.toHaveBeenCalled();

      spy.mockRestore();
    });

    it("should return null for corrupted result JSON without throwing", () => {
      localStorage.setItem(
        "taxback:result:v1::test-profile-6",
        "corrupted...data"
      );

      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      const loaded = loadResult("test-profile-6");

      expect(loaded).toBeNull();
      expect(spy).not.toHaveBeenCalled();

      spy.mockRestore();
    });

    it("should return null for corrupted meta JSON without throwing", () => {
      localStorage.setItem("taxback:meta:v1", "[[[broken");

      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      const loaded = loadMeta();

      expect(loaded).toBeNull();
      expect(spy).not.toHaveBeenCalled();

      spy.mockRestore();
    });
  });

  // ============================================================================
  // AC-4[F1]: Write functions should return {ok: true}|{ok: false, reason: 'quota'}
  //           and NOT crash on quota exceeded
  // ============================================================================

  describe("AC-4[F1]: Quota exceeded error handling", () => {
    it("should return {ok: true} on successful save", () => {
      const profile: TaxProfile = {
        id: "test-profile-7",
        taxYear: 2025,
        incomeType: "employee",
        annualSalary: 50000000,
        freelanceIncome: 0,
        dependents: 2,
        createdAt: 1000000,
        updatedAt: 1000000,
      };

      const result = saveProfile(profile);

      expect(result).toEqual({ ok: true });
    });

    it("should return {ok: false, reason: 'quota'} when quota exceeded on profile save", () => {
      const originalSetItem = localStorage.setItem;
      const mockSetItem = vi.fn((key: string, value: string) => {
        if (key.includes("taxback:profile:v1")) {
          const error = new Error("QuotaExceededError");
          error.name = "QuotaExceededError";
          throw error;
        }
        originalSetItem.call(localStorage, key, value);
      });

      const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(mockSetItem);

      const profile: TaxProfile = {
        id: "test-profile-8",
        taxYear: 2025,
        incomeType: "employee",
        annualSalary: 50000000,
        freelanceIncome: 0,
        dependents: 2,
        createdAt: 1000000,
        updatedAt: 1000000,
      };

      const result = saveProfile(profile);

      expect(result).toEqual({ ok: false, reason: "quota" });

      spy.mockRestore();
    });

    it("should return {ok: false, reason: 'quota'} when quota exceeded on deductions save", () => {
      const originalSetItem = localStorage.setItem;
      const mockSetItem = vi.fn((key: string, value: string) => {
        if (key.includes("taxback:deductions:v1")) {
          const error = new Error("QuotaExceededError");
          error.name = "QuotaExceededError";
          throw error;
        }
        originalSetItem.call(localStorage, key, value);
      });

      const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(mockSetItem);

      const deductions: DeductionInput = {
        creditCard: 3000000,
        medical: 1500000,
        education: 500000,
        irp: 1000000,
        insurance: 800000,
      };

      const result = saveDeductions("test-profile-9", deductions);

      expect(result).toEqual({ ok: false, reason: "quota" });

      spy.mockRestore();
    });

    it("should return {ok: false, reason: 'quota'} when quota exceeded on result save", () => {
      const originalSetItem = localStorage.setItem;
      const mockSetItem = vi.fn((key: string, value: string) => {
        if (key.includes("taxback:result:v1")) {
          const error = new Error("QuotaExceededError");
          error.name = "QuotaExceededError";
          throw error;
        }
        originalSetItem.call(localStorage, key, value);
      });

      const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(mockSetItem);

      const result: TaxResult = {
        profileId: "test-profile-10",
        taxYear: 2025,
        estimatedTax: 5000000,
        withheld: 4500000,
        refund: 500000,
        effectiveRate: 10.0,
        needsComprehensiveFiling: true,
        deductionBreakdown: [],
        computedAt: 1000000,
      };

      const resultWriteResult = saveResult("test-profile-10", result);

      expect(resultWriteResult).toEqual({ ok: false, reason: "quota" });

      spy.mockRestore();
    });

    it("should return {ok: false, reason: 'quota'} when quota exceeded on meta save", () => {
      const originalSetItem = localStorage.setItem;
      const mockSetItem = vi.fn((key: string, value: string) => {
        if (key.includes("taxback:meta:v1")) {
          const error = new Error("QuotaExceededError");
          error.name = "QuotaExceededError";
          throw error;
        }
        originalSetItem.call(localStorage, key, value);
      });

      const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(mockSetItem);

      const meta: AppMeta = {
        onboardingSeen: true,
        lastResultByYear: {},
      };

      const metaWriteResult = saveMeta(meta);

      expect(metaWriteResult).toEqual({ ok: false, reason: "quota" });

      spy.mockRestore();
    });

    it("should not crash when quota exceeded, other operations continue", () => {
      const originalSetItem = localStorage.setItem;
      let callCount = 0;
      const mockSetItem = vi.fn((key: string, value: string) => {
        callCount++;
        if (callCount === 1 && key.includes("taxback:profile:v1")) {
          const error = new Error("QuotaExceededError");
          error.name = "QuotaExceededError";
          throw error;
        }
        originalSetItem.call(localStorage, key, value);
      });

      const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(mockSetItem);

      const profile: TaxProfile = {
        id: "test-profile-11",
        taxYear: 2025,
        incomeType: "employee",
        annualSalary: 50000000,
        freelanceIncome: 0,
        dependents: 2,
        createdAt: 1000000,
        updatedAt: 1000000,
      };

      const result1 = saveProfile(profile);
      expect(result1).toEqual({ ok: false, reason: "quota" });

      const deductions: DeductionInput = {
        creditCard: 3000000,
        medical: 1500000,
        education: 500000,
        irp: 1000000,
        insurance: 800000,
      };

      const result2 = saveDeductions("test-profile-11", deductions);
      expect(result2).toEqual({ ok: true });

      spy.mockRestore();
    });
  });
});
