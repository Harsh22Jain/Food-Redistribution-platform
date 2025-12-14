import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  emoji: string;
  duration: number;
  delay: number;
}

const foodEmojis = ["🍎", "🥕", "🍇", "🥦", "🍞", "🌽", "🍊", "🥬", "🍋", "🥒", "🍅", "🌶️"];

const FloatingParticles = () => {
  const particles: Particle[] = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 20 + Math.random() * 20,
    emoji: foodEmojis[Math.floor(Math.random() * foodEmojis.length)],
    duration: 15 + Math.random() * 20,
    delay: Math.random() * 5,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute select-none opacity-20 dark:opacity-10"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            fontSize: particle.size,
          }}
          animate={{
            y: [0, -100, 0],
            x: [0, Math.random() * 50 - 25, 0],
            rotate: [0, 360],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        >
          {particle.emoji}
        </motion.div>
      ))}
    </div>
  );
};

export default FloatingParticles;
