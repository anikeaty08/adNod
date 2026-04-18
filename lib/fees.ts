import type { PublicClient } from "viem";

type FeeOverrides = {
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
};

function bump(v: bigint): bigint {
  // Add a small buffer so we never fall below baseFee between estimate and submit.
  return (v * 12n) / 10n + 1n;
}

export async function estimateFeeOverrides(publicClient: PublicClient): Promise<FeeOverrides> {
  try {
    const fees = await publicClient.estimateFeesPerGas();
    const maxFeePerGas = fees.maxFeePerGas ?? fees.gasPrice;
    const maxPriorityFeePerGas = fees.maxPriorityFeePerGas;
    return {
      maxFeePerGas: maxFeePerGas ? bump(maxFeePerGas) : undefined,
      maxPriorityFeePerGas: maxPriorityFeePerGas ? bump(maxPriorityFeePerGas) : undefined,
    };
  } catch {
    return {};
  }
}

