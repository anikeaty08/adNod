export type TxLogEntry = {
  id: string;
  kind: "claim" | "create_campaign" | "fund" | "assign" | "other";
  hash: `0x${string}`;
  at: number;
  label?: string;
  /** Approximate ETH withdrawn (from UI at click time) for charts. */
  amountEth?: string;
};

const KEY = "adnode_tx_log_v1";
const MAX = 40;

export function readTxLog(): TxLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TxLogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendTxLog(entry: Omit<TxLogEntry, "id" | "at"> & { id?: string; at?: number }) {
  if (typeof window === "undefined") return;
  const prev = readTxLog();
  const row: TxLogEntry = {
    id: entry.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: entry.kind,
    hash: entry.hash,
    at: entry.at ?? Date.now(),
    label: entry.label,
    amountEth: entry.amountEth,
  };
  const next = [row, ...prev.filter((e) => e.hash !== row.hash)].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(next));
}
