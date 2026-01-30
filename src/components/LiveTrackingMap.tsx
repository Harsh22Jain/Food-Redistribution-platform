import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Users, X } from "lucide-react";
import { useLocationTracking } from "@/hooks/useLocationTracking";

interface LiveTrackingMapProps {
  matchId: string;
  pickupLocation: string;
  onClose: () => void;
  userRole: string;
  donorName?: string;
  recipientName?: string;
  volunteerName?: string;
}

// Default to a public token for demo - in production, use environment variable
const MAPBOX_TOKEN = "pk.eyJ1IjoibG92YWJsZS1kZW1vIiwiYSI6ImNsczRtNnBiMjAwMXQya3BpMzVoaHIycHoifQ.Wh9c0g-nK7C8l5WuV-OKRA";

export default function LiveTrackingMap({
  matchId,
  pickupLocation,
  onClose,
  userRole,
  donorName,
  recipientName,
  volunteerName,
}: LiveTrackingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [mapLoaded, setMapLoaded] = useState(false);

  const {
    isTracking,
    currentLocation,
    trackedUsers,
    startTracking,
    stopTracking,
  } = useLocationTracking(matchId);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [0, 0],
      zoom: 2,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Geocode pickup location and add marker
  useEffect(() => {
    if (!mapLoaded || !map.current || !pickupLocation) return;

    const geocodeLocation = async () => {
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            pickupLocation
          )}.json?access_token=${MAPBOX_TOKEN}`
        );
        const data = await response.json();

        if (data.features && data.features.length > 0) {
          const [lng, lat] = data.features[0].center;
          
          // Add pickup location marker
          const pickupMarker = document.createElement("div");
          pickupMarker.className = "pickup-marker";
          pickupMarker.innerHTML = `
            <div class="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg border-2 border-white">
              <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"/>
              </svg>
            </div>
          `;

          new mapboxgl.Marker(pickupMarker)
            .setLngLat([lng, lat])
            .setPopup(new mapboxgl.Popup().setHTML(`<strong>Pickup Location</strong><br/>${pickupLocation}`))
            .addTo(map.current!);

          map.current?.flyTo({ center: [lng, lat], zoom: 14 });
        }
      } catch (error) {
        console.error("Geocoding error:", error);
      }
    };

    geocodeLocation();
  }, [mapLoaded, pickupLocation]);

  // Update markers for tracked users
  useEffect(() => {
    if (!mapLoaded || !map.current) return;

    const colors: { [key: string]: string } = {
      donor: "#10b981",
      recipient: "#3b82f6",
      volunteer: "#8b5cf6",
    };

    trackedUsers.forEach((user) => {
      const markerId = user.user_id;

      if (markersRef.current[markerId]) {
        // Update existing marker position
        markersRef.current[markerId].setLngLat([user.longitude, user.latitude]);
      } else {
        // Create new marker
        const el = document.createElement("div");
        el.className = "user-marker";
        el.innerHTML = `
          <div class="w-6 h-6 bg-accent rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-pulse">
            <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/>
            </svg>
          </div>
        `;

        const marker = new mapboxgl.Marker(el)
          .setLngLat([user.longitude, user.latitude])
          .setPopup(new mapboxgl.Popup().setHTML(`<strong>User</strong><br/>Last updated: ${new Date(user.updated_at).toLocaleTimeString()}`))
          .addTo(map.current!);

        markersRef.current[markerId] = marker;
      }
    });

    // Remove markers for users no longer tracked
    Object.keys(markersRef.current).forEach((markerId) => {
      if (!trackedUsers.find((u) => u.user_id === markerId)) {
        markersRef.current[markerId].remove();
        delete markersRef.current[markerId];
      }
    });

    // Fit bounds to show all markers
    if (trackedUsers.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      trackedUsers.forEach((user) => {
        bounds.extend([user.longitude, user.latitude]);
      });
      map.current?.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    }
  }, [trackedUsers, mapLoaded]);

  return (
    <Card className="fixed inset-4 z-50 flex flex-col overflow-hidden">
      <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Navigation className="h-5 w-5 text-primary" />
          Live Tracking
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {trackedUsers.length} online
          </Badge>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 p-4">
        <div className="flex flex-wrap gap-2">
          {donorName && (
            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
              <MapPin className="h-3 w-3 mr-1" />
              Donor: {donorName}
            </Badge>
          )}
          {recipientName && (
            <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
              <MapPin className="h-3 w-3 mr-1" />
              Recipient: {recipientName}
            </Badge>
          )}
          {volunteerName && (
            <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">
              <MapPin className="h-3 w-3 mr-1" />
              Volunteer: {volunteerName}
            </Badge>
          )}
        </div>

        <div ref={mapContainer} className="flex-1 rounded-lg overflow-hidden min-h-[300px]" />

        <div className="flex justify-center gap-2">
          {!isTracking ? (
            <Button onClick={startTracking} className="gap-2">
              <Navigation className="h-4 w-4" />
              Share My Location
            </Button>
          ) : (
            <Button onClick={stopTracking} variant="destructive" className="gap-2">
              <Navigation className="h-4 w-4" />
              Stop Sharing
            </Button>
          )}
        </div>

        {currentLocation && (
          <p className="text-xs text-muted-foreground text-center">
            Your location: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
