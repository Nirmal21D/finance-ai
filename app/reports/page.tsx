"use client"

import { Sidebar } from "@/components/sidebar"
import { MonthlySpendingChart } from "@/components/charts/monthly-spending-chart"
import { CategoryPieChart } from "@/components/charts/category-pie-chart"
import { SpendingTrendsChart } from "@/components/charts/spending-trends-chart"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { jsPDF } from "jspdf"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"
import { AnalyticsService, type FinancialInsights, type CategoryAnalysis, type DateRange } from "@/lib/analytics-service"
import { TransactionService } from "@/lib/transaction-service"
import { useState, useEffect } from "react"
import { Calendar, Download, TrendingUp, TrendingDown, Minus, PieChart, BarChart3, FileText } from "lucide-react"

function ReportsContent() {
  const { user } = useAuth()
  const [insights, setInsights] = useState<FinancialInsights | null>(null)
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [categoryAnalysis, setCategoryAnalysis] = useState<CategoryAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Date range filters
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 months ago
    end: new Date().toISOString().split('T')[0] // today
  })
  const [reportType, setReportType] = useState<'overview' | 'categories' | 'trends'>('overview')

  useEffect(() => {
    if (user) {
      loadAnalytics()
    }
  }, [user, dateRange])

  const loadAnalytics = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)
      
      const analyticsService = AnalyticsService.getInstance()
      const transactionService = TransactionService.getInstance()

      const [financialInsights, timeSeriesData, categoryData] = await Promise.all([
        analyticsService.getFinancialInsights(user.uid),
        analyticsService.getTimeSeriesData(user.uid, 'monthly', dateRange),
        analyticsService.getCategoryAnalysis(user.uid, dateRange)
      ])

      // Transform time series data for the chart
      const chartData = timeSeriesData.map(item => ({
        month: item.period.includes('-') ? 
          new Date(item.period + '-01').toLocaleDateString('en-US', { month: 'short' }) : 
          item.period,
        spent: item.expenses,
        income: item.income,
        net: item.net
      }))

      setInsights(financialInsights)
      setMonthlyData(chartData)
      setCategoryAnalysis(categoryData)
    } catch (err) {
      console.error('Error loading analytics:', err)
      setError('Failed to load analytics data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const generatePDFReport = async () => {
    if (!insights || !user) return

    const doc = new jsPDF()
    let yPosition = 20

    // Header
    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.text("Financial Report", 20, yPosition)
    yPosition += 10

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short', 
      year: 'numeric'
    })}`, 20, yPosition)
    doc.text(`Period: ${new Date(dateRange.start).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })} to ${new Date(dateRange.end).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })}`, 120, yPosition)
    yPosition += 15

    // Summary
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.text("Financial Summary", 20, yPosition)
    yPosition += 8

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text(`Current Month Income: ₹${insights.monthlyComparison.currentMonth.income.toLocaleString()}`, 20, yPosition)
    yPosition += 6
    doc.text(`Current Month Expenses: ₹${insights.monthlyComparison.currentMonth.expenses.toLocaleString()}`, 20, yPosition)
    yPosition += 6
    doc.text(`Net Income: ₹${insights.monthlyComparison.currentMonth.net.toLocaleString()}`, 20, yPosition)
    yPosition += 6
    doc.text(`Savings Rate: ${insights.savingsRate.toFixed(1)}%`, 20, yPosition)
    yPosition += 15

    // Top Categories
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.text("Top Spending Categories", 20, yPosition)
    yPosition += 8

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    insights.topSpendingCategories.slice(0, 5).forEach((category, i) => {
      doc.text(`${i + 1}. ${category.category}: ₹${category.totalAmount.toLocaleString()} (${category.percentage.toFixed(1)}%)`, 30, yPosition)
      yPosition += 6
    })
    yPosition += 10

    // Recommendations
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.text("Recommendations", 20, yPosition)
    yPosition += 8

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    insights.recommendations.forEach((recommendation, i) => {
      const lines = doc.splitTextToSize(recommendation, 170)
      lines.forEach((line: string) => {
        doc.text(`• ${line}`, 30, yPosition)
        yPosition += 6
      })
      yPosition += 2
    })

    doc.save(`financial-report-${dateRange.start}-to-${dateRange.end}.pdf`)
  }

  if (loading) {
    return (
      <main className="min-h-screen">
        <div className="w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
          <Sidebar />
          <section className="flex flex-col gap-6 min-w-0">
            <Skeleton className="h-16 w-full" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      <div className="w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        <Sidebar />
        <section className="flex flex-col gap-6 min-w-0">
          <header className="brut-border brut-shadow rounded-md p-4 bg-card">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="heading text-2xl md:text-3xl">Reports & Analytics</h1>
                <p className="text-muted-foreground">Detailed insights into your financial patterns</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex gap-3 items-end">
                  <div className="space-y-1">
                    <Label htmlFor="start-date" className="text-xs font-medium">From</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="brut-border text-xs w-[140px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="end-date" className="text-xs font-medium">To</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="brut-border text-xs w-[140px]"
                    />
                  </div>
                </div>
                
                <Button
                  onClick={generatePDFReport}
                  disabled={!insights}
                  className="brut-border brut-shadow"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>
          </header>

          {error && (
            <Alert className="brut-border border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          {/* Report Type Selector */}
          <Card className="p-4 brut-border brut-shadow">
            <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
              <SelectTrigger className="w-48 brut-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">📊 Overview</SelectItem>
                <SelectItem value="categories">🏷️ Categories</SelectItem>
                <SelectItem value="trends">📈 Trends</SelectItem>
              </SelectContent>
            </Select>
          </Card>

          {/* Overview Report */}
          {reportType === 'overview' && insights && (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 brut-border brut-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">Savings Rate</span>
                  </div>
                  <div className="text-2xl font-bold">{insights.savingsRate.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">
                    {insights.savingsRate > 20 ? 'Excellent' : insights.savingsRate > 10 ? 'Good' : 'Needs Improvement'}
                  </div>
                </Card>

                <Card className="p-4 brut-border brut-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">Daily Average</span>
                  </div>
                  <div className="text-2xl font-bold">₹{Math.round(insights.averageDailySpending)}</div>
                  <div className="text-xs text-muted-foreground">
                    Projected: ₹{Math.round(insights.projectedMonthlySpending)}/month
                  </div>
                </Card>

                <Card className="p-4 brut-border brut-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <PieChart className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium">Top Category</span>
                  </div>
                  <div className="text-lg font-bold">
                    {insights.topSpendingCategories[0]?.category || 'None'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {insights.topSpendingCategories[0]?.percentage.toFixed(1)}% of expenses
                  </div>
                </Card>

                <Card className="p-4 brut-border brut-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium">Month Growth</span>
                  </div>
                  <div className={`text-2xl font-bold ${insights.monthlyComparison.growth.net > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {insights.monthlyComparison.growth.net > 0 ? '+' : ''}{insights.monthlyComparison.growth.net.toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Net income change</div>
                </Card>
              </div>

              {/* Main Chart - Full Width */}
              <div className="w-full">
                <MonthlySpendingChart data={monthlyData} />
              </div>

              {/* Secondary Charts */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <CategoryPieChart 
                  data={categoryAnalysis.map(cat => ({
                    category: cat.category,
                    amount: cat.totalAmount,
                    percentage: cat.percentage
                  }))}
                />
                <SpendingTrendsChart 
                  data={insights.spendingTrends.map(trend => ({
                    category: trend.category,
                    currentMonth: trend.currentMonth,
                    previousMonth: trend.previousMonth,
                    change: trend.changeAmount
                  }))}
                />
                
                {/* AI Insights */}
                <Card className="p-4 brut-border brut-shadow">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-5 h-5" />
                    <h3 className="heading text-lg">AI Insights</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {insights.recommendations.map((recommendation, index) => (
                      <div key={index} className="p-3 bg-accent/20 rounded border-l-4 border-primary">
                        <p className="text-sm">{recommendation}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-3 border-t border-border">
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current Month Net:</span>
                        <span className="font-medium">₹{insights.monthlyComparison.currentMonth.net.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Previous Month Net:</span>
                        <span className="font-medium">₹{insights.monthlyComparison.previousMonth.net.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </>
          )}

          {/* Category Analysis */}
          {reportType === 'categories' && (
            <Card className="p-4 brut-border brut-shadow">
              <h3 className="heading text-lg mb-4">Category Breakdown</h3>
              <div className="space-y-3">
                {categoryAnalysis.map((category, index) => (
                  <div key={category.category} className="flex items-center justify-between p-3 bg-accent/20 rounded">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{category.category}</span>
                        <span className="text-sm">
                          {AnalyticsService.getTrendIcon(category.trend)}
                          ₹{category.totalAmount.toLocaleString()}
                        </span>
                      </div>
                      <Progress value={category.percentage} className="h-2 mb-1" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{category.transactionCount} transactions</span>
                        <span>{category.percentage.toFixed(1)}% of total</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Spending Trends */}
          {reportType === 'trends' && insights && (
            <Card className="p-4 brut-border brut-shadow">
              <h3 className="heading text-lg mb-4">Spending Trends</h3>
              <div className="space-y-3">
                {insights.spendingTrends.map((trend, index) => (
                  <div key={trend.category} className="flex items-center justify-between p-3 bg-accent/20 rounded">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{AnalyticsService.getTrendIcon(trend.trend)}</span>
                      <div>
                        <div className="font-medium">{trend.category}</div>
                        <div className="text-sm text-muted-foreground">
                          ₹{trend.previousMonth.toLocaleString()} → ₹{trend.currentMonth.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${AnalyticsService.getTrendColor(trend.trend)}`}>
                        {trend.changePercentage > 0 ? '+' : ''}{trend.changePercentage.toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {trend.changeAmount > 0 ? '+' : ''}₹{Math.abs(trend.changeAmount).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </section>
      </div>
    </main>
  )
}

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <ReportsContent />
    </ProtectedRoute>
  )
}
