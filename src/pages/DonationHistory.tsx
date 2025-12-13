import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, Calendar, MapPin, Clock, User as UserIcon, Star, Filter } from "lucide-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface DonationWithDetails {
  id: string;
  title: string;
  description: string | null;
  food_type: string;
  quantity: number;
  unit: string;
  status: string;
  pickup_location: string;
  pickup_time_start: string;
  pickup_time_end: string;
  expiration_date: string;
  created_at: string;
  image_url: string | null;
  donor_id: string;
  match?: {
    id: string;
    status: string;
    recipient_id: string;
    volunteer_id: string | null;
    delivery_time: string | null;
    rating?: number;
  };
}

const DonationHistory = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [donations, setDonations] = useState<DonationWithDetails[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterFoodType, setFilterFoodType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (roleData) {
        setUserRole(roleData.role);
      }

      setLoading(false);
    };

    checkUser();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchDonationHistory = async () => {
      // Fetch all donations related to the user based on their role
      let query = supabase
        .from("food_donations")
        .select(`
          *,
          donation_matches (
            id,
            status,
            recipient_id,
            volunteer_id,
            delivery_time
          )
        `)
        .order("created_at", { ascending: false });

      if (userRole === "donor") {
        query = query.eq("donor_id", user.id);
      }

      const { data, error } = await query;

      if (!error && data) {
        const donationsWithMatch = data.map((donation: any) => ({
          ...donation,
          match: donation.donation_matches?.[0] || null,
        }));
        setDonations(donationsWithMatch);
      }
    };

    fetchDonationHistory();
  }, [user, userRole]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
      case "matched":
        return "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30";
      case "completed":
        return "bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30";
      case "expired":
        return "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30";
      case "cancelled":
        return "bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const filteredDonations = donations.filter((donation) => {
    const matchesStatus = filterStatus === "all" || donation.status === filterStatus;
    const matchesFoodType = filterFoodType === "all" || donation.food_type === filterFoodType;
    const matchesSearch = donation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      donation.pickup_location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesFoodType && matchesSearch;
  });

  const uniqueFoodTypes = [...new Set(donations.map((d) => d.food_type))];

  const stats = {
    total: donations.length,
    available: donations.filter((d) => d.status === "available").length,
    matched: donations.filter((d) => d.status === "matched").length,
    completed: donations.filter((d) => d.status === "completed").length,
    expired: donations.filter((d) => d.status === "expired").length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)]">
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold">Donation History</h1>
            <p className="text-muted-foreground">
              View and track all your past donations
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-5 mb-8">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-primary">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Total Donations</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.available}</div>
              <p className="text-sm text-muted-foreground">Available</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.matched}</div>
              <p className="text-sm text-muted-foreground">Matched</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.completed}</div>
              <p className="text-sm text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.expired}</div>
              <p className="text-sm text-muted-foreground">Expired</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              <Input
                placeholder="Search by title or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="md:w-64"
              />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="md:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="matched">Matched</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterFoodType} onValueChange={setFilterFoodType}>
                <SelectTrigger className="md:w-48">
                  <SelectValue placeholder="Food Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Food Types</SelectItem>
                  {uniqueFoodTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2 ml-auto">
                <Button
                  variant={viewMode === "cards" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("cards")}
                >
                  Cards
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                >
                  Table
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Donations List */}
        {filteredDonations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No donations found</h3>
              <p className="text-muted-foreground mb-4">
                {donations.length === 0
                  ? "You haven't made any donations yet."
                  : "No donations match your current filters."}
              </p>
              {userRole === "donor" && donations.length === 0 && (
                <Button onClick={() => navigate("/create-donation")}>
                  Create Your First Donation
                </Button>
              )}
            </CardContent>
          </Card>
        ) : viewMode === "cards" ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredDonations.map((donation) => (
              <Card key={donation.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {donation.image_url && (
                  <div className="h-40 overflow-hidden">
                    <img
                      src={donation.image_url}
                      alt={donation.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-1">{donation.title}</CardTitle>
                    <Badge className={getStatusColor(donation.status)}>
                      {donation.status}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {donation.description || "No description provided"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <span>{donation.food_type}</span>
                    <span className="mx-1">•</span>
                    <span>{donation.quantity} {donation.unit}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="line-clamp-1">{donation.pickup_location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Created: {format(new Date(donation.created_at), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Expires: {format(new Date(donation.expiration_date), "MMM d, yyyy")}</span>
                  </div>
                  {donation.match && (
                    <div className="pt-3 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        <UserIcon className="h-4 w-4 text-primary" />
                        <span className="font-medium">Match Status:</span>
                        <Badge variant="outline" className={getStatusColor(donation.match.status)}>
                          {donation.match.status}
                        </Badge>
                      </div>
                      {donation.match.delivery_time && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                          <Clock className="h-4 w-4" />
                          <span>Delivered: {format(new Date(donation.match.delivery_time), "MMM d, yyyy 'at' h:mm a")}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Food Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDonations.map((donation) => (
                  <TableRow key={donation.id}>
                    <TableCell className="font-medium">{donation.title}</TableCell>
                    <TableCell>{donation.food_type}</TableCell>
                    <TableCell>{donation.quantity} {donation.unit}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{donation.pickup_location}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(donation.status)}>
                        {donation.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(donation.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>{format(new Date(donation.expiration_date), "MMM d, yyyy")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DonationHistory;
