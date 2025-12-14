import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

interface ImpactChartProps {
  stats: {
    available: number;
    matched: number;
    completed: number;
    expired: number;
  };
  weeklyData?: Array<{ day: string; donations: number; matches: number }>;
}

const COLORS = {
  available: "hsl(142 71% 45%)",
  matched: "hsl(217 91% 60%)",
  completed: "hsl(280 70% 50%)",
  expired: "hsl(0 84% 60%)",
};

const ImpactChart = ({ stats, weeklyData }: ImpactChartProps) => {
  const pieData = [
    { name: "Available", value: stats.available, color: COLORS.available },
    { name: "Matched", value: stats.matched, color: COLORS.matched },
    { name: "Completed", value: stats.completed, color: COLORS.completed },
    { name: "Expired", value: stats.expired, color: COLORS.expired },
  ].filter(item => item.value > 0);

  const defaultWeeklyData = weeklyData || [
    { day: "Mon", donations: 4, matches: 2 },
    { day: "Tue", donations: 3, matches: 3 },
    { day: "Wed", donations: 5, matches: 4 },
    { day: "Thu", donations: 2, matches: 2 },
    { day: "Fri", donations: 6, matches: 5 },
    { day: "Sat", donations: 8, matches: 7 },
    { day: "Sun", donations: 3, matches: 2 },
  ];

  const total = pieData.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <p>No donation data yet</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Pie Chart */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <h4 className="text-sm font-medium text-muted-foreground mb-2 text-center">Donation Status</h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {pieData.map((item, index) => (
            <div key={index} className="flex items-center gap-1.5 text-xs">
              <div 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-muted-foreground">{item.name}: {item.value}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Area Chart */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h4 className="text-sm font-medium text-muted-foreground mb-2 text-center">Weekly Activity</h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={defaultWeeklyData}>
              <defs>
                <linearGradient id="colorDonations" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorMatches" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="day" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Area
                type="monotone"
                dataKey="donations"
                stroke="hsl(142 71% 45%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorDonations)"
              />
              <Area
                type="monotone"
                dataKey="matches"
                stroke="hsl(217 91% 60%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorMatches)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
};

export default ImpactChart;
