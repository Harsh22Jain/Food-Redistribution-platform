import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Star } from 'lucide-react';
import { format } from 'date-fns';
import Navbar from '@/components/Navbar';

interface Rating {
  id: string;
  rating: number;
  feedback: string | null;
  created_at: string;
  user: {
    full_name: string;
  };
  match: {
    donation: {
      title: string;
    };
  };
}

const Reviews = () => {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchRatings = async () => {
    try {
      const { data, error } = await supabase
        .from('ratings')
        .select(`
          id,
          rating,
          feedback,
          created_at,
          user:user_id (full_name),
          match:match_id (
            donation:donation_id (
              title
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRatings(data || []);
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
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading reviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
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
                        {rating.user?.full_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">
                        {rating.user?.full_name || 'Anonymous'}
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
                    {rating.match?.donation?.title || 'Donation'}
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
