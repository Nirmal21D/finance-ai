/**
 * Financial Health Scoring Service
 * TypeScript service for consuming health scoring APIs from the Python backend
 */

// Type definitions
export interface Transaction {
  date: string // YYYY-MM-DD format
  amount: number // positive for income, negative for expenses
  category: string
  description?: string
}

export interface Budget {
  category: string
  monthlyLimit: number
  currentSpent: number
  alertThreshold: number
}

export interface FinancialGoal {
  title: string
  targetAmount: number
  currentAmount: number
  deadline?: string // YYYY-MM-DD format
}

export interface HealthMetric {
  name: string
  score: number // 0-100
  weight: number
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical' | 'unknown'
  description: string
  recommendation: string
  current_value?: number
  target_value?: number
  trend?: 'improving' | 'stable' | 'declining'
}

export interface FinancialHealthScore {
  overall_score: number // 0-100
  grade: string // A+, A, B, C, D, F
  last_calculated: string
  
  // Individual metric scores
  emergency_fund_score: HealthMetric
  debt_to_income_score: HealthMetric
  savings_rate_score: HealthMetric
  spending_stability_score: HealthMetric
  budget_adherence_score: HealthMetric
  investment_diversification_score: HealthMetric
  
  // Insights
  strengths: string[]
  weaknesses: string[]
  priority_actions: string[]
  risk_factors: string[]
  
  // Trends and predictions
  score_trend: 'improving' | 'stable' | 'declining'
  predicted_3_month_score?: number
  financial_goals_on_track: number
  peer_percentile?: number
}

export interface HealthInsights {
  score_breakdown: {
    emergency_fund: number
    debt_management: number
    savings_discipline: number
    spending_control: number
    budget_planning: number
    investment_growth: number
  }
  improvement_potential: number
  next_grade_threshold: {
    next_grade?: string
    points_needed?: number
    percentage_improvement?: number
    message?: string
  }
  financial_wellness_tips: string[]
  recommended_tools: Array<{
    name: string
    purpose: string
    priority: 'high' | 'medium' | 'low'
  }>
}

export interface QuickHealthCheck {
  overall_score: number
  grade: string
  status_color: 'green' | 'yellow' | 'orange' | 'red'
  summary_message: string
  top_priority: string
  score_change?: number
}

export interface HealthComparison {
  user_score: number
  peer_percentile: number
  score_distribution: { [range: string]: number }
  improvement_suggestions: string[]
}

export interface CategoryBenchmark {
  category: string
  benchmarks: {
    excellent: string
    good: string
    fair: string
    poor: string
    critical: string
  }
  description: string
}

export class FinancialHealthService {
  private static instance: FinancialHealthService
  private baseUrl: string
  private timeout: number

  constructor() {
    // Use environment variable or default to localhost:8000
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    this.timeout = 30000 // 30 seconds
  }

  static getInstance(): FinancialHealthService {
    if (!FinancialHealthService.instance) {
      FinancialHealthService.instance = new FinancialHealthService()
    }
    return FinancialHealthService.instance
  }

  /**
   * Calculate comprehensive financial health score
   */
  async calculateHealthScore(
    transactions: Transaction[],
    budgets: Budget[] = [],
    goals: FinancialGoal[] = []
  ): Promise<FinancialHealthScore | null> {
    try {
      console.log(`🏥 Calculating health score with ${transactions.length} transactions`)

      const response = await fetch(`${this.baseUrl}/api/health/calculate-score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactions,
          budgets,
          goals
        }),
        signal: AbortSignal.timeout(this.timeout)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Health score calculation failed: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      console.log(`✅ Health score calculated: ${result.overall_score}% (${result.grade})`)
      
      return result

    } catch (error) {
      console.error('❌ Failed to calculate health score:', error)
      return null
    }
  }

  /**
   * Get quick health assessment
   */
  async getQuickHealthCheck(
    transactions: Transaction[],
    budgets: Budget[] = []
  ): Promise<QuickHealthCheck | null> {
    try {
      console.log(`⚡ Quick health check with ${transactions.length} transactions`)

      const response = await fetch(`${this.baseUrl}/api/health/quick-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactions,
          budgets,
          goals: []
        }),
        signal: AbortSignal.timeout(this.timeout)
      })

      if (!response.ok) {
        throw new Error(`Quick health check failed: ${response.status}`)
      }

      const result = await response.json()
      console.log(`⚡ Quick check: ${result.overall_score}% - ${result.summary_message}`)
      
      return result

    } catch (error) {
      console.error('❌ Failed to get quick health check:', error)
      return null
    }
  }

  /**
   * Get detailed health insights and recommendations
   */
  async getHealthInsights(
    transactions: Transaction[],
    budgets: Budget[] = [],
    goals: FinancialGoal[] = []
  ): Promise<HealthInsights | null> {
    try {
      console.log(`🔍 Getting health insights for detailed analysis`)

      const response = await fetch(`${this.baseUrl}/api/health/insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactions,
          budgets,
          goals
        }),
        signal: AbortSignal.timeout(this.timeout)
      })

      if (!response.ok) {
        throw new Error(`Health insights failed: ${response.status}`)
      }

      const result = await response.json()
      console.log(`🔍 Generated ${result.financial_wellness_tips.length} tips, ${result.recommended_tools.length} tool recommendations`)
      
      return result

    } catch (error) {
      console.error('❌ Failed to get health insights:', error)
      return null
    }
  }

  /**
   * Compare health score with peers
   */
  async compareHealthScore(
    transactions: Transaction[],
    budgets: Budget[] = []
  ): Promise<HealthComparison | null> {
    try {
      console.log(`📊 Comparing health score with peers`)

      const response = await fetch(`${this.baseUrl}/api/health/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactions,
          budgets,
          goals: []
        }),
        signal: AbortSignal.timeout(this.timeout)
      })

      if (!response.ok) {
        throw new Error(`Health comparison failed: ${response.status}`)
      }

      const result = await response.json()
      console.log(`📊 Peer comparison: ${result.peer_percentile}th percentile`)
      
      return result

    } catch (error) {
      console.error('❌ Failed to compare health score:', error)
      return null
    }
  }

  /**
   * Get benchmarks for a specific category
   */
  async getCategoryBenchmark(category: string): Promise<CategoryBenchmark | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health/benchmark/${encodeURIComponent(category)}`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.timeout)
      })

      if (!response.ok) {
        throw new Error(`Benchmark request failed: ${response.status}`)
      }

      return await response.json()

    } catch (error) {
      console.error(`❌ Failed to get benchmark for ${category}:`, error)
      return null
    }
  }

  /**
   * Get demo health score for testing
   */
  async getDemoHealthScore(): Promise<FinancialHealthScore | null> {
    try {
      console.log(`🎭 Getting demo health score`)

      const response = await fetch(`${this.baseUrl}/api/health/demo-score`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.timeout)
      })

      if (!response.ok) {
        throw new Error(`Demo health score failed: ${response.status}`)
      }

      const result = await response.json()
      console.log(`🎭 Demo score: ${result.overall_score}% (${result.grade})`)
      
      return result

    } catch (error) {
      console.error('❌ Failed to get demo health score:', error)
      return null
    }
  }

  /**
   * Check if health scoring service is available
   */
  async isServiceAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })

      return response.ok

    } catch (error) {
      console.error('Health scoring service unavailable:', error)
      return false
    }
  }

  /**
   * Convert transaction data from Firebase format
   */
  static convertTransactionsFromFirebase(firebaseTransactions: any[]): Transaction[] {
    return firebaseTransactions.map(tx => ({
      date: tx.date || new Date().toISOString().split('T')[0],
      amount: tx.type === 'expense' ? -Math.abs(tx.amount || 0) : Math.abs(tx.amount || 0),
      category: tx.category || 'Other',
      description: tx.note || tx.description || ''
    }))
  }

  /**
   * Convert budget data from Firebase format
   */
  static convertBudgetsFromFirebase(firebaseBudgets: any[]): Budget[] {
    return firebaseBudgets.map(budget => ({
      category: budget.category || '',
      monthlyLimit: budget.monthlyLimit || 0,
      currentSpent: budget.currentSpent || 0,
      alertThreshold: budget.alertThreshold || 80
    }))
  }

  /**
   * Convert goals from Firebase format
   */
  static convertGoalsFromFirebase(firebaseGoals: any[]): FinancialGoal[] {
    return firebaseGoals.map(goal => ({
      title: goal.title || '',
      targetAmount: goal.targetAmount || 0,
      currentAmount: goal.currentAmount || 0,
      deadline: goal.deadline || undefined
    }))
  }

  /**
   * Get color for health score display
   */
  static getScoreColor(score: number): string {
    if (score >= 85) return 'text-green-600'
    if (score >= 70) return 'text-blue-600'
    if (score >= 55) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  /**
   * Get background color for health score display
   */
  static getScoreBackgroundColor(score: number): string {
    if (score >= 85) return 'bg-green-50'
    if (score >= 70) return 'bg-blue-50'
    if (score >= 55) return 'bg-yellow-50'
    if (score >= 40) return 'bg-orange-50'
    return 'bg-red-50'
  }

  /**
   * Get emoji for health grade
   */
  static getGradeEmoji(grade: string): string {
    switch (grade) {
      case 'A+': return '🏆'
      case 'A': return '🌟'
      case 'B': return '👍'
      case 'C': return '⚡'
      case 'D': return '⚠️'
      case 'F': return '🚨'
      default: return '📊'
    }
  }

  /**
   * Get status emoji for metric status
   */
  static getStatusEmoji(status: string): string {
    switch (status) {
      case 'excellent': return '🟢'
      case 'good': return '🔵'
      case 'fair': return '🟡'
      case 'poor': return '🟠'
      case 'critical': return '🔴'
      default: return '⚪'
    }
  }

  /**
   * Format currency values
   */
  static formatCurrency(amount: number, currency: string = 'INR'): string {
    if (currency === 'INR') {
      return `₹${Math.abs(amount).toLocaleString('en-IN')}`
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(Math.abs(amount))
  }

  /**
   * Format percentage values
   */
  static formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`
  }

  /**
   * Get trend arrow for display
   */
  static getTrendArrow(trend: string): string {
    switch (trend) {
      case 'improving': return '↗️'
      case 'declining': return '↘️'
      case 'stable': return '➡️'
      default: return '📊'
    }
  }
}

// Export singleton instance
export const financialHealthService = FinancialHealthService.getInstance()