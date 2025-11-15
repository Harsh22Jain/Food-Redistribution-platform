-- Create ratings table for proper rating storage
CREATE TABLE public.ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.donation_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Create policies for ratings
CREATE POLICY "Anyone can view ratings"
ON public.ratings
FOR SELECT
USING (true);

CREATE POLICY "Users can create ratings for their matches"
ON public.ratings
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  (
    auth.uid() IN (
      SELECT recipient_id FROM donation_matches WHERE id = match_id
      UNION
      SELECT volunteer_id FROM donation_matches WHERE id = match_id
      UNION
      SELECT donor_id FROM food_donations fd
      INNER JOIN donation_matches dm ON dm.donation_id = fd.id
      WHERE dm.id = match_id
    )
  )
);

CREATE POLICY "Users can update their own ratings"
ON public.ratings
FOR UPDATE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_ratings_updated_at
BEFORE UPDATE ON public.ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for ratings
ALTER PUBLICATION supabase_realtime ADD TABLE public.ratings;