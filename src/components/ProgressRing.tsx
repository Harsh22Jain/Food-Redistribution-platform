import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: "primary" | "secondary" | "accent";
  children?: ReactNode;
}

const ProgressRing = ({ 
  progress, 
  size = 120, 
  strokeWidth = 8,
  color = "primary",
  children 
}: ProgressRingProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  const colorMap = {
    primary: "stroke-primary",
    secondary: "stroke-secondary",
    accent: "stroke-accent",
  };

  const glowMap = {
    primary: "drop-shadow-[0_0_10px_hsl(var(--primary)/0.5)]",
    secondary: "drop-shadow-[0_0_10px_hsl(var(--secondary)/0.5)]",
    accent: "drop-shadow-[0_0_10px_hsl(var(--accent)/0.5)]",
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className={`transform -rotate-90 ${glowMap[color]}`}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={colorMap[color]}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};

export default ProgressRing;
