import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
    children: ReactNode;
    className?: string;
    hoverEffect?: boolean;
    onClick?: () => void;
}

export const GlassCard = ({ children, className, hoverEffect = false, onClick }: GlassCardProps) => {
    return (
        <div
            onClick={onClick}
            className={cn(
                "glass-panel rounded-2xl p-6 relative overflow-hidden group",
                hoverEffect && "hover:bg-white/5 transition-colors duration-300",
                className
            )}
        >
            {/* Noise texture overlay (optional, can add if needed) */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
};
