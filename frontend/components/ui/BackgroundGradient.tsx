"use client";
import { motion } from "framer-motion";

export const BackgroundGradient = () => {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-slate-950" />
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -top-[40%] -left-[20%] w-[70%] h-[70%] rounded-full bg-blue-500/20 blur-[120px]"
      />
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
        className="absolute top-[20%] -right-[20%] w-[60%] h-[60%] rounded-full bg-violet-500/20 blur-[120px]"
      />
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 5,
        }}
        className="absolute -bottom-[40%] left-[20%] w-[60%] h-[60%] rounded-full bg-indigo-500/20 blur-[120px]"
      />
    </div>
  );
};
