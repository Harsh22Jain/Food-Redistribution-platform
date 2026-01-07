import { motion } from "framer-motion";
import GlassCard from "./GlassCard";
import { Leaf, Droplets, TreePine, Wind, Recycle, Globe } from "lucide-react";
import ProgressRing from "./ProgressRing";

interface EnvironmentalImpactProps {
  co2Saved: number;
  waterSaved: number;
  mealsProvided: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const EnvironmentalImpact = ({ co2Saved, waterSaved, mealsProvided }: EnvironmentalImpactProps) => {
  // Environmental equivalents
  const treesEquivalent = Math.round(co2Saved / 21); // ~21 kg CO2 per tree per year
  const carMilesEquivalent = Math.round(co2Saved / 0.4); // ~0.4 kg CO2 per mile
  const showersEquivalent = Math.round(waterSaved / 65); // ~65 liters per shower
  const landfillDiverted = Math.round(mealsProvided * 0.5); // ~0.5 kg food waste per meal

  const impactMetrics = [
    {
      icon: Leaf,
      value: co2Saved.toLocaleString(),
      unit: "kg",
      label: "CO₂ Emissions Prevented",
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    {
      icon: Droplets,
      value: (waterSaved / 1000).toFixed(1),
      unit: "kL",
      label: "Water Saved",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      icon: Recycle,
      value: landfillDiverted.toLocaleString(),
      unit: "kg",
      label: "Waste Diverted from Landfill",
      color: "text-amber-500",
      bgColor: "bg-amber-500/10"
    },
    {
      icon: Globe,
      value: mealsProvided.toLocaleString(),
      unit: "",
      label: "Meals Saved from Waste",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    }
  ];

  const equivalents = [
    {
      icon: TreePine,
      value: treesEquivalent,
      label: "trees planted for a year",
      color: "text-green-600"
    },
    {
      icon: Wind,
      value: carMilesEquivalent.toLocaleString(),
      label: "miles not driven by car",
      color: "text-blue-600"
    },
    {
      icon: Droplets,
      value: showersEquivalent.toLocaleString(),
      label: "showers worth of water",
      color: "text-cyan-600"
    }
  ];

  // Calculate sustainability score (0-100)
  const sustainabilityScore = Math.min(100, Math.round((mealsProvided / 100) * 10 + (co2Saved / 1000) * 20));

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Sustainability Score */}
      <motion.div variants={itemVariants}>
        <GlassCard className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-shrink-0">
              <ProgressRing 
                progress={sustainabilityScore} 
                size={120} 
                strokeWidth={10}
              />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-2xl font-bold mb-2">Sustainability Score</h3>
              <p className="text-muted-foreground mb-4">
                Your contributions are making a real difference to the environment. 
                Every donation helps reduce food waste and its environmental impact.
              </p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {sustainabilityScore >= 80 && (
                  <span className="px-3 py-1 bg-green-500/20 text-green-600 rounded-full text-sm font-medium">
                    🌟 Eco Champion
                  </span>
                )}
                {sustainabilityScore >= 50 && sustainabilityScore < 80 && (
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-600 rounded-full text-sm font-medium">
                    🌱 Green Warrior
                  </span>
                )}
                {sustainabilityScore < 50 && (
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-600 rounded-full text-sm font-medium">
                    🌿 Growing Impact
                  </span>
                )}
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Impact Metrics Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {impactMetrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            whileHover={{ scale: 1.05, y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <GlassCard className="p-4 text-center h-full">
              <div className={`w-12 h-12 mx-auto mb-3 rounded-full ${metric.bgColor} flex items-center justify-center`}>
                <metric.icon className={`w-6 h-6 ${metric.color}`} />
              </div>
              <p className="text-2xl font-bold">
                {metric.value}
                <span className="text-sm font-normal text-muted-foreground ml-1">{metric.unit}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">{metric.label}</p>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      {/* Equivalents Section */}
      <motion.div variants={itemVariants}>
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            That's Equivalent To...
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            {equivalents.map((equiv, index) => (
              <motion.div
                key={equiv.label}
                className="flex items-center gap-4 p-4 rounded-xl bg-muted/30"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className={`p-3 rounded-full bg-background ${equiv.color}`}>
                  <equiv.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{equiv.value}</p>
                  <p className="text-sm text-muted-foreground">{equiv.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Call to Action */}
      <motion.div variants={itemVariants}>
        <GlassCard className="p-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <div className="text-center">
            <h3 className="text-xl font-bold mb-2">Keep Making an Impact! 🌍</h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Every donation counts. By reducing food waste, you're helping fight climate change, 
              conserve water resources, and build a more sustainable future for everyone.
            </p>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
};

export default EnvironmentalImpact;
