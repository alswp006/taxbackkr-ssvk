import {
  getIsTossLoginIntegratedService,
  grantPromotionReward,
} from "@apps-in-toss/web-framework";

export async function checkIntegration(): Promise<boolean> {
  throw new Error("Not yet implemented");
}

export async function grantReward(
  promotionCode: string,
  amount: number
): Promise<{ ok: boolean; error?: string }> {
  throw new Error("Not yet implemented");
}
