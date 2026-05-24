"use client";

import { useState } from "react";

export function EncryptedValue({ value }: { value: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <span className="badge">Encrypted</span>
      <span style={{ fontFamily: "JetBrains Mono, monospace" }}>{open ? value : "••••••"}</span>
      <button onClick={() => setOpen((v) => !v)} style={{ background: "transparent", color: "var(--muted)", border: "none", cursor: "pointer" }}>
        {open ? "Hide" : "Show"}
      </button>
    </div>
  );
}
