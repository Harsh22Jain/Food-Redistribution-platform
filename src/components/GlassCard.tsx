import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ReactNode, useRef, useState } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  gradient?: "primary" | "secondary" | "accent" | "none";
  hover?: boolean;
  glow?: boolean;
  hologram?: boolean;
}

const GlassCard = ({ 
  children, 
  className, 
  gradient = "none",
  hover = true,
  glow = false,
  hologram = false,
}: GlassCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hologram || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -12, y: x * 12 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setIsHovering(false);
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  return (
    <motion.div
      ref={cardRef}
      className={cn(
        "relative rounded-2xl border border-border/50 backdrop-blur-xl",
        gradientClasses[gradient],
        glow && glowClasses[gradient],
        hover && !hologram && "transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
        hologram && "hologram-border hologram-scanlines hologram-tilt perspective-1000 preserve-3d border-0",
        className
      )}
      style={{
        transform: hologram ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${isHovering ? 'translateZ(20px)' : 'translateZ(0)'}` : undefined,
        transformStyle: hologram ? 'preserve-3d' : undefined,
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
    >
      {/* Subtle inner glow */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
      
      {/* Holographic corner accents */}
      {hologram && (
        <>
          <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-cyan-400/60 rounded-tl-2xl pointer-events-none" />
          <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-cyan-400/60 rounded-tr-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-cyan-400/60 rounded-bl-2xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-cyan-400/60 rounded-br-2xl pointer-events-none" />
        </>
      )}
      
      {children}
    </motion.div>
  );
};

export default GlassCard;
