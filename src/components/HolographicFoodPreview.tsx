import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  Wheat, Soup, Carrot, Apple, Pizza, Milk, IceCream, Cookie, 
  Droplet, Flame, UtensilsCrossed, Coffee, Package, Snowflake, 
  Cake, Leaf, Salad, Nut, Citrus, Sandwich
} from "lucide-react";

interface HolographicFoodPreviewProps {
  foodType?: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const foodTypeIcons: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  rice: { icon: Wheat, color: "text-amber-400", label: "Rice" },
  dals: { icon: Soup, color: "text-orange-400", label: "Dals" },
  vegetables: { icon: Carrot, color: "text-green-400", label: "Vegetables" },
  fruits: { icon: Apple, color: "text-red-400", label: "Fruits" },
  breads: { icon: Pizza, color: "text-amber-400", label: "Breads" },
  dairy: { icon: Milk, color: "text-blue-400", label: "Dairy" },
  sweets: { icon: IceCream, color: "text-pink-400", label: "Sweets" },
  snacks: { icon: Cookie, color: "text-orange-400", label: "Snacks" },
  pickles: { icon: Droplet, color: "text-green-400", label: "Pickles" },
  spices: { icon: Flame, color: "text-red-400", label: "Spices" },
  prepared: { icon: UtensilsCrossed, color: "text-orange-400", label: "Prepared" },
  beverages: { icon: Coffee, color: "text-amber-400", label: "Beverages" },
  packaged: { icon: Package, color: "text-slate-400", label: "Packaged" },
  flours: { icon: Wheat, color: "text-yellow-400", label: "Flours" },
  dryfuits: { icon: Nut, color: "text-amber-400", label: "Dry Fruits" },
  frozen: { icon: Snowflake, color: "text-cyan-400", label: "Frozen" },
  bakery: { icon: Cake, color: "text-pink-400", label: "Bakery" },
  default: { icon: Leaf, color: "text-emerald-400", label: "Food" },
};

const sizes = {
  sm: { container: "w-24 h-24", ring1: "w-20 h-20", ring2: "w-14 h-14", icon: "h-8 w-8" },
  md: { container: "w-40 h-40", ring1: "w-32 h-32", ring2: "w-24 h-24", icon: "h-14 w-14" },
  lg: { container: "w-56 h-56", ring1: "w-44 h-44", ring2: "w-32 h-32", icon: "h-20 w-20" },
};

export default function HolographicFoodPreview({ 
  foodType = "default", 
  imageUrl, 
  size = "md",
  className,
}: HolographicFoodPreviewProps) {
  const foodInfo = foodTypeIcons[foodType] || foodTypeIcons.default;
  const Icon = foodInfo.icon;
  const sizeClasses = sizes[size];

  return (
    <div className={cn("relative flex items-center justify-center perspective-1000", sizeClasses.container, className)}>
      {/* Outer holographic ring */}
      <motion.div
        className={cn(
          "absolute rounded-full border-2 border-cyan-400/30 border-t-cyan-400 border-b-cyan-300/10",
          sizeClasses.ring1
        )}
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateX: [70, 70], rotateZ: [0, 360] }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Inner counter-rotating ring */}
      <motion.div
        className={cn(
          "absolute rounded-full border-2 border-teal-400/40 border-l-teal-400 border-r-teal-300/10",
          sizeClasses.ring2
        )}
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateX: [65, 65], rotateZ: [360, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Floating base platform */}
      <motion.div
        className="absolute bottom-2 w-3/4 h-4 rounded-[100%] bg-cyan-400/20 blur-md"
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Food image or icon */}
      <motion.div
        className="relative z-10 flex items-center justify-center"
        animate={{ 
          y: [0, -8, 0],
          rotateY: [0, 360],
        }}
        transition={{ 
          y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
          rotateY: { duration: 12, repeat: Infinity, ease: "linear" },
        }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {imageUrl ? (
          <div className={cn("relative rounded-2xl overflow-hidden border-2 border-cyan-400/40 shadow-[0_0_30px_-5px_hsl(180_100%_50%_/0.4)]", sizeClasses.ring2)}>
            <img 
              src={imageUrl} 
              alt="Food preview" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-cyan-400/20 to-transparent" />
          </div>
        ) : (
          <div className={cn(
            "rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-400/40 backdrop-blur-sm p-4 shadow-[0_0_30px_-5px_hsl(180_100%_50%_/0.3)]",
          )}>
            <Icon className={cn(foodInfo.color, sizeClasses.icon)} />
          </div>
        )}
      </motion.div>
      
      {/* Holographic scanlines overlay */}
      <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none opacity-30">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,hsl(180_100%_50%_/0.05)_3px,hsl(180_100%_50%_/0.05)_6px)]" />
      </div>
    </div>
  );
}
