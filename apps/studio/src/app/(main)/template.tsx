"use client";

import { motion } from "framer-motion";

/**
 * Per-route fade-in for the (main) app group. template.tsx re-mounts on
 * every segment change, so this gives every navigation a 150ms opacity
 * fade. MotionConfig at root already wires reducedMotion="user", so
 * users with prefers-reduced-motion: reduce skip the animation.
 */
export default function MainTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
    >
      {children}
    </motion.div>
  );
}
