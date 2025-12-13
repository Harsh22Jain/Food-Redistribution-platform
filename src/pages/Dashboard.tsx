import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import SmartMatchSuggestions from "@/components/SmartMatchSuggestions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Users, Truck, Bell, TrendingUp, Building2 } from "lucide-react";

interface Stats {
  activeDonations: number;
  completedMatches: number;
  pendingMatches: number;
  totalImpact: number;
}

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
      // Fetch active donations (for donors)
      const { count: activeDonations } = await supabase
        .from("food_donations")
        .select("*", { count: "exact", head: true })
        .eq("donor_id", user.id)
        .eq("status", "available");

      // Fetch completed matches
      const { count: completedMatches } = await supabase
        .from("donation_matches")
        .select("*", { count: "exact", head: true })
        .or(`recipient_id.eq.${user.id},volunteer_id.eq.${user.id}`)
        .eq("status", "completed");

      // Fetch pending matches
      const { count: pendingMatches } = await supabase
        .from("donation_matches")
        .select("*", { count: "exact", head: true })
        .or(`recipient_id.eq.${user.id},volunteer_id.eq.${user.id}`)
        .in("status", ["pending", "confirmed", "in_transit"]);

      // Fetch total impact (all donations or matches)
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

    // Set up real-time subscriptions for live updates
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
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const roleCards = {
    donor: {
      title: "Post Food Donation",
      description: "List surplus food items for those in need",
      icon: Package,
      action: () => navigate("/create-donation"),
    },
    recipient: {
      title: "Browse Available Food",
      description: "Find and claim food donations near you",
      icon: Users,
      action: () => navigate("/browse"),
    },
    volunteer: {
      title: "Available Deliveries",
      description: "Help deliver food to recipients",
      icon: Truck,
      action: () => navigate("/matches"),
    },
  };

  const currentRoleCard = userRole && roleCards[userRole as keyof typeof roleCards];

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)]">
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's your impact overview.
          </p>
        </div>

        {userRole === "recipient" && (
          <div className="mb-8">
            <SmartMatchSuggestions />
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {userRole === "donor" && (
            <Card className="md:col-span-2 lg:col-span-4 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Business Account
                </CardTitle>
                <CardDescription>
                  Manage your business profile and expand your impact
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate("/business-onboarding")} variant="default">
                  Update Business Profile
                </Button>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {userRole === "donor" ? "Active Donations" : "Available Food"}
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeDonations}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Matches</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedMatches}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Matches</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingMatches}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Impact</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalImpact}</div>
              <p className="text-xs text-muted-foreground">
                {userRole === "donor" ? "donations" : "matches"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Navigate to key features</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {userRole === "donor" && (
              <Button onClick={() => navigate("/create-donation")} className="w-full">
                <Package className="h-4 w-4 mr-2" />
                Post Donation
              </Button>
            )}
            {userRole === "recipient" && (
              <Button onClick={() => navigate("/browse")} className="w-full">
                <Users className="h-4 w-4 mr-2" />
                Browse Food
              </Button>
            )}
            <Button onClick={() => navigate("/matches")} className="w-full" variant="outline">
              <Truck className="h-4 w-4 mr-2" />
              View Matches
            </Button>
            <Button onClick={() => navigate("/profile")} className="w-full" variant="outline">
              Profile Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
