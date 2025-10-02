import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Users, Truck, Bell } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      action: () => navigate("/donate"),
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
      action: () => navigate("/volunteer"),
    },
  };

  const currentRoleCard = userRole && roleCards[userRole as keyof typeof roleCards];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your FoodShare activity.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentRoleCard && (
            <Card className="hover:shadow-medium transition-shadow cursor-pointer" onClick={currentRoleCard.action}>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <currentRoleCard.icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>{currentRoleCard.title}</CardTitle>
                <CardDescription>{currentRoleCard.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Get Started</Button>
              </CardContent>
            </Card>
          )}

          <Card className="hover:shadow-medium transition-shadow cursor-pointer" onClick={() => navigate("/notifications")}>
            <CardHeader>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <Bell className="w-6 h-6 text-accent" />
              </div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>View your recent activity and alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">View All</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-medium transition-shadow">
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Active Donations</span>
                <span className="font-semibold">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Completed Matches</span>
                <span className="font-semibold">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Community Impact</span>
                <span className="font-semibold">Getting Started</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
