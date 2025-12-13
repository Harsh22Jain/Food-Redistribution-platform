import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/Navbar";
import { Calendar, MapPin, Package, Clock, User, Star, ArrowLeft, Navigation } from "lucide-react";
import { RatingDialog } from "@/components/RatingDialog";

interface Match {
  id: string;
  status: string;
  scheduled_pickup_time: string | null;
  actual_pickup_time: string | null;
  delivery_time: string | null;
  notes: string | null;
  volunteer_id: string | null;
  donation: {
    id: string;
    title: string;
    description: string | null;
    food_type: string;
    quantity: number;
    unit: string;
    pickup_location: string;
    pickup_time_start: string;
    pickup_time_end: string;
    image_url: string | null;
    donor_id: string;
    donor_profile: {
      full_name: string;
      phone: string | null;
      organization_name: string | null;
      organization_type: string | null;
    };
    business_profile?: {
      business_name: string;
      business_type: string;
      address: string;
      phone: string;
    };
  };
  recipient_profile: {
    full_name: string;
    phone: string | null;
  };
  volunteer_profile?: {
    full_name: string;
    phone: string | null;
  };
}

export default function Matches() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserRole();
    fetchMatches();

    const channel = supabase
      .channel("matches-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "donation_matches",
        },
        () => {
          fetchMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (data) setUserRole(data.role);
  };

  const fetchMatches = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: matchesData, error: matchesError } = await supabase
        .from("donation_matches")
        .select(`
          id,
          status,
          scheduled_pickup_time,
          actual_pickup_time,
          delivery_time,
          notes,
          donation_id,
          recipient_id,
          volunteer_id
        `)
        .order("created_at", { ascending: false });

      if (matchesError) throw matchesError;
      if (!matchesData) return;

      const enrichedMatches = await Promise.all(
        matchesData.map(async (match) => {
          const { data: donation } = await supabase
            .from("food_donations")
            .select("id, title, description, food_type, quantity, unit, pickup_location, pickup_time_start, pickup_time_end, image_url, donor_id")
            .eq("id", match.donation_id)
            .single();

          const { data: donorProfile } = await supabase
            .from("profiles")
            .select("full_name, phone, organization_name, organization_type")
            .eq("id", donation?.donor_id)
            .single();

          const { data: businessProfile } = await supabase
            .from("business_profiles")
            .select("business_name, business_type, address, phone")
            .eq("user_id", donation?.donor_id)
            .maybeSingle();

          const { data: recipientProfile } = await supabase
            .from("profiles")
            .select("full_name, phone")
            .eq("id", match.recipient_id)
            .single();

          let volunteerProfile = null;
          if (match.volunteer_id) {
            const { data } = await supabase
              .from("profiles")
              .select("full_name, phone")
              .eq("id", match.volunteer_id)
              .single();
            volunteerProfile = data;
          }

          return {
            ...match,
            donation: {
              ...donation!,
              donor_profile: donorProfile!,
            },
            recipient_profile: recipientProfile!,
            volunteer_profile: volunteerProfile,
          };
        })
      );

      setMatches(enrichedMatches);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userRole) return;

    fetchMatches();

    // Set up real-time subscription for live tracking
    const channel = supabase
      .channel("matches_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "donation_matches",
        },
        () => {
          fetchMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole, toast]);

  const updateMatchStatus = async (matchId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("donation_matches")
        .update({ status })
        .eq("id", matchId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Match status updated",
      });

      fetchMatches();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const volunteerPickup = async (matchId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("donation_matches")
        .update({ 
          volunteer_id: user.id,
          status: "in_transit"
        })
        .eq("id", matchId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "You're now assigned to this delivery",
      });

      fetchMatches();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const reorderMatch = async (match: Match) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("donation_matches")
        .insert({
          donation_id: match.donation.id,
          recipient_id: user.id,
          status: "pending"
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "New match created successfully",
      });

      fetchMatches();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRateMatch = async (rating: number, feedback: string) => {
    if (!selectedMatch) return;

    try {
      // You can store ratings in a new table or as metadata
      toast({
        title: "Thank you!",
        description: `You rated this donation ${rating} stars`,
      });
      
      // Optionally update match with rating info
      const { error } = await supabase
        .from("donation_matches")
        .update({
          notes: `Rating: ${rating}/5${feedback ? `. Feedback: ${feedback}` : ""}`
        })
        .eq("id", selectedMatch.id);

      if (error) throw error;
      
      fetchMatches();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleTrackPickup = (location: string) => {
    const encodedLocation = encodeURIComponent(location);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedLocation}`, '_blank');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "confirmed":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "in_transit":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "completed":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "cancelled":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[image:var(--gradient-page)] flex items-center justify-center">
        <p className="text-muted-foreground">Loading matches...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)]">
      <Navbar />
      <div className="container max-w-4xl mx-auto px-4 pt-24 pb-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold mb-8">Food Donation Matches</h1>

        {matches.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No matches found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <Card key={match.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    {match.donation.image_url && (
                      <img
                        src={match.donation.image_url}
                        alt={match.donation.title}
                        className="w-24 h-24 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        {match.donation.title}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getStatusColor(match.status)} variant="secondary">
                          {match.status}
                        </Badge>
                        <Badge variant="outline">{match.donation.food_type}</Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {match.donation.description && (
                    <p className="text-sm text-muted-foreground">{match.donation.description}</p>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Quantity:</span>
                        <span>{match.donation.quantity} {match.donation.unit}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium">Location:</span>
                        <span className="flex-1">{match.donation.pickup_location}</span>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleTrackPickup(match.donation.pickup_location)}
                          className="ml-2 text-xs"
                        >
                          <Navigation className="h-3 w-3 mr-1" />
                          Track
                        </Button>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium">Pickup Time:</p>
                          <p className="text-muted-foreground">
                            {new Date(match.donation.pickup_time_start).toLocaleString()} -
                            {new Date(match.donation.pickup_time_end).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium">Donor:</p>
                          {match.donation.business_profile ? (
                            <>
                              <p className="font-semibold text-primary">
                                {match.donation.business_profile.business_name}
                              </p>
                              <Badge variant="outline" className="mt-1">
                                {match.donation.business_profile.business_type}
                              </Badge>
                              <p className="text-sm mt-1">{match.donation.business_profile.address}</p>
                              <p className="text-muted-foreground">{match.donation.business_profile.phone}</p>
                            </>
                          ) : (
                            <>
                              <p>{match.donation.donor_profile.full_name}</p>
                              {match.donation.donor_profile.organization_name && (
                                <p className="text-sm text-muted-foreground">
                                  {match.donation.donor_profile.organization_name}
                                </p>
                              )}
                              {match.donation.donor_profile.phone && (
                                <p className="text-muted-foreground">{match.donation.donor_profile.phone}</p>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium">Recipient:</p>
                          <p>{match.recipient_profile.full_name}</p>
                          {match.recipient_profile.phone && (
                            <p className="text-muted-foreground">{match.recipient_profile.phone}</p>
                          )}
                        </div>
                      </div>

                      {match.volunteer_profile && (
                        <div className="flex items-start gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="font-medium">Volunteer:</p>
                            <p>{match.volunteer_profile.full_name}</p>
                            {match.volunteer_profile.phone && (
                              <p className="text-muted-foreground">{match.volunteer_profile.phone}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {match.notes && (
                    <>
                      <Separator />
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-sm font-medium mb-1">Notes</p>
                        <p className="text-sm text-muted-foreground">{match.notes}</p>
                      </div>
                    </>
                  )}

                  <Separator />

                  <div className="flex flex-wrap gap-2">
                    {userRole === "recipient" && match.status === "pending" && (
                      <Button onClick={() => updateMatchStatus(match.id, "confirmed")}>
                        Confirm Match
                      </Button>
                    )}

                    {userRole === "volunteer" && match.status === "confirmed" && !match.volunteer_id && (
                      <Button onClick={() => volunteerPickup(match.id)}>
                        Volunteer for Pickup
                      </Button>
                    )}

                    {userRole === "volunteer" && match.status === "in_transit" && (
                      <Button onClick={() => updateMatchStatus(match.id, "completed")}>
                        Mark as Delivered
                      </Button>
                    )}

                    {userRole === "recipient" && match.status === "in_transit" && (
                      <Button onClick={() => updateMatchStatus(match.id, "completed")}>
                        Accept Delivery
                      </Button>
                    )}

                    {match.status === "completed" && (
                      <Button
                        onClick={() => {
                          setSelectedMatch(match);
                          setRatingDialogOpen(true);
                        }}
                        variant="outline"
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Rate Experience
                      </Button>
                    )}

                    {match.status === "cancelled" && userRole === "recipient" && (
                      <Button onClick={() => reorderMatch(match)} variant="outline">
                        Reorder
                      </Button>
                    )}

                    {(userRole === "recipient" || userRole === "donor") &&
                      match.status !== "completed" &&
                      match.status !== "cancelled" && (
                        <Button
                          onClick={() => updateMatchStatus(match.id, "cancelled")}
                          variant="destructive"
                        >
                          Cancel Match
                        </Button>
                      )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <RatingDialog
          isOpen={ratingDialogOpen}
          onClose={() => setRatingDialogOpen(false)}
          onSubmit={handleRateMatch}
          title={selectedMatch?.donation.title || "this donation"}
        />
      </div>
    </div>
  );
}
