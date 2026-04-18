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
    const [fees, block] = await Promise.all([publicClient.estimateFeesPerGas(), publicClient.getBlock({ blockTag: "latest" })]);

    const baseFeePerGas =
      "baseFeePerGas" in (block as unknown as Record<string, unknown>) && typeof (block as unknown as { baseFeePerGas?: unknown }).baseFeePerGas === "bigint"
        ? (block as unknown as { baseFeePerGas: bigint }).baseFeePerGas
        : undefined;

    const rawPriority = typeof fees.maxPriorityFeePerGas === "bigint" ? fees.maxPriorityFeePerGas : 0n;
    let rawMaxFee =
      typeof fees.maxFeePerGas === "bigint"
        ? fees.maxFeePerGas
        : typeof fees.gasPrice === "bigint"
          ? fees.gasPrice
          : baseFeePerGas != null
            ? baseFeePerGas + rawPriority
            : undefined;

    if (rawMaxFee != null && baseFeePerGas != null) {
      const floor = baseFeePerGas + rawPriority;
      if (rawMaxFee < floor) rawMaxFee = floor;
    }

    const maxPriorityFeePerGas = rawPriority > 0n ? bump(rawPriority) : undefined;
    let maxFeePerGas = rawMaxFee != null ? bump(rawMaxFee) : undefined;

    if (maxFeePerGas != null && baseFeePerGas != null) {
      const floor = baseFeePerGas + (maxPriorityFeePerGas ?? 0n);
      if (maxFeePerGas < floor) maxFeePerGas = bump(floor);
    }

    return { maxFeePerGas, maxPriorityFeePerGas };
  } catch {
    try {
      const block = await publicClient.getBlock({ blockTag: "latest" });
      const baseFeePerGas =
        "baseFeePerGas" in (block as unknown as Record<string, unknown>) && typeof (block as unknown as { baseFeePerGas?: unknown }).baseFeePerGas === "bigint"
          ? (block as unknown as { baseFeePerGas: bigint }).baseFeePerGas
          : undefined;
      if (baseFeePerGas != null) return { maxFeePerGas: bump(baseFeePerGas * 2n) };
    } catch {
      // ignore
    }
    return {};
  }
}
