import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./primary-button.module.css";

type Variant = "primary" | "secondary" | "ghost";

type Base = {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  href?: string;
};

export function PrimaryButton({
  children,
  variant = "primary",
  className = "",
  href,
  ...props
}: Base & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className">) {
  const v = variant === "primary" ? "" : variant === "secondary" ? styles.secondary : styles.ghost;
  const cls = `${styles.btn} ${v} ${className}`.trim();
  if (href) {
    return (
      <Link href={href} className={cls} style={{ textDecoration: "none", display: "inline-flex" }}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} {...props}>
      {children}
    </button>
  );
}
