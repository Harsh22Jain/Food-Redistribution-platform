import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
}

interface TrackedUser {
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  updated_at: string;
  profile?: {
    full_name: string;
  };
}

export function useLocationTracking(matchId: string | null) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [trackedUsers, setTrackedUsers] = useState<TrackedUser[]>([]);
  const [watchId, setWatchId] = useState<number | null>(null);
  const { toast } = useToast();

  // Update location in database
  const updateLocation = useCallback(async (location: LocationData) => {
    if (!matchId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("live_locations")
      .upsert({
        user_id: user.id,
        match_id: matchId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        heading: location.heading,
        speed: location.speed,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,match_id"
      });

    if (error) {
      console.error("Error updating location:", error);
    }
  }, [matchId]);

  // Start tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation is not supported by your browser",
        variant: "destructive",
      });
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const location: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading ?? undefined,
          speed: position.coords.speed ?? undefined,
        };
        setCurrentLocation(location);
        updateLocation(location);
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast({
          title: "Location Error",
          description: error.message,
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    setWatchId(id);
    setIsTracking(true);
    toast({
      title: "Location Sharing Started",
      description: "Your location is now being shared with match participants",
    });
  }, [updateLocation, toast]);

  // Stop tracking
  const stopTracking = useCallback(async () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
    setCurrentLocation(null);

    // Remove location from database
    if (matchId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("live_locations")
          .delete()
          .eq("user_id", user.id)
          .eq("match_id", matchId);
      }
    }

    toast({
      title: "Location Sharing Stopped",
      description: "Your location is no longer being shared",
    });
  }, [watchId, matchId, toast]);

  // Fetch and subscribe to other users' locations
  useEffect(() => {
    if (!matchId) return;

    const fetchLocations = async () => {
      const { data, error } = await supabase
        .from("live_locations")
        .select("*")
        .eq("match_id", matchId);

      if (!error && data) {
        setTrackedUsers(data as TrackedUser[]);
      }
    };

    fetchLocations();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`locations-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_locations",
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          fetchLocations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return {
    isTracking,
    currentLocation,
    trackedUsers,
    startTracking,
    stopTracking,
  };
}
