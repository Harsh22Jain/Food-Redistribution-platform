import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Star, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import Navbar from '@/components/Navbar';

const Reviews = () => {
  const navigate = useNavigate();
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchRatings = async () => {
    try {
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('ratings')
        .select('id, rating, feedback, created_at, user_id, match_id')
        .order('created_at', { ascending: false });

      if (ratingsError) throw ratingsError;

      const enrichedRatings = await Promise.all(
        (ratingsData || []).map(async (rating) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', rating.user_id)
            .single();

          const { data: match } = await supabase
            .from('donation_matches')
            .select('donation_id')
            .eq('id', rating.match_id)
            .single();

          let donationTitle = 'Donation';
          if (match) {
            const { data: donation } = await supabase
              .from('food_donations')
              .select('title')
              .eq('id', match.donation_id)
              .single();
            
            donationTitle = donation?.title || 'Donation';
          }

          return {
            ...rating,
            userName: profile?.full_name || 'Anonymous',
            donationTitle
          };
        })
      );

      setRatings(enrichedRatings);
    } catch (error) {
      console.error('Error fetching ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[image:var(--gradient-page)]">
        <Navbar />
        <div className="container mx-auto px-4 py-8 pt-24">
          <p className="text-center text-muted-foreground">Loading reviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)]">
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-24">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold mb-8 text-foreground">Community Reviews</h1>

        {ratings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No reviews yet. Be the first to leave a review!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {ratings.map((rating) => (
              <Card key={rating.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar>
                      <AvatarFallback>
                        {rating.userName[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">
                        {rating.userName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(rating.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  {renderStars(rating.rating)}
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg mb-2 text-foreground">
                    {rating.donationTitle}
                  </CardTitle>
                  {rating.feedback && (
                    <p className="text-muted-foreground text-sm">
                      {rating.feedback}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reviews;
