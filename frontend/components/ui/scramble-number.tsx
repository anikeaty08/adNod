"use client";

import { useEffect, useMemo, useState } from "react";

function randomDigitString(length: number) {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
}

export function ScrambleNumber({ value }: { value: string }) {
  const cleaned = useMemo(() => value.replace(/\s+/g, ""), [value]);
  const [display, setDisplay] = useState(cleaned);

  useEffect(() => {
    let tick = 0;
    const id = setInterval(() => {
      tick += 1;
      if (tick > 10) {
        setDisplay(cleaned);
        clearInterval(id);
        return;
      }
      setDisplay(randomDigitString(Math.max(1, cleaned.length)));
    }, 70);

    return () => clearInterval(id);
  }, [cleaned]);

  return <span style={{ fontFamily: "JetBrains Mono, monospace" }}>{display}</span>;
}
