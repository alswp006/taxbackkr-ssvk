import {
  getIsTossLoginIntegratedService,
  grantPromotionReward,
} from "@apps-in-toss/web-framework";

const MAX_REWARD_AMOUNT = 5000;

// Installed SDK's .d.ts expects { params: { promotionCode, amount } }, but the
// contracted call shape here is flat — cast at the boundary rather than fight the type.
type FlatGrantPromotionReward = (params: {
  promotionCode: string;
  amount: number;
}) => Promise<unknown>;

export async function checkIntegration(): Promise<boolean> {
  try {
    return (await getIsTossLoginIntegratedService()) === true;
  } catch {
    return false;
  }
}

export async function grantReward(
  promotionCode: string,
  amount: number
): Promise<{ ok: boolean; error?: string }> {
  const clampedAmount = Math.min(amount, MAX_REWARD_AMOUNT);

  try {
    await (grantPromotionReward as unknown as FlatGrantPromotionReward)({
      promotionCode,
      amount: clampedAmount,
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
