import type { ReactNode, CSSProperties } from "react";
import styles from "./glass-panel.module.css";

export function GlassPanel({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`${styles.panel} ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}
