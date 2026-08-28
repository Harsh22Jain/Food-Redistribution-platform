import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface HolographicLoaderProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

const sizes = {
  sm: { container: "w-16 h-16", ring1: "w-12 h-12", ring2: "w-8 h-8", core: "w-3 h-3" },
  md: { container: "w-28 h-28", ring1: "w-20 h-20", ring2: "w-14 h-14", core: "w-5 h-5" },
  lg: { container: "w-44 h-44", ring1: "w-32 h-32", ring2: "w-22 h-22", core: "w-8 h-8" },
};

export default function HolographicLoader({ 
  size = "md", 
  text = "Initializing holographic interface...",
  className,
  fullScreen = false,
}: HolographicLoaderProps) {
  const Wrapper = fullScreen ? motion.div : "div";
  const wrapperProps = fullScreen
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        className: "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-xl",
      }
    : { className: cn("flex flex-col items-center justify-center", className) };

  return (
    <Wrapper {...wrapperProps}>
      <div className={cn("relative flex items-center justify-center", sizes[size].container)}>
        {/* Outer rotating ring */}
        <motion.div
          className={cn(
            "absolute rounded-full border-2 border-cyan-400/40 border-t-cyan-400 border-b-cyan-300/20",
            sizes[size].ring1
          )}
          style={{ transformStyle: "preserve-3d" }}
          animate={{ rotateX: [70, 70], rotateZ: [0, 360] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Middle counter-rotating ring */}
        <motion.div
          className={cn(
            "absolute rounded-full border-2 border-teal-400/50 border-l-teal-400 border-r-teal-300/20",
            sizes[size].ring2
          )}
          style={{ transformStyle: "preserve-3d" }}
          animate={{ rotateX: [60, 60], rotateZ: [360, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Inner pulsing core */}
        <motion.div
          className={cn(
            "rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 shadow-[0_0_30px_-5px_hsl(180_100%_50%_/0.8)]",
            sizes[size].core
          )}
          animate={{ 
            scale: [1, 1.3, 1],
            boxShadow: [
              "0 0 20px -5px hsl(180 100% 50% / 0.6)",
              "0 0 40px -5px hsl(180 100% 50% / 1)",
              "0 0 20px -5px hsl(180 100% 50% / 0.6)",
            ],
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-cyan-400/60"
            animate={{
              x: [0, Math.cos(i * 60 * (Math.PI / 180)) * 40, 0],
              y: [0, Math.sin(i * 60 * (Math.PI / 180)) * 40, 0],
              opacity: [0.2, 1, 0.2],
            }}
            transition={{ duration: 2 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>
      
      {text && (
        <motion.p
          className="mt-6 text-sm font-medium text-cyan-400/80 tracking-widest uppercase hologram-text"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {text}
        </motion.p>
      )}
    </Wrapper>
  );
}
