import styles from "./step-indicator.module.css";

export function StepIndicator({
  steps,
  current,
}: {
  steps: readonly string[];
  current: number;
}) {
  return (
    <div className={styles.row} role="list">
      {steps.map((label, i) => (
        <div key={label} className={styles.step} role="listitem">
          <span
            className={`${styles.circle} ${i === current ? styles.circleActive : ""} ${i < current ? styles.circleDone : ""}`.trim()}
            aria-current={i === current ? "step" : undefined}
          >
            {i < current ? "✓" : i + 1}
          </span>
          <span className={styles.label}>{label}</span>
          {i < steps.length - 1 ? <span className={styles.line} aria-hidden /> : null}
        </div>
      ))}
    </div>
  );
}
