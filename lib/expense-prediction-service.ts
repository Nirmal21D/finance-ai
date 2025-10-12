/**
 * Expense Prediction Service
 * Integrates with Python ML server for expense forecasting and pattern analysis
 */

export interface Transaction {
  date: string // YYYY-MM-DD format
  amount: number // negative for expenses, positive for income
  category: string
  description: string
}

export interface MonthlyPrediction {
  predicted_amount: number
  confidence: number
  trend: 'increasing' | 'decreasing' | 'stable'
  seasonal_factor: number
  historical_average: number
  prediction_range: [number, number]
  target_month: string
}

export interface CategoryPrediction {
  category: string
  predicted_amount: number
  confidence: number
  trend: 'increasing' | 'decreasing' | 'stable'
  percentage_of_total: number
}

export interface CategoryPredictions {
  predictions: CategoryPrediction[]
  total_predicted: number
  target_month: string
}

export interface SpendingPatterns {
  overall_trend: {
    slope: number
    direction: 'increasing' | 'decreasing' | 'stable'
    monthly_average: number
    monthly_std: number
  }
  category_patterns: {
    [category: string]: {
      monthly_average: number
      monthly_std: number
      total_transactions: number
      percentage_of_total: number
    }
  }
  seasonal_patterns: { [month: number]: number }
  weekly_patterns: { [day: number]: number }
}

export interface ModelTrainingResult {
  success: boolean
  model_scores: { [model: string]: any }
  best_model: string
  training_samples: number
  message: string
}

export class ExpensePredictionService {
  private static instance: ExpensePredictionService
  private baseUrl: string
  private timeout: number

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_ML_SERVER_URL || 'http://localhost:8000'
    this.timeout = 30000 // 30 seconds for ML operations
  }

  static getInstance(): ExpensePredictionService {
    if (!ExpensePredictionService.instance) {
      ExpensePredictionService.instance = new ExpensePredictionService()
    }
    return ExpensePredictionService.instance
  }

  /**
   * Predict total expenses for next month
   */
  async predictMonthlyExpenses(
    transactions: Transaction[],
    targetMonth?: string
  ): Promise<MonthlyPrediction | null> {
    try {
      console.log(`Predicting monthly expenses with ${transactions.length} transactions`)

      const response = await fetch(`${this.baseUrl}/api/predictions/predict-month`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactions,
          target_month: targetMonth
        }),
        signal: AbortSignal.timeout(this.timeout)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Prediction failed: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      console.log(`Monthly prediction: ₹${result.predicted_amount.toLocaleString()} for ${result.target_month}`)
      
      return result

    } catch (error) {
      console.error('Failed to predict monthly expenses:', error)
      return null
    }
  }

  /**
   * Predict expenses by category
   */
  async predictCategoryExpenses(
    transactions: Transaction[],
    targetMonth?: string
  ): Promise<CategoryPredictions | null> {
    try {
      console.log(`Predicting category expenses with ${transactions.length} transactions`)

      const response = await fetch(`${this.baseUrl}/api/predictions/predict-categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactions,
          target_month: targetMonth
        }),
        signal: AbortSignal.timeout(this.timeout)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Category prediction failed: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      console.log(`Category predictions: ${result.predictions.length} categories, total ₹${result.total_predicted.toLocaleString()}`)
      
      return result

    } catch (error) {
      console.error('Failed to predict category expenses:', error)
      return null
    }
  }

  /**
   * Analyze spending patterns and trends
   */
  async analyzeSpendingPatterns(transactions: Transaction[]): Promise<SpendingPatterns | null> {
    try {
      console.log(`Analyzing spending patterns with ${transactions.length} transactions`)

      const response = await fetch(`${this.baseUrl}/api/predictions/analyze-patterns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactions
        }),
        signal: AbortSignal.timeout(this.timeout)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Pattern analysis failed: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      console.log('Spending pattern analysis completed')
      
      return result

    } catch (error) {
      console.error('Failed to analyze spending patterns:', error)
      return null
    }
  }

  /**
   * Train prediction models with user data
   */
  async trainModels(transactions: Transaction[]): Promise<ModelTrainingResult | null> {
    try {
      console.log(`Training models with ${transactions.length} transactions`)

      const response = await fetch(`${this.baseUrl}/api/predictions/train-models`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactions
        }),
        signal: AbortSignal.timeout(60000) // 60 seconds for training
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Model training failed: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      console.log(`Model training completed: ${result.message}`)
      
      return result

    } catch (error) {
      console.error('Failed to train models:', error)
      return null
    }
  }

  /**
   * Get demo prediction with synthetic data
   */
  async getDemoPrediction(): Promise<any | null> {
    try {
      console.log('Getting demo prediction with synthetic data')

      const response = await fetch(`${this.baseUrl}/api/predictions/demo-prediction`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.timeout)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Demo prediction failed: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      console.log('Demo prediction retrieved successfully')
      
      return result

    } catch (error) {
      console.error('Failed to get demo prediction:', error)
      return null
    }
  }

  /**
   * Get model information
   */
  async getModelInfo(): Promise<any | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/predictions/model-info`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Model info failed: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      return result

    } catch (error) {
      console.error('Failed to get model info:', error)
      return null
    }
  }

  /**
   * Convert Firebase transactions to the format expected by prediction service
   */
  convertFirebaseTransactions(firebaseTransactions: any[]): Transaction[] {
    return firebaseTransactions.map(txn => ({
      date: this.formatDate(txn.date || txn.createdAt || new Date()),
      amount: typeof txn.amount === 'number' ? txn.amount : parseFloat(txn.amount) || 0,
      category: txn.category || 'Other Expense',
      description: txn.note || txn.description || 'Transaction'
    }))
  }

  /**
   * Format date to YYYY-MM-DD string
   */
  private formatDate(date: any): string {
    if (typeof date === 'string') {
      return date.split('T')[0] // Remove time part if present
    }
    
    if (date?.toDate) {
      // Firebase Timestamp
      return date.toDate().toISOString().split('T')[0]
    }
    
    if (date instanceof Date) {
      return date.toISOString().split('T')[0]
    }
    
    // Fallback to current date
    return new Date().toISOString().split('T')[0]
  }

  /**
   * Format currency amount for display
   */
  formatCurrency(amount: number, symbol: string = '₹'): string {
    return `${symbol}${Math.abs(amount).toLocaleString('en-IN', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    })}`
  }

  /**
   * Get trend emoji for display
   */
  getTrendEmoji(trend: string): string {
    switch (trend) {
      case 'increasing': return '📈'
      case 'decreasing': return '📉'
      case 'stable': return '📊'
      default: return '📊'
    }
  }

  /**
   * Get confidence color for UI
   */
  getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  /**
   * Check if prediction service is available
   */
  async isServiceAvailable(): Promise<boolean> {
    try {
      const modelInfo = await this.getModelInfo()
      return modelInfo !== null
    } catch {
      return false
    }
  }

  /**
   * Get next month string (YYYY-MM format)
   */
  getNextMonth(): string {
    const date = new Date()
    date.setMonth(date.getMonth() + 1)
    return date.toISOString().slice(0, 7) // YYYY-MM
  }

  /**
   * Get month name from YYYY-MM string
   */
  getMonthName(monthString: string): string {
    try {
      const date = new Date(monthString + '-01')
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    } catch {
      return monthString
    }
  }
}

// Export singleton instance
export const expensePredictionService = ExpensePredictionService.getInstance()