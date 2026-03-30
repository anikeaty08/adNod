import { motion } from "framer-motion";
import { useEffect } from "react";

export function IntroVideo({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timeout = window.setTimeout(onComplete, 20_000);
    return () => window.clearTimeout(timeout);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 1.1, ease: "easeInOut" }}
      className="fixed inset-0 z-50 overflow-hidden bg-black"
    >
      <video className="h-full w-full object-cover" src="/adnode-intro.mp4" autoPlay muted playsInline />
    </motion.div>
  );
}
