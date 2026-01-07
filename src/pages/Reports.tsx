import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import FloatingParticles from "@/components/FloatingParticles";
import GlassCard from "@/components/GlassCard";
import { motion } from "framer-motion";
import { 
  BarChart3, 
  TrendingUp, 
  Leaf, 
  Users, 
  Package,
  Calendar,
  Download,
  Award,
  Recycle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "@/hooks/use-toast";
import Leaderboard from "@/components/Leaderboard";
import EnvironmentalImpact from "@/components/EnvironmentalImpact";

interface DonationReport {
  id: string;
  title: string;
  quantity: number;
  unit: string;
  status: string;
  created_at: string;
  donor_name: string;
}

interface ChartData {
  date: string;
  donations: number;
  matches: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

const COLORS = ['hsl(142, 71%, 45%)', 'hsl(28, 88%, 62%)', 'hsl(217, 91%, 60%)', 'hsl(280, 65%, 60%)', 'hsl(0, 84%, 60%)'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const Reports = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30");
  const [donations, setDonations] = useState<DonationReport[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [stats, setStats] = useState({
    totalDonations: 0,
    totalMeals: 0,
    activeDonors: 0,
    completedMatches: 0,
    co2Saved: 0,
    waterSaved: 0
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      fetchReports();
    };
    checkAuth();
  }, [navigate, timeRange]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const daysAgo = parseInt(timeRange);
      const startDate = subDays(new Date(), daysAgo).toISOString();

      // Fetch donations
      const { data: donationsData, error: donationsError } = await supabase
        .from("food_donations")
        .select(`
          id,
          title,
          quantity,
          unit,
          status,
          created_at,
          profiles!food_donations_donor_id_fkey(full_name)
        `)
        .gte("created_at", startDate)
        .order("created_at", { ascending: false });

      if (donationsError) throw donationsError;

      const formattedDonations = donationsData?.map(d => ({
        id: d.id,
        title: d.title,
        quantity: d.quantity,
        unit: d.unit,
        status: d.status,
        created_at: d.created_at,
        donor_name: (d.profiles as any)?.full_name || "Anonymous"
      })) || [];

      setDonations(formattedDonations);

      // Fetch matches
      const { data: matchesData, error: matchesError } = await supabase
        .from("donation_matches")
        .select("id, status, created_at")
        .gte("created_at", startDate);

      if (matchesError) throw matchesError;

      // Generate chart data
      const chartDataMap = new Map<string, { donations: number; matches: number }>();
      for (let i = daysAgo; i >= 0; i--) {
        const date = format(subDays(new Date(), i), "MMM dd");
        chartDataMap.set(date, { donations: 0, matches: 0 });
      }

      donationsData?.forEach(d => {
        const date = format(new Date(d.created_at), "MMM dd");
        if (chartDataMap.has(date)) {
          chartDataMap.get(date)!.donations++;
        }
      });

      matchesData?.forEach(m => {
        const date = format(new Date(m.created_at), "MMM dd");
        if (chartDataMap.has(date)) {
          chartDataMap.get(date)!.matches++;
        }
      });

      const chartDataArray = Array.from(chartDataMap.entries()).map(([date, data]) => ({
        date,
        ...data
      }));

      setChartData(chartDataArray);

      // Category distribution
      const categories: Record<string, number> = {};
      donationsData?.forEach(d => {
        categories[d.status] = (categories[d.status] || 0) + 1;
      });

      const categoryArray = Object.entries(categories).map(([name, value], index) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: COLORS[index % COLORS.length]
      }));

      setCategoryData(categoryArray);

      // Calculate stats
      const totalMeals = donationsData?.reduce((acc, d) => acc + d.quantity, 0) || 0;
      const completedMatches = matchesData?.filter(m => m.status === "completed").length || 0;
      const uniqueDonors = new Set(donationsData?.map(d => (d.profiles as any)?.full_name)).size;

      // Environmental impact calculations (estimates)
      const co2Saved = totalMeals * 2.5; // ~2.5 kg CO2 per meal saved
      const waterSaved = totalMeals * 100; // ~100 liters water per meal

      setStats({
        totalDonations: donationsData?.length || 0,
        totalMeals,
        activeDonors: uniqueDonors,
        completedMatches,
        co2Saved,
        waterSaved
      });

    } catch (error) {
      console.error("Error fetching reports:", error);
      toast({
        title: "Error",
        description: "Failed to load reports",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    const csvContent = [
      ["Title", "Quantity", "Unit", "Status", "Date", "Donor"],
      ...donations.map(d => [
        d.title,
        d.quantity.toString(),
        d.unit,
        d.status,
        format(new Date(d.created_at), "yyyy-MM-dd"),
        d.donor_name
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `donation-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Report Exported",
      description: "Your donation report has been downloaded"
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      available: "default",
      matched: "secondary",
      completed: "outline",
      expired: "destructive"
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--gradient-page)]">
      <FloatingParticles />
      <Navbar />
      
      <motion.main 
        className="container mx-auto px-4 pt-24 pb-12"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gradient mb-2">
              Donation Reports
            </h1>
            <p className="text-muted-foreground">
              Track your impact and view detailed analytics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={exportReport} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <GlassCard className="p-4 text-center hover-lift">
            <Package className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{stats.totalDonations}</p>
            <p className="text-sm text-muted-foreground">Total Donations</p>
          </GlassCard>
          <GlassCard className="p-4 text-center hover-lift">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-secondary" />
            <p className="text-2xl font-bold">{stats.totalMeals.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Meals Provided</p>
          </GlassCard>
          <GlassCard className="p-4 text-center hover-lift">
            <Users className="w-8 h-8 mx-auto mb-2 text-accent" />
            <p className="text-2xl font-bold">{stats.activeDonors}</p>
            <p className="text-sm text-muted-foreground">Active Donors</p>
          </GlassCard>
          <GlassCard className="p-4 text-center hover-lift">
            <Award className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{stats.completedMatches}</p>
            <p className="text-sm text-muted-foreground">Completed Matches</p>
          </GlassCard>
        </motion.div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="donations">Donations</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="impact">Impact</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-6">
              {/* Donation Trends Chart */}
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Donation Trends
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorDonations" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorMatches" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="donations" 
                        stroke="hsl(142, 71%, 45%)" 
                        fillOpacity={1} 
                        fill="url(#colorDonations)" 
                        strokeWidth={2}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="matches" 
                        stroke="hsl(217, 91%, 60%)" 
                        fillOpacity={1} 
                        fill="url(#colorMatches)" 
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>

              {/* Status Distribution Chart */}
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Recycle className="w-5 h-5 text-secondary" />
                  Status Distribution
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </motion.div>
          </TabsContent>

          {/* Donations Table Tab */}
          <TabsContent value="donations">
            <motion.div variants={itemVariants}>
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Donations</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Donor</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {donations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No donations found for this time period
                          </TableCell>
                        </TableRow>
                      ) : (
                        donations.map((donation) => (
                          <TableRow key={donation.id}>
                            <TableCell className="font-medium">{donation.title}</TableCell>
                            <TableCell>{donation.quantity} {donation.unit}</TableCell>
                            <TableCell>{getStatusBadge(donation.status)}</TableCell>
                            <TableCell>{donation.donor_name}</TableCell>
                            <TableCell>{format(new Date(donation.created_at), "MMM dd, yyyy")}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </GlassCard>
            </motion.div>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard">
            <Leaderboard />
          </TabsContent>

          {/* Environmental Impact Tab */}
          <TabsContent value="impact">
            <EnvironmentalImpact 
              co2Saved={stats.co2Saved} 
              waterSaved={stats.waterSaved}
              mealsProvided={stats.totalMeals}
            />
          </TabsContent>
        </Tabs>
      </motion.main>
    </div>
  );
};

export default Reports;
