"use client";

export function HoverFlipText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  // Use pseudo-elements for the two layers so we don't duplicate visible text in copy/paste.
  return <span className={`nav-flip ${className ?? ""}`.trim()} data-text={text} aria-label={text} />;
}
