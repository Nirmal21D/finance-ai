"use client"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface TrendData {
  category: string
  currentMonth: number
  previousMonth: number
  change: number
}

interface SpendingTrendsChartProps {
  data: TrendData[]
}

export function SpendingTrendsChart({ data }: SpendingTrendsChartProps) {
  const chartData = data.map(item => ({
    category: item.category.length > 8 ? item.category.substring(0, 8) + '...' : item.category,
    fullCategory: item.category,
    current: item.currentMonth,
    previous: item.previousMonth,
    change: item.change
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="brut-border rounded p-3 bg-card shadow-lg">
          <p className="font-medium mb-2">{data.fullCategory}</p>
          <div className="space-y-1 text-sm">
            <p>
              <span style={{ color: '#007bff' }}>Current: </span>
              ₹{data.current.toLocaleString()}
            </p>
            <p>
              <span style={{ color: '#ff6b00' }}>Previous: </span>
              ₹{data.previous.toLocaleString()}
            </p>
            <p className={data.change >= 0 ? 'text-red-600' : 'text-green-600'}>
              Change: {data.change >= 0 ? '+' : ''}₹{data.change.toLocaleString()}
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  if (data.length === 0) {
    return (
      <div className="brut-border brut-shadow rounded-md p-4 bg-card">
        <div className="heading text-lg mb-4">Spending Trends</div>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center">
            <p className="text-sm">No trend data available</p>
            <p className="text-xs">Need at least 2 months of data to show trends</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="brut-border brut-shadow rounded-md p-6 bg-card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="heading text-xl font-bold">Monthly Spending Comparison</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Track changes in category spending
          </p>
        </div>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span>Current</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-orange-500"></div>
            <span>Previous</span>
          </div>
        </div>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
            <XAxis 
              dataKey="category" 
              stroke="var(--foreground)"
              fontSize={12}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              stroke="var(--foreground)"
              fontSize={12}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey="current" 
              fill="#3b82f6" 
              name="Current Month"
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="previous" 
              fill="#f97316" 
              name="Previous Month"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Top Changes */}
      <div className="mt-6 space-y-3">
        <h4 className="font-semibold text-sm mb-3">Biggest Changes</h4>
        {data
          .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
          .slice(0, 4)
          .map((item, index) => (
            <div key={item.category} className="flex items-center justify-between p-3 rounded-lg bg-accent/20">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${item.change >= 0 ? 'bg-red-500' : 'bg-green-500'}`} />
                <span className="font-medium">{item.category}</span>
              </div>
              <div className="text-right">
                <div className={`font-bold ${item.change >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {item.change >= 0 ? '+' : ''}₹{Math.abs(item.change).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {item.change >= 0 ? 'Increased' : 'Decreased'}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}