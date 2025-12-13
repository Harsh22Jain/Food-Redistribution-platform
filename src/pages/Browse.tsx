import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Calendar, MapPin, Package, Filter } from "lucide-react";
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
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
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
      const { data: donation } = await supabase
        .from("food_donations")
        .select("title, donor_id")
        .eq("id", donationId)
        .single();

      const { error } = await supabase.from("donation_matches").insert({
        donation_id: donationId,
        recipient_id: user.id,
        status: "pending",
      });

      if (error) throw error;

      await supabase.from("food_donations").update({ status: "claimed" }).eq("id", donationId);

      // Create notification for donor
      if (donation) {
        await supabase.functions.invoke("create-notification", {
          body: {
            user_id: donation.donor_id,
            title: "Food Donation Claimed",
            message: `Your "${donation.title}" donation has been claimed by a recipient.`,
            type: "match",
            related_id: donationId,
          },
        });
      }

      toast({
        title: "Success!",
        description: "Food donation claimed. Check your matches for details.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to claim donation",
        variant: "destructive",
      });
    }
  };

  const filteredDonations = donations.filter((donation) => {
    const matchesSearch =
      donation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      donation.food_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory =
      categoryFilter === "all" || donation.food_type === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)]">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Browse Available Food</h1>
          <p className="text-muted-foreground mb-6">Find fresh donations from your community</p>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by food type or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="w-full md:w-64">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Rice & Rice Products">Rice & Rice Products</SelectItem>
                  <SelectItem value="Dals & Lentils">Dals & Lentils</SelectItem>
                  <SelectItem value="Indian Vegetables">Indian Vegetables</SelectItem>
                  <SelectItem value="Indian Fruits">Indian Fruits</SelectItem>
                  <SelectItem value="Indian Breads">Indian Breads</SelectItem>
                  <SelectItem value="Paneer, Curd, Ghee & Dairy">Dairy Products</SelectItem>
                  <SelectItem value="Indian Sweets">Indian Sweets</SelectItem>
                  <SelectItem value="Indian Snacks">Indian Snacks</SelectItem>
                  <SelectItem value="Prepared Indian Meals">Prepared Meals</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="mt-4 flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              {filteredDonations.length} {filteredDonations.length === 1 ? 'donation' : 'donations'} found
            </Badge>
          </div>
        </div>

        {filteredDonations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No food donations available at the moment.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredDonations.map((donation) => (
              <Card key={donation.id} className="hover:shadow-medium transition-shadow">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Thumbnail Image */}
                    {donation.image_url ? (
                      <img
                        src={donation.image_url}
                        alt={donation.title}
                        className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-lg font-semibold truncate">{donation.title}</h3>
                        <Badge variant="secondary" className="flex-shrink-0">
                          {donation.food_type}
                        </Badge>
                      </div>
                      
                      {donation.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {donation.description}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{donation.pickup_location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span>Pickup: {new Date(donation.pickup_time_start).toLocaleDateString()}</span>
                        </div>
                        <div>
                          <span className="font-semibold">Quantity: </span>
                          {donation.quantity} {donation.unit}
                        </div>
                        <div>
                          <span className="font-semibold">Expires: </span>
                          {new Date(donation.expiration_date).toLocaleDateString()}
                        </div>
                      </div>

                      <Button
                        onClick={() => handleClaim(donation.id)}
                        className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent"
                      >
                        Claim This Food
                      </Button>
                    </div>
                  </div>
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
