import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Users, Truck, Shield, CheckCircle, TrendingUp, Clock } from "lucide-react";
import Navbar from "@/components/Navbar";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import heroImage from "@/assets/hero-nourishnet.jpg";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useRef, useEffect, useState } from "react";

const Counter = ({ target, suffix = "" }: { target: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      const duration = 2000;
      const steps = 60;
      const increment = target / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          setCount(target);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);
      return () => clearInterval(timer);
    }
  }, [isInView, target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0 }
};

const fadeInLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0 }
};

const fadeInRight = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0 }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1
    }
  }
};

const Index = () => {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const features = [
    { icon: Heart, title: "Donate Food", desc: "Restaurants, grocers, and individuals can list surplus food with photos and details", color: "primary" },
    { icon: Users, title: "Smart Matching", desc: "Our AI matches donations to recipients based on location, need, and preferences", color: "secondary" },
    { icon: Truck, title: "Coordinate Pickup", desc: "Schedule convenient pickup times or arrange volunteer delivery services", color: "accent" },
    { icon: Shield, title: "Track Impact", desc: "Real-time notifications and tracking ensure food reaches those who need it", color: "primary" },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Navbar />
      
      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-24 pb-20 overflow-hidden">
        <motion.div 
          className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20 -z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        />
        <motion.div 
          className="absolute inset-0 -z-10"
          style={{ y: heroY }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-accent/10" />
        </motion.div>
        
        {/* Floating particles */}
        <div className="absolute inset-0 -z-5 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-primary/30"
              style={{
                left: `${15 + i * 15}%`,
                top: `${20 + (i % 3) * 25}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.3, 0.7, 0.3],
              }}
              transition={{
                duration: 3 + i * 0.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.3,
              }}
            />
          ))}
        </div>

        <motion.div style={{ opacity: heroOpacity }} className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              className="space-y-8"
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <motion.div 
                variants={fadeInUp}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Heart className="w-4 h-4 text-primary" />
                </motion.div>
                <span className="text-sm font-medium text-primary">Connecting Communities, Reducing Waste</span>
              </motion.div>
              
              <motion.h1 
                variants={fadeInUp}
                className="text-5xl lg:text-7xl font-bold leading-tight"
              >
                Share Food,
                <br />
                <motion.span 
                  className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent inline-block"
                  animate={{ 
                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                  }}
                  transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                  style={{ backgroundSize: "200% 200%" }}
                >
                  Feed Hope
                </motion.span>
              </motion.h1>
              
              <motion.p 
                variants={fadeInUp}
                className="text-xl text-muted-foreground leading-relaxed"
              >
                Connect food donors with those in need. Our smart matching system ensures surplus food reaches the right people at the right time.
              </motion.p>
              
              {/* Stats Row */}
              <motion.div 
                variants={fadeInUp}
                className="grid grid-cols-3 gap-4 py-4"
              >
                <motion.div 
                  className="text-center"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="text-3xl font-bold text-primary"><Counter target={5000} suffix="+" /></div>
                  <div className="text-sm text-muted-foreground">Meals Shared</div>
                </motion.div>
                <motion.div 
                  className="text-center"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="text-3xl font-bold text-secondary"><Counter target={500} suffix="+" /></div>
                  <div className="text-sm text-muted-foreground">Active Users</div>
                </motion.div>
                <motion.div 
                  className="text-center"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="text-3xl font-bold text-accent"><Counter target={95} suffix="%" /></div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </motion.div>
              </motion.div>

              <motion.div 
                variants={fadeInUp}
                className="flex flex-wrap gap-4"
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button asChild size="lg" className="bg-gradient-to-r from-primary to-accent shadow-medium hover:shadow-strong transition-all">
                    <Link to="/auth?mode=signup">Get Started Free</Link>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button asChild size="lg" variant="outline" className="hover:bg-primary/5">
                    <Link to="/browse">Browse Available Food</Link>
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>
            
            <motion.div 
              className="relative"
              initial="hidden"
              animate="visible"
              variants={fadeInRight}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <motion.div 
                className="absolute -inset-4 bg-gradient-to-r from-primary to-accent opacity-20 blur-3xl rounded-3xl"
                animate={{ 
                  scale: [1, 1.05, 1],
                  opacity: [0.2, 0.3, 0.2]
                }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              <motion.img
                src={heroImage}
                alt="Community food sharing"
                className="relative rounded-2xl shadow-strong w-full"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 200 }}
              />
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.div 
              variants={scaleIn}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20 mb-6"
            >
              <CheckCircle className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Simple & Effective Process</span>
            </motion.div>
            <motion.h2 
              variants={fadeInUp}
              className="text-4xl lg:text-5xl font-bold mb-4"
            >
              How NourishNet Works
            </motion.h2>
            <motion.p 
              variants={fadeInUp}
              className="text-muted-foreground text-lg max-w-2xl mx-auto"
            >
              Our platform makes food redistribution simple, efficient, and impactful in just four easy steps
            </motion.p>
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
          >
            {features.map((feature, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card className="border-none shadow-soft hover:shadow-strong transition-all duration-300 bg-gradient-to-br from-card to-card/50 relative overflow-hidden group h-full">
                  <motion.div 
                    className={`absolute top-0 right-0 w-32 h-32 bg-${feature.color}/5 rounded-full -mr-16 -mt-16`}
                    whileHover={{ scale: 1.5 }}
                    transition={{ duration: 0.5 }}
                  />
                  <CardHeader className="relative">
                    <motion.div 
                      className={`w-14 h-14 bg-gradient-to-br from-${feature.color} to-${feature.color}/80 rounded-xl flex items-center justify-center mb-4 shadow-soft`}
                      whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <feature.icon className="w-7 h-7 text-white" />
                    </motion.div>
                    <div className={`text-5xl font-bold text-${feature.color}/20 absolute top-4 right-4`}>{index + 1}</div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <CardDescription className="text-base">{feature.desc}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div 
            className="grid lg:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp}>
              <Card className="border-none shadow-medium bg-gradient-to-br from-primary/10 to-primary/5 hover:shadow-strong transition-all h-full">
                <CardHeader className="text-center">
                  <motion.div 
                    className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4"
                    whileHover={{ scale: 1.1, rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <TrendingUp className="w-8 h-8 text-white" />
                  </motion.div>
                  <CardTitle className="text-4xl font-bold text-primary mb-2">2.5 Tons</CardTitle>
                  <CardDescription className="text-base">
                    Food waste prevented this month through our platform
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="border-none shadow-medium bg-gradient-to-br from-secondary/10 to-secondary/5 hover:shadow-strong transition-all h-full">
                <CardHeader className="text-center">
                  <motion.div 
                    className="mx-auto w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4"
                    whileHover={{ scale: 1.1, rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <Users className="w-8 h-8 text-white" />
                  </motion.div>
                  <CardTitle className="text-4xl font-bold text-secondary mb-2">
                    <Counter target={1200} suffix="+" />
                  </CardTitle>
                  <CardDescription className="text-base">
                    Families fed through our community network
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="border-none shadow-medium bg-gradient-to-br from-accent/10 to-accent/5 hover:shadow-strong transition-all h-full">
                <CardHeader className="text-center">
                  <motion.div 
                    className="mx-auto w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4"
                    whileHover={{ scale: 1.1, rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <Clock className="w-8 h-8 text-white" />
                  </motion.div>
                  <CardTitle className="text-4xl font-bold text-accent mb-2">&lt; 30 Min</CardTitle>
                  <CardDescription className="text-base">
                    Average matching time from donation to claim
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={scaleIn}
            transition={{ duration: 0.6 }}
          >
            <Card className="border-none bg-gradient-to-r from-primary via-secondary to-accent text-white shadow-strong relative overflow-hidden">
              <motion.div 
                className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 to-transparent"
                animate={{ 
                  backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"]
                }}
                transition={{ duration: 10, repeat: Infinity }}
              />
              <CardContent className="py-16 text-center relative">
                <motion.h2 
                  className="text-4xl lg:text-5xl font-bold mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                >
                  Ready to Make a Difference?
                </motion.h2>
                <motion.p 
                  className="text-xl mb-10 max-w-2xl mx-auto opacity-95 leading-relaxed"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                >
                  Join our community of donors, recipients, and volunteers working together to end food waste and hunger in India.
                </motion.p>
                <motion.div 
                  className="flex flex-wrap gap-4 justify-center"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                >
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button asChild size="lg" variant="secondary" className="shadow-medium hover:shadow-strong transition-all bg-white text-primary hover:bg-white/90">
                      <Link to="/auth?mode=signup">Join NourishNet Today</Link>
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                      <Link to="/browse">Explore Donations</Link>
                    </Button>
                  </motion.div>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Index;
