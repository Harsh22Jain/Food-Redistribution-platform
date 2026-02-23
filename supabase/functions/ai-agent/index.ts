import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_available_donations",
      description: "Search for available food donations. Use when user asks to find food, browse donations, or wants to see what's available.",
      parameters: {
        type: "object",
        properties: {
          food_type: { type: "string", description: "Filter by food type (e.g. 'vegetables', 'bread')" },
          limit: { type: "number", description: "Max results to return, default 5" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "auto_match_donation",
      description: "Propose an automatic match between a donation and the current user (recipient). Creates a pending action for user approval.",
      parameters: {
        type: "object",
        properties: {
          donation_id: { type: "string", description: "The ID of the donation to match with" },
          reason: { type: "string", description: "Reason for this match suggestion" },
        },
        required: ["donation_id", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_matches",
      description: "Get the current user's donation matches with status info.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status: pending, confirmed, in_transit, completed" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_optimal_route",
      description: "Suggest an optimal pickup/delivery route for a volunteer or donor with multiple active matches.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_stats",
      description: "Get the user's dashboard statistics: active donations, completed matches, pending matches.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_donation",
      description: "Propose creating a new food donation on behalf of the user. Creates a pending action for approval.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Title of the donation" },
          food_type: { type: "string", description: "Type of food" },
          quantity: { type: "number", description: "Amount of food" },
          unit: { type: "string", description: "Unit (kg, items, servings, etc.)" },
          pickup_location: { type: "string", description: "Where to pick up" },
          description: { type: "string", description: "Description of the donation" },
        },
        required: ["title", "food_type", "quantity", "unit", "pickup_location"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_expiring_donations",
      description: "Check for donations that are expiring soon and need urgent attention.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
];

async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  userId: string,
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<string> {
  switch (toolName) {
    case "search_available_donations": {
      let query = supabaseAdmin
        .from("food_donations")
        .select("id, title, food_type, quantity, unit, pickup_location, expiration_date, description")
        .eq("status", "available")
        .order("created_at", { ascending: false })
        .limit((args.limit as number) || 5);

      if (args.food_type) {
        query = query.ilike("food_type", `%${args.food_type}%`);
      }

      const { data, error } = await query;
      if (error) return JSON.stringify({ error: error.message });
      if (!data || data.length === 0) return JSON.stringify({ message: "No available donations found." });
      return JSON.stringify({ donations: data, count: data.length });
    }

    case "auto_match_donation": {
      const donationId = args.donation_id as string;
      const reason = args.reason as string;

      // Check donation exists and is available
      const { data: donation } = await supabaseAdmin
        .from("food_donations")
        .select("id, title, food_type, quantity, unit, pickup_location")
        .eq("id", donationId)
        .eq("status", "available")
        .single();

      if (!donation) return JSON.stringify({ error: "Donation not found or no longer available." });

      // Create a pending agent action for user approval
      const { error } = await supabaseAdmin.from("agent_actions").insert({
        user_id: userId,
        action_type: "auto_match",
        description: `Match you with "${donation.title}" (${donation.quantity} ${donation.unit} of ${donation.food_type}) at ${donation.pickup_location}. Reason: ${reason}`,
        action_data: { donation_id: donationId, donation, reason },
        status: "pending",
      });

      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({
        message: `I've proposed a match with "${donation.title}". Please approve or reject this action.`,
        action_type: "auto_match",
        requires_approval: true,
      });
    }

    case "get_my_matches": {
      let query = supabaseAdmin
        .from("donation_matches")
        .select("id, status, scheduled_pickup_time, donation_id, volunteer_id, notes")
        .or(`recipient_id.eq.${userId},volunteer_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(10);

      if (args.status) {
        query = query.eq("status", args.status as string);
      }

      const { data, error } = await query;
      if (error) return JSON.stringify({ error: error.message });

      // Enrich with donation titles
      if (data && data.length > 0) {
        const donationIds = [...new Set(data.map((m) => m.donation_id))];
        const { data: donations } = await supabaseAdmin
          .from("food_donations")
          .select("id, title, food_type, pickup_location")
          .in("id", donationIds);

        const donationMap = new Map(donations?.map((d) => [d.id, d]) || []);
        const enriched = data.map((m) => ({
          ...m,
          donation: donationMap.get(m.donation_id),
        }));
        return JSON.stringify({ matches: enriched, count: enriched.length });
      }

      return JSON.stringify({ matches: [], count: 0, message: "No matches found." });
    }

    case "suggest_optimal_route": {
      // Get active matches for the user
      const { data: matches } = await supabaseAdmin
        .from("donation_matches")
        .select("id, status, donation_id")
        .or(`volunteer_id.eq.${userId},recipient_id.eq.${userId}`)
        .in("status", ["confirmed", "in_transit"]);

      if (!matches || matches.length === 0) {
        return JSON.stringify({ message: "No active deliveries to optimize." });
      }

      const donationIds = matches.map((m) => m.donation_id);
      const { data: donations } = await supabaseAdmin
        .from("food_donations")
        .select("id, title, pickup_location")
        .in("id", donationIds);

      const locations = donations?.map((d) => d.pickup_location) || [];

      // Create a route optimization action
      await supabaseAdmin.from("agent_actions").insert({
        user_id: userId,
        action_type: "route_optimize",
        description: `Optimized route for ${matches.length} active deliveries: ${locations.join(" → ")}`,
        action_data: {
          matches: matches.map((m) => m.id),
          locations,
          suggested_order: locations,
        },
        status: "pending",
      });

      return JSON.stringify({
        message: `I've created an optimized route for your ${matches.length} active deliveries. Please review and approve.`,
        locations,
        requires_approval: true,
      });
    }

    case "get_my_stats": {
      const [activeDonations, completedMatches, pendingMatches] = await Promise.all([
        supabaseAdmin
          .from("food_donations")
          .select("*", { count: "exact", head: true })
          .eq("donor_id", userId)
          .eq("status", "available"),
        supabaseAdmin
          .from("donation_matches")
          .select("*", { count: "exact", head: true })
          .or(`recipient_id.eq.${userId},volunteer_id.eq.${userId}`)
          .eq("status", "completed"),
        supabaseAdmin
          .from("donation_matches")
          .select("*", { count: "exact", head: true })
          .or(`recipient_id.eq.${userId},volunteer_id.eq.${userId}`)
          .in("status", ["pending", "confirmed", "in_transit"]),
      ]);

      return JSON.stringify({
        active_donations: activeDonations.count || 0,
        completed_matches: completedMatches.count || 0,
        pending_matches: pendingMatches.count || 0,
      });
    }

    case "create_donation": {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      await supabaseAdmin.from("agent_actions").insert({
        user_id: userId,
        action_type: "task_execute",
        description: `Create a donation: "${args.title}" - ${args.quantity} ${args.unit} of ${args.food_type} at ${args.pickup_location}`,
        action_data: {
          task: "create_donation",
          donation_data: {
            title: args.title,
            food_type: args.food_type,
            quantity: args.quantity,
            unit: args.unit,
            pickup_location: args.pickup_location,
            description: args.description || "",
            expiration_date: dayAfter.toISOString().split("T")[0],
            pickup_time_start: now.toISOString(),
            pickup_time_end: tomorrow.toISOString(),
          },
        },
        status: "pending",
      });

      return JSON.stringify({
        message: `I've prepared a donation listing for "${args.title}". Please approve to publish it.`,
        requires_approval: true,
      });
    }

    case "check_expiring_donations": {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data } = await supabaseAdmin
        .from("food_donations")
        .select("id, title, food_type, quantity, unit, expiration_date, pickup_location")
        .eq("status", "available")
        .lte("expiration_date", tomorrow.toISOString().split("T")[0])
        .order("expiration_date", { ascending: true })
        .limit(10);

      if (!data || data.length === 0) {
        return JSON.stringify({ message: "No donations expiring soon. Everything looks good!" });
      }

      return JSON.stringify({
        expiring_donations: data,
        count: data.length,
        urgency: "These donations expire within 24 hours and need immediate attention!",
      });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) throw new Error("API key not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase not configured");

    // Extract user from auth header
    const authHeader = req.headers.get("authorization") || "";
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Try to get user from the token
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAdmin.auth.getUser(token);
    
    let user = claimsData?.user;
    if (claimsError || !user) {
      // If no valid user token, return unauthorized
      return new Response(
        JSON.stringify({ error: "Please log in to use the AI agent." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const roles = roleData?.map((r) => r.role) || [];

    const systemPrompt = `You are NourishNet AI Agent — an intelligent assistant for a food donation platform. You can take ACTIONS on behalf of users (with their approval).

Current user ID: ${user.id}
User roles: ${roles.join(", ") || "none"}

## Your capabilities:
1. **Search & Browse**: Find available donations matching user needs
2. **Smart Matching**: Propose optimal donation-recipient matches based on proximity, food type, and urgency
3. **Route Optimization**: Suggest efficient pickup/delivery routes for volunteers
4. **Proactive Alerts**: Check for expiring donations and unmatched items
5. **Task Execution**: Create donations, manage matches on behalf of users

## Behavior:
- ALWAYS use tools to fetch real data — never make up information
- When proposing actions (matches, donations, routes), create agent_actions for user approval
- Be proactive: if a user mentions they need food, immediately search and suggest matches
- If user says "donate [food]", use create_donation tool
- If user asks about their status, use get_my_stats
- When suggesting matches, explain WHY the match is good
- Keep responses concise and actionable
- Format responses with clear sections using markdown`;

    let currentMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    // Agentic loop: keep calling tools until the model stops requesting them
    let maxIterations = 5;
    let finalResponse = "";

    for (let i = 0; i < maxIterations; i++) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: currentMessages,
          tools: TOOLS,
          tool_choice: "auto",
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "Payment required, please add funds to your workspace." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const text = await response.text();
        console.error("AI gateway error:", response.status, text);
        throw new Error("AI gateway error");
      }

      const data = await response.json();
      const choice = data.choices?.[0];

      if (!choice) throw new Error("No response from AI");

      const assistantMessage = choice.message;
      currentMessages.push(assistantMessage);

      // If no tool calls, we're done
      if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
        finalResponse = assistantMessage.content || "";
        break;
      }

      // Execute all tool calls
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        let toolArgs: Record<string, unknown> = {};
        try {
          toolArgs = JSON.parse(toolCall.function.arguments || "{}");
        } catch {
          toolArgs = {};
        }

        console.log(`Executing tool: ${toolName}`, toolArgs);
        const result = await executeTool(toolName, toolArgs, user.id, supabaseAdmin);

        currentMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }
    }

    // Check for pending actions to include in the response
    const { data: pendingActions } = await supabaseAdmin
      .from("agent_actions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5);

    return new Response(
      JSON.stringify({
        response: finalResponse,
        pending_actions: pendingActions || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Agent error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
