"use client"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

interface CategoryData {
  category: string
  amount: number
  percentage: number
}

interface CategoryPieChartProps {
  data: CategoryData[]
}

const COLORS = [
  '#ff6b00', // Primary orange
  '#007bff', // Secondary blue  
  '#00c853', // Green
  '#ff1744', // Red
  '#9c27b0', // Purple
  '#ff9800', // Amber
  '#795548', // Brown
  '#607d8b'  // Blue Grey
]

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  const chartData = data.map((item, index) => ({
    name: item.category,
    value: item.amount,
    percentage: item.percentage,
    color: COLORS[index % COLORS.length]
  }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      return (
        <div className="brut-border rounded p-3 bg-card shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p style={{ color: data.payload.color }}>
            Amount: ₹{data.value.toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground">
            {data.payload.percentage.toFixed(1)}% of total
          </p>
        </div>
      )
    }
    return null
  }

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap gap-2 justify-center mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-1 text-xs">
            <div 
              className="w-3 h-3 rounded"
              style={{ backgroundColor: entry.color }}
            />
            <span>{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="brut-border brut-shadow rounded-md p-4 bg-card">
        <div className="heading text-lg mb-4">Category Breakdown</div>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center">
            <p className="text-sm">No expense data available</p>
            <p className="text-xs">Add some transactions to see category breakdown</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="brut-border brut-shadow rounded-md p-6 bg-card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="heading text-xl font-bold">Category Breakdown</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Spending distribution by category
          </p>
        </div>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Top Categories List */}
      <div className="mt-6 space-y-3">
        <h4 className="font-semibold text-sm mb-3">Top Categories</h4>
        {data.slice(0, 5).map((category, index) => (
          <div key={category.category} className="flex items-center justify-between p-3 rounded-lg bg-accent/20">
            <div className="flex items-center gap-3">
              <div 
                className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="font-medium">{category.category}</span>
            </div>
            <div className="text-right">
              <div className="font-bold">₹{category.amount.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{category.percentage.toFixed(1)}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}