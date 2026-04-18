"use client";

import { cn } from "@/lib/cn";

export function HoverFlipText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <span className={cn("nav-flip", className)}>
      <span className="sr-only">{text}</span>
      <span className="nav-flip-inner" aria-hidden="true">
        <span className="nav-flip-layer nav-flip-front">{text}</span>
        <span className="nav-flip-layer nav-flip-back">{text}</span>
      </span>
    </span>
  );
}

