-- Update RLS policies to allow donors (including businesses) to also claim food

-- Drop the existing recipient-only INSERT policy on donation_matches
DROP POLICY IF EXISTS "Recipients can create matches" ON public.donation_matches;

-- Create new policy that allows both recipients AND donors to create matches (claim food)
CREATE POLICY "Users can create matches" 
ON public.donation_matches 
FOR INSERT 
WITH CHECK (
  (auth.uid() = recipient_id) AND 
  (has_role(auth.uid(), 'recipient') OR has_role(auth.uid(), 'donor'))
);

-- Update the food_donations INSERT policy to allow both donors and recipients to donate
DROP POLICY IF EXISTS "Donors can create donations" ON public.food_donations;

CREATE POLICY "Users with donor or business role can create donations" 
ON public.food_donations 
FOR INSERT 
WITH CHECK (
  (auth.uid() = donor_id) AND 
  (has_role(auth.uid(), 'donor') OR has_role(auth.uid(), 'recipient'))
);