import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  gradient?: "primary" | "secondary" | "accent" | "none";
  hover?: boolean;
  glow?: boolean;
}

const GlassCard = ({ 
  children, 
  className, 
  gradient = "none",
  hover = true,
  glow = false 
}: GlassCardProps) => {
  const gradientClasses = {
    primary: "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent",
    secondary: "bg-gradient-to-br from-secondary/10 via-secondary/5 to-transparent",
    accent: "bg-gradient-to-br from-accent/10 via-accent/5 to-transparent",
    none: "bg-card/80",
  };

  const glowClasses = {
    primary: "shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)]",
    secondary: "shadow-[0_0_30px_-5px_hsl(var(--secondary)/0.3)]",
    accent: "shadow-[0_0_30px_-5px_hsl(var(--accent)/0.3)]",
    none: "",
  };

  return (
    <motion.div
      className={cn(
        "relative rounded-2xl border border-border/50 backdrop-blur-xl",
        gradientClasses[gradient],
        glow && glowClasses[gradient],
        hover && "transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Subtle inner glow */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
      {children}
    </motion.div>
  );
};

export default GlassCard;
