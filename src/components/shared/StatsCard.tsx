import { motion } from "framer-motion";

export function StatsCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <motion.div whileHover={{ y: -6 }} className="glass-panel rounded-[24px] p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 font-display text-2xl font-semibold">{value}</p>
      <p className="mt-2 text-sm text-sky-700 dark:text-sky-200">{hint}</p>
    </motion.div>
  );
}
