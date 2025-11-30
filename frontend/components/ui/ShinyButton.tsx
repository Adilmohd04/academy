"use client";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { ButtonHTMLAttributes } from "react";

interface ShinyButtonProps extends Omit<HTMLMotionProps<"button">, 'children'> {
    children: React.ReactNode;
    className?: string;
    isLoading?: boolean;
}

export const ShinyButton = ({ children, className, isLoading, disabled, ...props }: ShinyButtonProps) => {
    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
                "relative overflow-hidden rounded-xl px-8 py-3 font-medium text-white transition-all",
                "bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500",
                "shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:shadow-[0_0_30px_rgba(139,92,246,0.6)]",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                className
            )}
            disabled={isLoading || disabled}
            {...props}
        >
            {/* Shimmer effect */}
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <span className="relative z-10 flex items-center justify-center gap-2">
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {children}
            </span>
        </motion.button>
    );
};
