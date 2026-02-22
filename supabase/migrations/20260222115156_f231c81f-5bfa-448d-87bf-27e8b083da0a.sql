
-- Table to store AI agent proposed actions awaiting user confirmation
CREATE TABLE public.agent_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL, -- 'auto_match', 'route_optimize', 'proactive_alert', 'task_execute'
  action_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'executed', 'expired'
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours')
);

ALTER TABLE public.agent_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own actions"
ON public.agent_actions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own actions"
ON public.agent_actions FOR UPDATE
USING (auth.uid() = user_id);

-- Allow edge functions to insert via service role (no INSERT policy for anon)
CREATE POLICY "Service role can insert actions"
ON public.agent_actions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_agent_actions_updated_at
BEFORE UPDATE ON public.agent_actions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for agent_actions
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_actions;
