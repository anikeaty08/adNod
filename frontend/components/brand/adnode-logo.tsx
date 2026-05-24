import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { showWordmark?: boolean };

/** Compact AdNode mark: signal node + confidential “shield” arc */
export function AdNodeLogo({ showWordmark = true, className, ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 140 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={!showWordmark}
      {...rest}
    >
      <defs>
        <linearGradient id="adnode-mark" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--accent-2, #67e8f9)" />
          <stop offset="1" stopColor="var(--accent, #a78bfa)" />
        </linearGradient>
      </defs>
      <path
        d="M16 4L26 10v12L16 28 6 22V10L16 4z"
        stroke="url(#adnode-mark)"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="color-mix(in srgb, var(--accent) 18%, transparent)"
      />
      <circle cx="16" cy="16" r="3.5" fill="var(--accent-2, #67e8f9)" />
      {showWordmark ? (
        <text
          x="38"
          y="21"
          fill="currentColor"
          style={{ fontFamily: "var(--font-display, Space Grotesk, system-ui)", fontSize: "15px", fontWeight: 600 }}
        >
          AdNode
        </text>
      ) : null}
    </svg>
  );
}
