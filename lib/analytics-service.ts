import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  Timestamp,
  limit
} from "firebase/firestore"
import { getFirebase } from "@/lib/firebase"
import { TransactionService, type Transaction } from "@/lib/transaction-service"
import { GoalService } from "@/lib/goal-service"

export interface CategoryAnalysis {
  category: string
  totalAmount: number
  transactionCount: number
  percentage: number
  averageTransaction: number
  trend: 'up' | 'down' | 'stable'
  monthlyAverage: number
}

export interface TimeSeriesData {
  period: string
  income: number
  expenses: number
  net: number
  transactionCount: number
}

export interface SpendingTrend {
  category: string
  currentMonth: number
  previousMonth: number
  changeAmount: number
  changePercentage: number
  trend: 'up' | 'down' | 'stable'
}

export interface FinancialInsights {
  topSpendingCategories: CategoryAnalysis[]
  spendingTrends: SpendingTrend[]
  monthlyComparison: {
    currentMonth: { income: number; expenses: number; net: number }
    previousMonth: { income: number; expenses: number; net: number }
    growth: { income: number; expenses: number; net: number }
  }
  averageDailySpending: number
  projectedMonthlySpending: number
  savingsRate: number
  recommendations: string[]
}

export interface DateRange {
  start: string // YYYY-MM-DD
  end: string   // YYYY-MM-DD
}

export class AnalyticsService {
  private static instance: AnalyticsService
  private db = getFirebase().db

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService()
    }
    return AnalyticsService.instance
  }

  async getTransactionsInRange(userId: string, dateRange: DateRange): Promise<Transaction[]> {
    if (!this.db) throw new Error("Firestore not initialized")

    const transactionsRef = collection(this.db, "transactions")
    const q = query(
      transactionsRef,
      where("userId", "==", userId),
      // Note: Would need composite index for date range queries
      // For now, we'll filter client-side
    )

    const snapshot = await getDocs(q)
    const allTransactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Transaction))

    // Filter by date range client-side
    return allTransactions.filter(transaction => {
      const transactionDate = transaction.date
      return transactionDate >= dateRange.start && transactionDate <= dateRange.end
    })
  }

  async getCategoryAnalysis(userId: string, dateRange?: DateRange): Promise<CategoryAnalysis[]> {
    const transactions = dateRange 
      ? await this.getTransactionsInRange(userId, dateRange)
      : await TransactionService.getInstance().getUserTransactions(userId)

    const expenses = transactions.filter(t => t.type === 'expense')
    const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0)

    if (totalExpenses === 0) return []

    const categoryStats: Record<string, {
      total: number
      count: number
      transactions: Transaction[]
    }> = {}

    expenses.forEach(transaction => {
      const category = transaction.category || 'Other'
      const amount = Math.abs(transaction.amount)
      
      if (!categoryStats[category]) {
        categoryStats[category] = { total: 0, count: 0, transactions: [] }
      }
      
      categoryStats[category].total += amount
      categoryStats[category].count += 1
      categoryStats[category].transactions.push(transaction)
    })

    const analysis: CategoryAnalysis[] = Object.entries(categoryStats).map(([category, stats]) => {
      const percentage = (stats.total / totalExpenses) * 100
      const averageTransaction = stats.total / stats.count

      // Calculate trend (simplified - comparing first half vs second half of period)
      const midpoint = Math.floor(stats.transactions.length / 2)
      const firstHalf = stats.transactions.slice(0, midpoint)
      const secondHalf = stats.transactions.slice(midpoint)
      
      const firstHalfAvg = firstHalf.length > 0 
        ? firstHalf.reduce((sum, t) => sum + Math.abs(t.amount), 0) / firstHalf.length 
        : 0
      const secondHalfAvg = secondHalf.length > 0 
        ? secondHalf.reduce((sum, t) => sum + Math.abs(t.amount), 0) / secondHalf.length 
        : 0

      let trend: 'up' | 'down' | 'stable' = 'stable'
      if (secondHalfAvg > firstHalfAvg * 1.1) trend = 'up'
      else if (secondHalfAvg < firstHalfAvg * 0.9) trend = 'down'

      // Monthly average (assuming data spans multiple months)
      const monthlyAverage = stats.total / Math.max(1, this.getMonthCount(stats.transactions))

      return {
        category,
        totalAmount: stats.total,
        transactionCount: stats.count,
        percentage,
        averageTransaction,
        trend,
        monthlyAverage
      }
    })

    return analysis.sort((a, b) => b.totalAmount - a.totalAmount)
  }

  async getTimeSeriesData(userId: string, period: 'daily' | 'weekly' | 'monthly' = 'monthly', dateRange?: DateRange): Promise<TimeSeriesData[]> {
    const transactions = dateRange 
      ? await this.getTransactionsInRange(userId, dateRange)
      : await TransactionService.getInstance().getUserTransactions(userId)

    const groupedData: Record<string, {
      income: number
      expenses: number
      transactionCount: number
    }> = {}

    transactions.forEach(transaction => {
      const date = new Date(transaction.date)
      let periodKey: string

      switch (period) {
        case 'daily':
          periodKey = transaction.date
          break
        case 'weekly':
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          periodKey = weekStart.toISOString().split('T')[0]
          break
        case 'monthly':
        default:
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          break
      }

      if (!groupedData[periodKey]) {
        groupedData[periodKey] = { income: 0, expenses: 0, transactionCount: 0 }
      }

      if (transaction.type === 'income') {
        groupedData[periodKey].income += Math.abs(transaction.amount)
      } else {
        groupedData[periodKey].expenses += Math.abs(transaction.amount)
      }
      groupedData[periodKey].transactionCount += 1
    })

    return Object.entries(groupedData)
      .map(([period, data]) => ({
        period,
        income: data.income,
        expenses: data.expenses,
        net: data.income - data.expenses,
        transactionCount: data.transactionCount
      }))
      .sort((a, b) => a.period.localeCompare(b.period))
  }

  async getSpendingTrends(userId: string): Promise<SpendingTrend[]> {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const previousMonth = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`

    const currentMonthRange: DateRange = {
      start: `${currentMonth}-01`,
      end: `${currentMonth}-31`
    }

    const previousMonthRange: DateRange = {
      start: `${previousMonth}-01`, 
      end: `${previousMonth}-31`
    }

    const [currentAnalysis, previousAnalysis] = await Promise.all([
      this.getCategoryAnalysis(userId, currentMonthRange),
      this.getCategoryAnalysis(userId, previousMonthRange)
    ])

    const trends: SpendingTrend[] = []
    const categories = new Set([
      ...currentAnalysis.map(a => a.category),
      ...previousAnalysis.map(a => a.category)
    ])

    categories.forEach(category => {
      const current = currentAnalysis.find(a => a.category === category)
      const previous = previousAnalysis.find(a => a.category === category)

      const currentAmount = current?.totalAmount || 0
      const previousAmount = previous?.totalAmount || 0
      const changeAmount = currentAmount - previousAmount
      const changePercentage = previousAmount > 0 ? (changeAmount / previousAmount) * 100 : 0

      let trend: 'up' | 'down' | 'stable' = 'stable'
      if (Math.abs(changePercentage) > 10) {
        trend = changePercentage > 0 ? 'up' : 'down'
      }

      trends.push({
        category,
        currentMonth: currentAmount,
        previousMonth: previousAmount,
        changeAmount,
        changePercentage,
        trend
      })
    })

    return trends.sort((a, b) => Math.abs(b.changePercentage) - Math.abs(a.changePercentage))
  }

  async getFinancialInsights(userId: string): Promise<FinancialInsights> {
    const [categoryAnalysis, spendingTrends, transactionService] = await Promise.all([
      this.getCategoryAnalysis(userId),
      this.getSpendingTrends(userId),
      TransactionService.getInstance().getFinancialSummary(userId)
    ])

    const now = new Date()
    const currentMonthTransactions = await this.getTransactionsInRange(userId, {
      start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
      end: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`
    })

    const previousMonthTransactions = await this.getTransactionsInRange(userId, {
      start: `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}-01`,
      end: `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}-31`
    })

    const currentMonthIncome = currentMonthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const currentMonthExpenses = currentMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const currentMonthNet = currentMonthIncome - currentMonthExpenses

    const previousMonthIncome = previousMonthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const previousMonthExpenses = previousMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const previousMonthNet = previousMonthIncome - previousMonthExpenses

    const averageDailySpending = currentMonthExpenses / now.getDate()
    const projectedMonthlySpending = averageDailySpending * 30
    const savingsRate = currentMonthIncome > 0 ? (currentMonthNet / currentMonthIncome) * 100 : 0

    // Generate recommendations
    const recommendations = this.generateRecommendations(categoryAnalysis, spendingTrends, savingsRate)

    return {
      topSpendingCategories: categoryAnalysis.slice(0, 5),
      spendingTrends: spendingTrends.slice(0, 10),
      monthlyComparison: {
        currentMonth: { income: currentMonthIncome, expenses: currentMonthExpenses, net: currentMonthNet },
        previousMonth: { income: previousMonthIncome, expenses: previousMonthExpenses, net: previousMonthNet },
        growth: {
          income: ((currentMonthIncome - previousMonthIncome) / Math.max(previousMonthIncome, 1)) * 100,
          expenses: ((currentMonthExpenses - previousMonthExpenses) / Math.max(previousMonthExpenses, 1)) * 100,
          net: ((currentMonthNet - previousMonthNet) / Math.max(Math.abs(previousMonthNet), 1)) * 100
        }
      },
      averageDailySpending,
      projectedMonthlySpending,
      savingsRate,
      recommendations
    }
  }

  private getMonthCount(transactions: Transaction[]): number {
    if (transactions.length === 0) return 1
    
    const dates = transactions.map(t => new Date(t.date))
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
    
    const monthDiff = (maxDate.getFullYear() - minDate.getFullYear()) * 12 + 
                     (maxDate.getMonth() - minDate.getMonth()) + 1
    
    return Math.max(1, monthDiff)
  }

  private generateRecommendations(categoryAnalysis: CategoryAnalysis[], spendingTrends: SpendingTrend[], savingsRate: number): string[] {
    const recommendations: string[] = []

    // Savings rate recommendations
    if (savingsRate < 10) {
      recommendations.push("Consider increasing your savings rate. Aim for at least 10-20% of your income.")
    } else if (savingsRate > 30) {
      recommendations.push("Excellent savings rate! Consider investing your surplus for long-term growth.")
    }

    // Category-based recommendations
    const topCategory = categoryAnalysis[0]
    if (topCategory && topCategory.percentage > 40) {
      recommendations.push(`Your ${topCategory.category} spending is ${topCategory.percentage.toFixed(1)}% of total expenses. Consider budgeting or finding ways to reduce this category.`)
    }

    // Trend-based recommendations
    const increasingTrends = spendingTrends.filter(t => t.trend === 'up' && Math.abs(t.changePercentage) > 20)
    if (increasingTrends.length > 0) {
      const topIncrease = increasingTrends[0]
      recommendations.push(`Your ${topIncrease.category} spending increased by ${topIncrease.changePercentage.toFixed(1)}% this month. Monitor this category closely.`)
    }

    // Default recommendations if none generated
    if (recommendations.length === 0) {
      recommendations.push("Your spending patterns look stable. Consider setting up automatic savings to build your emergency fund.")
    }

    return recommendations.slice(0, 3) // Limit to top 3 recommendations
  }

  // Helper method to format currency
  static formatCurrency(amount: number): string {
    return `₹${Math.abs(amount).toLocaleString()}`
  }

  // Helper method to get trend color
  static getTrendColor(trend: 'up' | 'down' | 'stable'): string {
    switch (trend) {
      case 'up': return 'text-red-600'
      case 'down': return 'text-green-600'
      case 'stable': return 'text-gray-600'
    }
  }

  // Helper method to get trend icon
  static getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
    switch (trend) {
      case 'up': return '📈'
      case 'down': return '📉'
      case 'stable': return '➖'
    }
  }
}