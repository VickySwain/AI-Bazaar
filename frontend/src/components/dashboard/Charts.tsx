'use client'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const CHART_COLORS = ['#7c3aed', '#2563eb', '#34d399', '#fbbf24', '#fb7185']

interface RevenueChartProps {
  data: Array<{ month: string; revenue: number; transactions: number }>
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip
          contentStyle={{
            background: '#1e293b',
            border: '1px solid rgba(148,163,184,0.15)',
            borderRadius: '12px',
            fontSize: '12px',
            color: '#f8fafc',
          }}
          formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#7c3aed"
          strokeWidth={2}
          fill="url(#revenueGrad)"
          dot={false}
          activeDot={{ r: 4, fill: '#7c3aed' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

interface CategoryChartProps {
  data: Array<{ category: string; count: number }>
}

export function CategoryPieChart({ data }: CategoryChartProps) {
  const labels: Record<string, string> = {
    HEALTH: 'Health', LIFE: 'Life', TERM: 'Term', MOTOR: 'Motor', TRAVEL: 'Travel', HOME: 'Home',
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          dataKey="count"
          nameKey="category"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: '#1e293b',
            border: '1px solid rgba(148,163,184,0.15)',
            borderRadius: '12px',
            fontSize: '12px',
            color: '#f8fafc',
          }}
          formatter={(v: number, name: string) => [v, labels[name] || name]}
        />
        <Legend
          formatter={(value) => labels[value] || value}
          wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
