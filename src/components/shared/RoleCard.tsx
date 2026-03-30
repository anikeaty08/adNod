import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/shared/Button";

export function RoleCard({
  title,
  description,
  points,
  onSelect,
}: {
  title: string;
  description: string;
  points: string[];
  onSelect: () => void;
}) {
  return (
    <motion.div whileHover={{ y: -8 }} className="glass-panel h-full rounded-[28px] p-7">
      <h3 className="font-display text-2xl font-semibold">{title}</h3>
      <p className="mt-3 text-sm text-muted-foreground">{description}</p>
      <div className="mt-6 space-y-3">
        {points.map((point) => (
          <div key={point} className="flex items-start gap-3 text-sm">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-sky-500" />
            <span>{point}</span>
          </div>
        ))}
      </div>
      <Button className="mt-8 w-full" onClick={onSelect}>
        Continue as {title}
      </Button>
    </motion.div>
  );
}
