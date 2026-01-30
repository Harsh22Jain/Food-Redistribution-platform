-- Create table for live location tracking
CREATE TABLE public.live_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  match_id UUID REFERENCES public.donation_matches(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(10, 2),
  heading DECIMAL(5, 2),
  speed DECIMAL(10, 2),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, match_id)
);

-- Enable RLS
ALTER TABLE public.live_locations ENABLE ROW LEVEL SECURITY;

-- Users can view locations for matches they're involved in
CREATE POLICY "Users can view locations for their matches"
ON public.live_locations FOR SELECT
USING (
  match_id IN (
    SELECT dm.id FROM donation_matches dm
    WHERE dm.recipient_id = auth.uid()
       OR dm.volunteer_id = auth.uid()
       OR dm.donation_id IN (
         SELECT fd.id FROM food_donations fd WHERE fd.donor_id = auth.uid()
       )
  )
);

-- Users can insert/update their own location
CREATE POLICY "Users can insert their own location"
ON public.live_locations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own location"
ON public.live_locations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own location"
ON public.live_locations FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for live_locations
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_locations;

-- Create index for faster queries
CREATE INDEX idx_live_locations_match_id ON public.live_locations(match_id);
CREATE INDEX idx_live_locations_user_id ON public.live_locations(user_id);