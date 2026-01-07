import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "./GlassCard";
import { motion } from "framer-motion";
import { Trophy, Medal, Award, Star, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LeaderboardEntry {
  id: string;
  name: string;
  avatar?: string;
  donations: number;
  mealsProvided: number;
  rank: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
};

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="w-6 h-6 text-yellow-500" />;
    case 2:
      return <Medal className="w-6 h-6 text-gray-400" />;
    case 3:
      return <Medal className="w-6 h-6 text-amber-600" />;
    default:
      return <span className="w-6 h-6 flex items-center justify-center text-muted-foreground font-bold">#{rank}</span>;
  }
};

const getRankBadge = (donations: number) => {
  if (donations >= 50) return { label: "Champion", color: "bg-yellow-500" };
  if (donations >= 25) return { label: "Hero", color: "bg-purple-500" };
  if (donations >= 10) return { label: "Star", color: "bg-blue-500" };
  if (donations >= 5) return { label: "Rising", color: "bg-green-500" };
  return { label: "Newcomer", color: "bg-gray-500" };
};

const Leaderboard = () => {
  const [donors, setDonors] = useState<LeaderboardEntry[]>([]);
  const [recipients, setRecipients] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      // Fetch top donors
      const { data: donationsData, error: donationsError } = await supabase
        .from("food_donations")
        .select(`
          donor_id,
          quantity,
          profiles!food_donations_donor_id_fkey(id, full_name, avatar_url)
        `);

      if (donationsError) throw donationsError;

      // Aggregate donor stats
      const donorStats = new Map<string, { name: string; avatar?: string; donations: number; meals: number }>();
      
      donationsData?.forEach(d => {
        const profile = d.profiles as any;
        if (profile?.id) {
          const current = donorStats.get(profile.id) || { 
            name: profile.full_name || "Anonymous", 
            avatar: profile.avatar_url,
            donations: 0, 
            meals: 0 
          };
          current.donations++;
          current.meals += d.quantity;
          donorStats.set(profile.id, current);
        }
      });

      const sortedDonors = Array.from(donorStats.entries())
        .map(([id, stats], index) => ({
          id,
          name: stats.name,
          avatar: stats.avatar,
          donations: stats.donations,
          mealsProvided: stats.meals,
          rank: index + 1
        }))
        .sort((a, b) => b.donations - a.donations)
        .slice(0, 10)
        .map((donor, index) => ({ ...donor, rank: index + 1 }));

      setDonors(sortedDonors);

      // Fetch top recipients
      const { data: matchesData, error: matchesError } = await supabase
        .from("donation_matches")
        .select(`
          recipient_id,
          status,
          food_donations(quantity),
          profiles!donation_matches_recipient_id_fkey(id, full_name, avatar_url)
        `)
        .eq("status", "completed");

      if (matchesError) throw matchesError;

      // Aggregate recipient stats
      const recipientStats = new Map<string, { name: string; avatar?: string; donations: number; meals: number }>();
      
      matchesData?.forEach(m => {
        const profile = m.profiles as any;
        if (profile?.id) {
          const current = recipientStats.get(profile.id) || { 
            name: profile.full_name || "Anonymous", 
            avatar: profile.avatar_url,
            donations: 0, 
            meals: 0 
          };
          current.donations++;
          current.meals += (m.food_donations as any)?.quantity || 0;
          recipientStats.set(profile.id, current);
        }
      });

      const sortedRecipients = Array.from(recipientStats.entries())
        .map(([id, stats]) => ({
          id,
          name: stats.name,
          avatar: stats.avatar,
          donations: stats.donations,
          mealsProvided: stats.meals,
          rank: 0
        }))
        .sort((a, b) => b.donations - a.donations)
        .slice(0, 10)
        .map((recipient, index) => ({ ...recipient, rank: index + 1 }));

      setRecipients(sortedRecipients);

    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const LeaderboardList = ({ entries }: { entries: LeaderboardEntry[] }) => (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-3"
    >
      {entries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Award className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No entries yet. Be the first!</p>
        </div>
      ) : (
        entries.map((entry, index) => {
          const badge = getRankBadge(entry.donations);
          return (
            <motion.div
              key={entry.id}
              variants={itemVariants}
              className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                index < 3 
                  ? "bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20" 
                  : "bg-muted/30 hover:bg-muted/50"
              }`}
              whileHover={{ scale: 1.02, x: 5 }}
            >
              <div className="flex-shrink-0">
                {getRankIcon(entry.rank)}
              </div>
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarImage src={entry.avatar} />
                <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                  {entry.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate">{entry.name}</p>
                  <Badge className={`${badge.color} text-white text-xs`}>
                    {badge.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {entry.mealsProvided.toLocaleString()} meals provided
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary">{entry.donations}</p>
                <p className="text-xs text-muted-foreground">donations</p>
              </div>
            </motion.div>
          );
        })
      )}
    </motion.div>
  );

  if (loading) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center justify-center py-8">
          <motion.div
            className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Trophy className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Top Donors</h3>
            <p className="text-sm text-muted-foreground">Heroes making a difference</p>
          </div>
        </div>
        <LeaderboardList entries={donors} />
      </GlassCard>

      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-accent/10">
            <Star className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Top Recipients</h3>
            <p className="text-sm text-muted-foreground">Communities we're feeding</p>
          </div>
        </div>
        <LeaderboardList entries={recipients} />
      </GlassCard>
    </div>
  );
};

export default Leaderboard;
