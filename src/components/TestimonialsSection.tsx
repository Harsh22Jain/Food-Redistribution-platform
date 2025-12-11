import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";
import { motion } from "framer-motion";

const testimonials = [
  {
    name: "Priya Sharma",
    role: "Restaurant Owner",
    image: "👩‍🍳",
    text: "NourishNet helped us donate surplus food to 50+ families monthly. No more wastage!",
    rating: 5,
  },
  {
    name: "Rajesh Kumar",
    role: "NGO Coordinator",
    image: "🧑‍💼",
    text: "The smart matching system ensures we receive exactly what we need, when we need it.",
    rating: 5,
  },
  {
    name: "Anita Desai",
    role: "Volunteer",
    image: "👩",
    text: "Being part of this community and helping deliver food to those in need is incredibly rewarding.",
    rating: 5,
  },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1
    }
  }
};

export const TestimonialsSection = () => {
  return (
    <section className="py-20 bg-muted/30 overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div 
          className="text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.div 
            variants={fadeInUp}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20 mb-6"
          >
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Star className="w-4 h-4 text-primary fill-primary" />
            </motion.div>
            <span className="text-sm font-medium text-primary">Trusted by Community</span>
          </motion.div>
          <motion.h2 
            variants={fadeInUp}
            className="text-4xl lg:text-5xl font-bold mb-4"
          >
            What Our Users Say
          </motion.h2>
          <motion.p 
            variants={fadeInUp}
            className="text-muted-foreground text-lg max-w-2xl mx-auto"
          >
            Real stories from donors, recipients, and volunteers making a difference
          </motion.p>
        </motion.div>

        <motion.div 
          className="grid md:grid-cols-3 gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={staggerContainer}
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              whileHover={{ y: -8 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card className="border-none shadow-medium hover:shadow-strong transition-shadow duration-300 relative overflow-hidden h-full">
                <motion.div 
                  className="absolute top-0 right-0 text-8xl text-primary/5"
                  initial={{ rotate: 0, scale: 0.8 }}
                  whileHover={{ rotate: 10, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Quote />
                </motion.div>
                <CardContent className="pt-8 relative">
                  <div className="flex items-center gap-4 mb-6">
                    <motion.div 
                      className="text-5xl"
                      whileHover={{ scale: 1.2, rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 0.4 }}
                    >
                      {testimonial.image}
                    </motion.div>
                    <div>
                      <h3 className="font-semibold text-lg">{testimonial.name}</h3>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                      >
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      </motion.div>
                    ))}
                  </div>
                  
                  <p className="text-muted-foreground italic leading-relaxed">
                    "{testimonial.text}"
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
