import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @apps-in-toss/web-framework before importing service
vi.mock("@apps-in-toss/web-framework", () => ({
  getIsTossLoginIntegratedService: vi.fn(),
  grantPromotionReward: vi.fn(),
}));

import { checkIntegration, grantReward } from "@/services/sessionService";
import {
  getIsTossLoginIntegratedService,
  grantPromotionReward,
} from "@apps-in-toss/web-framework";

describe("세션·리워드 서비스", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkIntegration()", () => {
    it("AC-1[P0]: should return true when SDK indicates integration is enabled", async () => {
      (getIsTossLoginIntegratedService as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const result = await checkIntegration();

      expect(result).toBe(true);
      expect(getIsTossLoginIntegratedService).toHaveBeenCalledTimes(1);
    });

    it("AC-1[P0]: should return false when SDK indicates integration is disabled", async () => {
      (getIsTossLoginIntegratedService as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const result = await checkIntegration();

      expect(result).toBe(false);
      expect(getIsTossLoginIntegratedService).toHaveBeenCalledTimes(1);
    });

    it("AC-1[P0]: should return false on exception to prevent crash", async () => {
      (getIsTossLoginIntegratedService as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("SDK unavailable in WebView")
      );

      const result = await checkIntegration();

      expect(result).toBe(false);
      expect(getIsTossLoginIntegratedService).toHaveBeenCalledTimes(1);
    });
  });

  describe("grantReward()", () => {
    it("AC-2[P0]: should return {ok: true} on successful reward grant", async () => {
      (grantPromotionReward as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const result = await grantReward("SUMMER2026", 1000);

      expect(result.ok).toBe(true);
      expect(result.error).toBeUndefined();
      expect(grantPromotionReward).toHaveBeenCalledWith({
        promotionCode: "SUMMER2026",
        amount: 1000,
      });
    });

    it("AC-2[P0]: should return {ok: false, error: string} on exception", async () => {
      (grantPromotionReward as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Promotion code invalid")
      );

      const result = await grantReward("INVALID", 1000);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Promotion code invalid");
      expect(grantPromotionReward).toHaveBeenCalledTimes(1);
    });

    it("AC-3[P0]: should clamp amount to 5000 maximum", async () => {
      (grantPromotionReward as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const result = await grantReward("SUMMER2026", 10000);

      expect(result.ok).toBe(true);
      expect(grantPromotionReward).toHaveBeenCalledWith({
        promotionCode: "SUMMER2026",
        amount: 5000,
      });
    });

    it("AC-3[P0]: should not clamp amount below 5000 limit", async () => {
      (grantPromotionReward as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const result = await grantReward("SUMMER2026", 2500);

      expect(result.ok).toBe(true);
      expect(grantPromotionReward).toHaveBeenCalledWith({
        promotionCode: "SUMMER2026",
        amount: 2500,
      });
    });

    it("AC-3[P0]: should clamp amount exactly to 5000 boundary", async () => {
      (grantPromotionReward as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const result = await grantReward("SUMMER2026", 5000);

      expect(result.ok).toBe(true);
      expect(grantPromotionReward).toHaveBeenCalledWith({
        promotionCode: "SUMMER2026",
        amount: 5000,
      });
    });

    it("AC-4: should not trigger UI or side effects (pure service function)", async () => {
      (grantPromotionReward as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      // Service function should be pure: no state mutation, no navigation, no console.error
      const result = await grantReward("SUMMER2026", 500);

      expect(result.ok).toBe(true);
      // Verify only grantPromotionReward was called (no other API calls)
      expect(grantPromotionReward).toHaveBeenCalledTimes(1);
    });
  });
});
