import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, MapPin, Package, Clock, User } from "lucide-react";

interface Match {
  id: string;
  status: string;
  scheduled_pickup_time: string | null;
  actual_pickup_time: string | null;
  delivery_time: string | null;
  notes: string | null;
  donation: {
    id: string;
    title: string;
    quantity: number;
    unit: string;
    pickup_location: string;
    pickup_time_start: string;
    pickup_time_end: string;
    donor_profile: {
      full_name: string;
      phone: string | null;
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
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
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
            .select("id, title, quantity, unit, pickup_location, pickup_time_start, pickup_time_end, donor_id")
            .eq("id", match.donation_id)
            .single();

          const { data: donorProfile } = await supabase
            .from("profiles")
            .select("full_name, phone")
            .eq("id", donation?.donor_id)
            .single();

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading matches...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-4xl mx-auto px-4">
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
              <Card key={match.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-xl">
                      {match.donation.title}
                    </CardTitle>
                    <Badge className={getStatusColor(match.status)}>
                      {match.status.replace("_", " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-2">
                      <Package className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Quantity</p>
                        <p className="text-sm text-muted-foreground">
                          {match.donation.quantity} {match.donation.unit}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Pickup Location</p>
                        <p className="text-sm text-muted-foreground">
                          {match.donation.pickup_location}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Pickup Window</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(match.donation.pickup_time_start).toLocaleString()} -{" "}
                          {new Date(match.donation.pickup_time_end).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Donor</p>
                        <p className="text-sm text-muted-foreground">
                          {match.donation.donor_profile.full_name}
                        </p>
                        {match.donation.donor_profile.phone && (
                          <p className="text-sm text-muted-foreground">
                            {match.donation.donor_profile.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium mb-1">Recipient</p>
                      <p className="text-sm text-muted-foreground">
                        {match.recipient_profile.full_name}
                      </p>
                      {match.recipient_profile.phone && (
                        <p className="text-sm text-muted-foreground">
                          {match.recipient_profile.phone}
                        </p>
                      )}
                    </div>

                    {match.volunteer_profile && (
                      <div>
                        <p className="text-sm font-medium mb-1">Volunteer</p>
                        <p className="text-sm text-muted-foreground">
                          {match.volunteer_profile.full_name}
                        </p>
                        {match.volunteer_profile.phone && (
                          <p className="text-sm text-muted-foreground">
                            {match.volunteer_profile.phone}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {match.notes && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium mb-1">Notes</p>
                        <p className="text-sm text-muted-foreground">{match.notes}</p>
                      </div>
                    </>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {userRole === "volunteer" && match.status === "confirmed" && !match.volunteer_profile && (
                      <Button onClick={() => volunteerPickup(match.id)}>
                        Accept Delivery
                      </Button>
                    )}

                    {userRole === "volunteer" && match.status === "in_transit" && (
                      <Button onClick={() => updateMatchStatus(match.id, "completed")}>
                        Mark as Delivered
                      </Button>
                    )}

                    {userRole === "recipient" && match.status === "pending" && (
                      <Button onClick={() => updateMatchStatus(match.id, "confirmed")}>
                        Confirm Match
                      </Button>
                    )}

                    {(userRole === "recipient" || userRole === "donor") && 
                     (match.status === "pending" || match.status === "confirmed") && (
                      <Button
                        variant="destructive"
                        onClick={() => updateMatchStatus(match.id, "cancelled")}
                      >
                        Cancel Match
                      </Button>
                    )}

                    {userRole === "recipient" && match.status === "cancelled" && (
                      <Button onClick={() => reorderMatch(match)}>
                        Reorder
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
