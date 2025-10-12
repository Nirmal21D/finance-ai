/**
 * ML Service for transaction categorization
 * Communicates with Python FastAPI ML server
 */

export interface TransactionInput {
  description: string
  amount: number
}

export interface CategoryPrediction {
  predicted_category: string
  confidence: number
  success: boolean
  error?: string
}

export interface BatchPredictionResponse {
  results: CategoryPrediction[]
  total_processed: number
  successful_predictions: number
}

export class MLService {
  private static instance: MLService
  private baseUrl: string
  private timeout: number

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_ML_SERVER_URL || 'http://localhost:8000'
    this.timeout = 10000 // 10 seconds
  }

  static getInstance(): MLService {
    if (!MLService.instance) {
      MLService.instance = new MLService()
    }
    return MLService.instance
  }

  /**
   * Categorize a single transaction using ML model
   */
  async categorizeTransaction(description: string, amount: number): Promise<CategoryPrediction> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ml/categorize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description,
          amount
        }),
        signal: AbortSignal.timeout(this.timeout)
      })

      if (!response.ok) {
        throw new Error(`ML server responded with ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      return result as CategoryPrediction

    } catch (error) {
      console.error('Failed to categorize transaction with ML:', error)
      
      // Fallback to simple rule-based categorization
      return {
        predicted_category: this.fallbackCategorization(description, amount),
        confidence: 0.5,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Categorize multiple transactions in batch
   */
  async categorizeTransactionsBatch(transactions: TransactionInput[]): Promise<BatchPredictionResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ml/categorize-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactions
        }),
        signal: AbortSignal.timeout(this.timeout * 2) // Longer timeout for batch
      })

      if (!response.ok) {
        throw new Error(`ML server responded with ${response.status}: ${response.statusText}`)
      }

      return await response.json()

    } catch (error) {
      console.error('Failed to batch categorize transactions:', error)
      
      // Fallback to individual processing
      const results = transactions.map(transaction => ({
        predicted_category: this.fallbackCategorization(transaction.description, transaction.amount),
        confidence: 0.5,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))

      return {
        results,
        total_processed: transactions.length,
        successful_predictions: 0
      }
    }
  }

  /**
   * Get available categories from ML model
   */
  async getAvailableCategories(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ml/categories`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.statusText}`)
      }

      const data = await response.json()
      return data.categories || this.getDefaultCategories()

    } catch (error) {
      console.error('Failed to fetch categories from ML server:', error)
      return this.getDefaultCategories()
    }
  }

  /**
   * Provide feedback to improve ML model
   */
  async provideFeedback(
    description: string, 
    amount: number, 
    correctCategory: string, 
    userId: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ml/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description,
          amount,
          correct_category: correctCategory,
          user_id: userId
        })
      })

      return response.ok

    } catch (error) {
      console.error('Failed to provide ML feedback:', error)
      return false
    }
  }

  /**
   * Check ML server health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ml/health`, {
        signal: AbortSignal.timeout(5000) // Quick health check
      })
      
      return response.ok

    } catch (error) {
      console.error('ML server health check failed:', error)
      return false
    }
  }

  /**
   * Get ML model information
   */
  async getModelInfo(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ml/model-info`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch model info: ${response.statusText}`)
      }

      return await response.json()

    } catch (error) {
      console.error('Failed to fetch model info:', error)
      return { status: 'unavailable' }
    }
  }

  /**
   * Fallback rule-based categorization when ML server is unavailable
   */
  private fallbackCategorization(description: string, amount: number): string {
    if (!description) return 'Other Expense'

    const desc = description.toLowerCase()
    
    // Income detection
    if (amount > 0 || desc.includes('salary') || desc.includes('income') || desc.includes('credit')) {
      return 'Income'
    }

    // Rule-based categorization
    if (desc.includes('swiggy') || desc.includes('zomato') || desc.includes('restaurant') || 
        desc.includes('food') || desc.includes('dining') || desc.includes('pizza')) {
      return 'Food & Dining'
    }

    if (desc.includes('uber') || desc.includes('ola') || desc.includes('metro') || 
        desc.includes('petrol') || desc.includes('fuel') || desc.includes('transport')) {
      return 'Transportation'
    }

    if (desc.includes('amazon') || desc.includes('flipkart') || desc.includes('shopping') || 
        desc.includes('mall') || desc.includes('store')) {
      return 'Shopping'
    }

    if (desc.includes('electricity') || desc.includes('water') || desc.includes('gas') || 
        desc.includes('internet') || desc.includes('phone') || desc.includes('bill')) {
      return 'Bills & Utilities'
    }

    if (desc.includes('grocery') || desc.includes('supermarket') || desc.includes('vegetables') || 
        desc.includes('dmart') || desc.includes('market')) {
      return 'Groceries'
    }

    if (desc.includes('doctor') || desc.includes('hospital') || desc.includes('medical') || 
        desc.includes('pharmacy') || desc.includes('health')) {
      return 'Healthcare'
    }

    if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('movie') || 
        desc.includes('entertainment') || desc.includes('game')) {
      return 'Entertainment'
    }

    if (desc.includes('rent') || desc.includes('rental')) {
      return 'Rent'
    }

    if (desc.includes('insurance')) {
      return 'Insurance'
    }

    if (desc.includes('education') || desc.includes('course') || desc.includes('school')) {
      return 'Education'
    }

    if (desc.includes('travel') || desc.includes('flight') || desc.includes('hotel') || desc.includes('trip')) {
      return 'Travel'
    }

    return 'Other Expense'
  }

  /**
   * Get default categories when ML server is unavailable
   */
  private getDefaultCategories(): string[] {
    return [
      'Food & Dining',
      'Shopping',
      'Transportation',
      'Bills & Utilities',
      'Healthcare',
      'Entertainment',
      'Education',
      'Travel',
      'Insurance',
      'Groceries',
      'Rent',
      'Income',
      'Investment',
      'Other Expense'
    ]
  }

  /**
   * Check if ML server is available
   */
  async isMLServerAvailable(): Promise<boolean> {
    return await this.checkHealth()
  }
}