"use client"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

type MonthlyPoint = { 
  month: string; 
  spent: number;
  income?: number;
  net?: number;
}

export function MonthlySpendingChart({ data }: { data: MonthlyPoint[] }) {
  // Handle both old format (just spent) and new format (spent + income)
  const hasIncomeData = data.some(d => d.income !== undefined)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="brut-border rounded p-3 bg-card shadow-lg">
          <p className="font-medium">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.dataKey === 'spent' ? 'Expenses' : 
                 entry.dataKey === 'income' ? 'Income' : 
                 entry.dataKey === 'net' ? 'Net' : entry.dataKey}: ₹${entry.value?.toLocaleString()}`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="brut-border brut-shadow rounded-md p-6 bg-card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="heading text-xl font-bold">
            {hasIncomeData ? 'Monthly Income vs Expenses' : 'Monthly Spending'}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Track your financial trends over time
          </p>
        </div>
        {hasIncomeData && data.length > 0 && (
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Income</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span>Expenses</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Net</span>
            </div>
          </div>
        )}
      </div>
      <div className="h-80 md:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
            <XAxis 
              dataKey="month" 
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
            {hasIncomeData && <Legend />}
            
            <Line 
              type="monotone" 
              dataKey="spent" 
              stroke="#f97316" 
              strokeWidth={4} 
              dot={{ fill: "#f97316", strokeWidth: 3, r: 6 }}
              activeDot={{ r: 8, stroke: "#f97316", strokeWidth: 2, fill: "#fff" }}
              name="Expenses"
            />
            
            {hasIncomeData && (
              <Line 
                type="monotone" 
                dataKey="income" 
                stroke="#22c55e" 
                strokeWidth={4} 
                dot={{ fill: "#22c55e", strokeWidth: 3, r: 6 }}
                activeDot={{ r: 8, stroke: "#22c55e", strokeWidth: 2, fill: "#fff" }}
                name="Income"
              />
            )}
            
            {hasIncomeData && (
              <Line 
                type="monotone" 
                dataKey="net" 
                stroke="#3b82f6" 
                strokeWidth={3} 
                strokeDasharray="8 4"
                dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: "#3b82f6", strokeWidth: 2, fill: "#fff" }}
                name="Net"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {data.length === 0 && (
        <div className="flex items-center justify-center h-48 text-muted-foreground border-2 border-dashed border-border rounded-lg">
          <div className="text-center p-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-sm font-medium mb-2">No transaction data yet</p>
            <p className="text-xs">Add some transactions to see your spending trends and insights</p>
          </div>
        </div>
      )}
    </div>
  )
}
