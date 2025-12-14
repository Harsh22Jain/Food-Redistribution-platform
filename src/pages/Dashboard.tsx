import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import SmartMatchSuggestions from "@/components/SmartMatchSuggestions";
import FloatingParticles from "@/components/FloatingParticles";
import GlassCard from "@/components/GlassCard";
import AnimatedCounter from "@/components/AnimatedCounter";
import ImpactChart from "@/components/ImpactChart";
import ProgressRing from "@/components/ProgressRing";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Users, Truck, TrendingUp, Building2, History, Sparkles, ArrowRight } from "lucide-react";

interface Stats {
  activeDonations: number;
  completedMatches: number;
  pendingMatches: number;
  totalImpact: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    activeDonations: 0,
    completedMatches: 0,
    pendingMatches: 0,
    totalImpact: 0,
  });

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (roleData) {
        setUserRole(roleData.role);
      }

      setLoading(false);
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const { count: activeDonations } = await supabase
        .from("food_donations")
        .select("*", { count: "exact", head: true })
        .eq("donor_id", user.id)
        .eq("status", "available");

      const { count: completedMatches } = await supabase
        .from("donation_matches")
        .select("*", { count: "exact", head: true })
        .or(`recipient_id.eq.${user.id},volunteer_id.eq.${user.id}`)
        .eq("status", "completed");

      const { count: pendingMatches } = await supabase
        .from("donation_matches")
        .select("*", { count: "exact", head: true })
        .or(`recipient_id.eq.${user.id},volunteer_id.eq.${user.id}`)
        .in("status", ["pending", "confirmed", "in_transit"]);

      let totalImpact = 0;
      if (userRole === "donor") {
        const { count } = await supabase
          .from("food_donations")
          .select("*", { count: "exact", head: true })
          .eq("donor_id", user.id);
        totalImpact = count || 0;
      } else {
        const { count } = await supabase
          .from("donation_matches")
          .select("*", { count: "exact", head: true })
          .or(`recipient_id.eq.${user.id},volunteer_id.eq.${user.id}`);
        totalImpact = count || 0;
      }

      setStats({
        activeDonations: activeDonations || 0,
        completedMatches: completedMatches || 0,
        pendingMatches: pendingMatches || 0,
        totalImpact,
      });
    };

    fetchStats();

    const donationsChannel = supabase
      .channel("donations_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "food_donations",
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    const matchesChannel = supabase
      .channel("matches_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "donation_matches",
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(donationsChannel);
      supabase.removeChannel(matchesChannel);
    };
  }, [user, userRole]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[image:var(--gradient-page)]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const impactPercentage = stats.totalImpact > 0 ? Math.min((stats.completedMatches / stats.totalImpact) * 100, 100) : 0;

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)] relative overflow-hidden">
      <FloatingParticles />
      <Navbar />
      
      <motion.div 
        className="container mx-auto px-4 py-8 pt-24 relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Welcome Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">Welcome back!</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-2">
            <span className="text-gradient">Dashboard</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Here's your impact overview for today.
          </p>
        </motion.div>

        {userRole === "recipient" && (
          <motion.div variants={itemVariants} className="mb-8">
            <SmartMatchSuggestions />
          </motion.div>
        )}

        {/* Stats Grid with Glass Cards */}
        <motion.div 
          variants={itemVariants}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8"
        >
          {userRole === "donor" && (
            <GlassCard gradient="primary" glow className="md:col-span-2 lg:col-span-4 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">Business Account</h3>
                  </div>
                  <p className="text-muted-foreground">
                    Manage your business profile and expand your impact
                  </p>
                </div>
                <Button 
                  onClick={() => navigate("/business-onboarding")} 
                  className="group"
                >
                  Update Profile
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </GlassCard>
          )}
          
          {/* Stat Cards */}
          <GlassCard className="p-6 card-shine">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                Active
              </span>
            </div>
            <AnimatedCounter 
              value={stats.activeDonations} 
              className="text-3xl font-bold block mb-1"
            />
            <p className="text-sm text-muted-foreground">
              {userRole === "donor" ? "Active Donations" : "Available Food"}
            </p>
          </GlassCard>

          <GlassCard className="p-6 card-shine">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-accent/10">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded-full">
                Completed
              </span>
            </div>
            <AnimatedCounter 
              value={stats.completedMatches} 
              className="text-3xl font-bold block mb-1"
            />
            <p className="text-sm text-muted-foreground">Completed Matches</p>
          </GlassCard>

          <GlassCard className="p-6 card-shine">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-secondary/10">
                <Truck className="h-6 w-6 text-secondary" />
              </div>
              <span className="text-xs font-medium text-secondary bg-secondary/10 px-2 py-1 rounded-full">
                Pending
              </span>
            </div>
            <AnimatedCounter 
              value={stats.pendingMatches} 
              className="text-3xl font-bold block mb-1"
            />
            <p className="text-sm text-muted-foreground">Pending Matches</p>
          </GlassCard>

          <GlassCard className="p-6 card-shine">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                Total
              </span>
            </div>
            <AnimatedCounter 
              value={stats.totalImpact} 
              className="text-3xl font-bold block mb-1"
            />
            <p className="text-sm text-muted-foreground">
              Total {userRole === "donor" ? "Donations" : "Matches"}
            </p>
          </GlassCard>
        </motion.div>

        {/* Impact Section */}
        <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-3 mb-8">
          {/* Progress Ring Card */}
          <GlassCard gradient="primary" className="p-6 flex flex-col items-center justify-center">
            <h3 className="font-semibold mb-4">Completion Rate</h3>
            <ProgressRing progress={impactPercentage} size={140} color="primary">
              <div className="text-center">
                <AnimatedCounter 
                  value={Math.round(impactPercentage)} 
                  suffix="%" 
                  className="text-2xl font-bold"
                />
                <p className="text-xs text-muted-foreground">Complete</p>
              </div>
            </ProgressRing>
          </GlassCard>

          {/* Charts Card */}
          <GlassCard className="p-6 lg:col-span-2">
            <h3 className="font-semibold mb-4">Activity Overview</h3>
            <ImpactChart 
              stats={{
                available: stats.activeDonations,
                matched: stats.pendingMatches,
                completed: stats.completedMatches,
                expired: 0,
              }}
            />
          </GlassCard>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-6">
            <h3 className="font-semibold text-lg mb-4">Quick Actions</h3>
            <div className="grid gap-4 md:grid-cols-4">
              {userRole === "donor" && (
                <Button 
                  onClick={() => navigate("/create-donation")} 
                  className="w-full h-auto py-4 flex flex-col gap-2 hover-lift"
                >
                  <Package className="h-5 w-5" />
                  <span>Post Donation</span>
                </Button>
              )}
              {userRole === "recipient" && (
                <Button 
                  onClick={() => navigate("/browse")} 
                  className="w-full h-auto py-4 flex flex-col gap-2 hover-lift"
                >
                  <Users className="h-5 w-5" />
                  <span>Browse Food</span>
                </Button>
              )}
              <Button 
                onClick={() => navigate("/matches")} 
                variant="outline"
                className="w-full h-auto py-4 flex flex-col gap-2 hover-lift glass"
              >
                <Truck className="h-5 w-5" />
                <span>View Matches</span>
              </Button>
              <Button 
                onClick={() => navigate("/profile")} 
                variant="outline"
                className="w-full h-auto py-4 flex flex-col gap-2 hover-lift glass"
              >
                <Users className="h-5 w-5" />
                <span>Profile Settings</span>
              </Button>
              <Button 
                onClick={() => navigate("/donation-history")} 
                variant="outline"
                className="w-full h-auto py-4 flex flex-col gap-2 hover-lift glass"
              >
                <History className="h-5 w-5" />
                <span>Donation History</span>
              </Button>
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
