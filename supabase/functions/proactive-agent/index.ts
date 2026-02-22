import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const results: string[] = [];

    // 1. Check for expiring donations (within 24 hours)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: expiringDonations } = await supabase
      .from("food_donations")
      .select("id, title, donor_id, expiration_date, food_type, quantity, unit")
      .eq("status", "available")
      .lte("expiration_date", tomorrow.toISOString().split("T")[0]);

    if (expiringDonations && expiringDonations.length > 0) {
      for (const donation of expiringDonations) {
        // Notify donor
        await supabase.from("notifications").insert({
          user_id: donation.donor_id,
          title: "⚠️ Donation Expiring Soon",
          message: `Your donation "${donation.title}" (${donation.quantity} ${donation.unit}) expires on ${donation.expiration_date}. Consider lowering requirements or extending the date.`,
          type: "proactive_alert",
          related_id: donation.id,
        });

        // Create agent action for all recipients
        const { data: recipients } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "recipient")
          .limit(20);

        if (recipients) {
          for (const recipient of recipients) {
            await supabase.from("agent_actions").insert({
              user_id: recipient.user_id,
              action_type: "proactive_alert",
              description: `Urgent: "${donation.title}" (${donation.quantity} ${donation.unit} of ${donation.food_type}) is expiring on ${donation.expiration_date}. Claim it now!`,
              action_data: { donation_id: donation.id, urgency: "high", donation },
              status: "pending",
            });
          }
        }
      }
      results.push(`Alerted ${expiringDonations.length} expiring donations`);
    }

    // 2. Check for unmatched donations older than 12 hours
    const twelveHoursAgo = new Date();
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);

    const { data: unmatchedDonations } = await supabase
      .from("food_donations")
      .select("id, title, donor_id, food_type, quantity, unit")
      .eq("status", "available")
      .lte("created_at", twelveHoursAgo.toISOString());

    if (unmatchedDonations && unmatchedDonations.length > 0) {
      for (const donation of unmatchedDonations) {
        await supabase.from("notifications").insert({
          user_id: donation.donor_id,
          title: "📦 Donation Still Unclaimed",
          message: `"${donation.title}" has been available for over 12 hours. The AI agent can help find a recipient.`,
          type: "proactive_alert",
          related_id: donation.id,
        });
      }
      results.push(`Flagged ${unmatchedDonations.length} unmatched donations`);
    }

    // 3. Check for confirmed matches without volunteers
    const { data: noVolunteerMatches } = await supabase
      .from("donation_matches")
      .select("id, recipient_id, donation_id")
      .eq("status", "confirmed")
      .is("volunteer_id", null);

    if (noVolunteerMatches && noVolunteerMatches.length > 0) {
      // Notify all volunteers
      const { data: volunteers } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "volunteer")
        .limit(20);

      if (volunteers) {
        for (const vol of volunteers) {
          await supabase.from("agent_actions").insert({
            user_id: vol.user_id,
            action_type: "proactive_alert",
            description: `${noVolunteerMatches.length} confirmed match(es) need a volunteer for pickup/delivery. Check the matches page to help!`,
            action_data: { match_ids: noVolunteerMatches.map((m) => m.id), urgency: "medium" },
            status: "pending",
          });
        }
      }
      results.push(`Alerted volunteers about ${noVolunteerMatches.length} matches needing delivery`);
    }

    return new Response(
      JSON.stringify({ success: true, results, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Proactive agent error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
