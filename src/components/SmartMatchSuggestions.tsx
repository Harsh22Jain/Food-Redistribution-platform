import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, MapPin, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Suggestion {
  id: string;
  suggestion_type: string;
  suggestion_data: any;
  status: string;
}

export default function SmartMatchSuggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSuggestions();
    generateSmartSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("ai_suggestions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) throw error;
      setSuggestions(data || []);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateSmartSuggestions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (userRole?.role === "recipient") {
        const { data: donations } = await supabase
          .from("food_donations")
          .select("*")
          .eq("status", "available")
          .limit(5);

        if (donations && donations.length > 0) {
          const suggestion = {
            user_id: user.id,
            suggestion_type: "match",
            suggestion_data: {
              title: "New donations available near you",
              description: `Found ${donations.length} available donations that match your needs`,
              confidence: 0.85,
              donation_id: donations[0].id,
            },
            status: "pending",
          };

          await supabase.from("ai_suggestions").insert([suggestion]);
        }
      }
    } catch (error) {
      console.error("Error generating suggestions:", error);
    }
  };

  const handleAcceptSuggestion = async (suggestion: Suggestion) => {
    try {
      await supabase
        .from("ai_suggestions")
        .update({ status: "accepted" })
        .eq("id", suggestion.id);

      if (suggestion.suggestion_type === "match" && suggestion.suggestion_data.donation_id) {
        window.location.href = `/browse`;
      }

      setSuggestions(suggestions.filter((s) => s.id !== suggestion.id));
      toast({
        title: "Suggestion Accepted",
        description: "Redirecting you to browse available donations",
      });
    } catch (error) {
      console.error("Error accepting suggestion:", error);
    }
  };

  const handleDismissSuggestion = async (suggestionId: string) => {
    try {
      await supabase
        .from("ai_suggestions")
        .update({ status: "rejected" })
        .eq("id", suggestionId);

      setSuggestions(suggestions.filter((s) => s.id !== suggestionId));
    } catch (error) {
      console.error("Error dismissing suggestion:", error);
    }
  };

  if (loading || suggestions.length === 0) return null;

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Smart Suggestions
        </CardTitle>
        <CardDescription>
          Personalized recommendations powered by AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="p-4 bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {suggestion.suggestion_type === "match" && <TrendingUp className="h-4 w-4 text-primary" />}
                  {suggestion.suggestion_type === "route" && <MapPin className="h-4 w-4 text-accent" />}
                  {suggestion.suggestion_type === "timing" && <Clock className="h-4 w-4 text-secondary" />}
                  <h4 className="font-semibold text-sm">{suggestion.suggestion_data.title}</h4>
                  {suggestion.suggestion_data.confidence && (
                    <Badge variant="secondary" className="ml-auto">
                      {Math.round(suggestion.suggestion_data.confidence * 100)}% match
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {suggestion.suggestion_data.description}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAcceptSuggestion(suggestion)}
                    className="text-xs"
                  >
                    View Matches
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDismissSuggestion(suggestion.id)}
                    className="text-xs"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}