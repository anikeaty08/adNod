"use client";

import { useCallback, useState } from "react";
import { useAccount, usePublicClient, useSignMessage, useWalletClient } from "wagmi";
import { waitForTransactionReceipt } from "viem/actions";
import type { Abi } from "viem";
import { ShieldCheck } from "lucide-react";
import { signedPostJson } from "@/lib/adnode-api";
import { CONTRACTS, adRegistryAbi } from "@/lib/contracts";
import { estimateFeeOverrides } from "@/lib/fees";
import { GlassPanel } from "@/components/ui/glass-panel";
import { PrimaryButton } from "@/components/ui/primary-button";

const registryAbi = adRegistryAbi as Abi;

type AccessRow = {
  campaignId: string;
  slotId: string;
  campaignTitle: string;
  slotName: string;
  developer: string;
  status: string;
};

export default function AdminPage() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { signMessageAsync } = useSignMessage();
  const [rows, setRows] = useState<AccessRow[]>([]);
  const [busy, setBusy] = useState("");

  const loadRows = useCallback(async () => {
    if (!address) throw new Error("Connect admin wallet.");
    setBusy("");
    const result = await signedPostJson<{ rows: AccessRow[] }>(
      "/api/admin/access-requests",
      "admin:access:list",
      {},
      signMessageAsync,
      address,
    );
    setRows(result.rows ?? []);
  }, [address, signMessageAsync]);

  async function writeAccess(row: AccessRow, action: "approveAccess" | "denyAccess" | "revokeAccess") {
    if (!publicClient || !walletClient) return;
    setBusy("");
    try {
      const args =
        action === "revokeAccess"
          ? [BigInt(row.campaignId), BigInt(row.slotId), true]
          : [BigInt(row.campaignId), BigInt(row.slotId)];
      const hash = await walletClient.writeContract({
        address: CONTRACTS.registry,
        abi: registryAbi,
        functionName: action,
        args,
        ...(await estimateFeeOverrides(publicClient)),
      });
      await waitForTransactionReceipt(publicClient, { hash });
      await loadRows();
    } catch (error) {
      setBusy(error instanceof Error ? error.message : "Admin transaction failed.");
    }
  }

  return (
    <div className="container space-y-5 pt-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[var(--text)]">
            <ShieldCheck size={20} />
            <h1 className="font-display text-2xl font-bold">Admin approvals</h1>
          </div>
          <p className="mt-1 text-sm text-muted">Review publisher access requests for campaign-slot pairs.</p>
        </div>
        <PrimaryButton onClick={() => void loadRows().catch((e) => setBusy(e instanceof Error ? e.message : "Load failed"))}>
          Refresh
        </PrimaryButton>
      </header>

      <GlassPanel className="p-4">
        {busy ? <p className="mb-3 text-sm text-muted">{busy}</p> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">Campaign</th>
                <th className="px-3 py-2">Slot</th>
                <th className="px-3 py-2">Developer</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.campaignId}:${row.slotId}`} className="border-t border-border">
                  <td className="px-3 py-3">
                    <span className="font-medium text-[var(--text)]">{row.campaignTitle}</span>
                    <span className="ml-2 font-mono text-xs text-muted">#{row.campaignId}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-[var(--text)]">{row.slotName}</span>
                    <span className="ml-2 font-mono text-xs text-muted">#{row.slotId}</span>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-muted">{row.developer}</td>
                  <td className="px-3 py-3 text-muted">{row.status}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <PrimaryButton variant="secondary" onClick={() => void writeAccess(row, "approveAccess")}>
                        Approve
                      </PrimaryButton>
                      <PrimaryButton variant="ghost" onClick={() => void writeAccess(row, "denyAccess")}>
                        Deny
                      </PrimaryButton>
                      <PrimaryButton variant="ghost" onClick={() => void writeAccess(row, "revokeAccess")}>
                        Revoke
                      </PrimaryButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length ? <p className="py-8 text-center text-sm text-muted">No requested, approved, denied, or revoked pairs found.</p> : null}
      </GlassPanel>
    </div>
  );
}
