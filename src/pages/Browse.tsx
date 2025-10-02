import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FoodDonation {
  id: string;
  title: string;
  description: string;
  food_type: string;
  quantity: number;
  unit: string;
  expiration_date: string;
  pickup_location: string;
  pickup_time_start: string;
  pickup_time_end: string;
  image_url: string | null;
  status: string;
}

const Browse = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [donations, setDonations] = useState<FoodDonation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    };

    checkAuth();
  }, [navigate]);

  useEffect(() => {
    const fetchDonations = async () => {
      const { data, error } = await supabase
        .from("food_donations")
        .select("*")
        .eq("status", "available")
        .order("created_at", { ascending: false });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load food donations",
          variant: "destructive",
        });
      } else {
        setDonations(data || []);
      }
      setLoading(false);
    };

    fetchDonations();

    const channel = supabase
      .channel("food_donations_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "food_donations",
        },
        () => {
          fetchDonations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const handleClaim = async (donationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("donation_matches").insert({
        donation_id: donationId,
        recipient_id: user.id,
        status: "pending",
      });

      if (error) throw error;

      await supabase.from("food_donations").update({ status: "claimed" }).eq("id", donationId);

      toast({
        title: "Success!",
        description: "Food donation claimed. Check your dashboard for details.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to claim donation",
        variant: "destructive",
      });
    }
  };

  const filteredDonations = donations.filter(
    (donation) =>
      donation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      donation.food_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Browse Available Food</h1>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by food type or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredDonations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No food donations available at the moment.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDonations.map((donation) => (
              <Card key={donation.id} className="hover:shadow-medium transition-shadow">
                {donation.image_url && (
                  <img
                    src={donation.image_url}
                    alt={donation.title}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                )}
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-xl">{donation.title}</CardTitle>
                    <Badge variant="secondary">{donation.food_type}</Badge>
                  </div>
                  <CardDescription>{donation.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{donation.pickup_location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>Pickup: {new Date(donation.pickup_time_start).toLocaleDateString()}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">Quantity: </span>
                    {donation.quantity} {donation.unit}
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">Expires: </span>
                    {new Date(donation.expiration_date).toLocaleDateString()}
                  </div>
                  <Button
                    onClick={() => handleClaim(donation.id)}
                    className="w-full bg-gradient-to-r from-primary to-accent"
                  >
                    Claim This Food
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Browse;
