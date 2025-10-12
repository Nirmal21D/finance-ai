import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  orderBy,
  Timestamp 
} from "firebase/firestore"
import { getFirebase } from "@/lib/firebase"
import { TransactionService } from "@/lib/transaction-service"

export interface Budget {
  id: string
  userId: string
  category: string
  monthlyLimit: number
  currentSpent: number
  alertThreshold: number // percentage (e.g., 80 for 80%)
  period: 'monthly' | 'weekly' | 'yearly'
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface BudgetStatus {
  budget: Budget
  spentPercentage: number
  remainingAmount: number
  isOverBudget: boolean
  shouldAlert: boolean
  projectedSpending: number
  daysRemainingInPeriod: number
}

export interface BudgetAlert {
  id: string
  userId: string
  budgetId: string
  category: string
  type: 'threshold' | 'exceeded' | 'weekly_update'
  message: string
  isRead: boolean
  createdAt: Timestamp
}

export class BudgetService {
  private static instance: BudgetService
  private db = getFirebase().db

  static getInstance(): BudgetService {
    if (!BudgetService.instance) {
      BudgetService.instance = new BudgetService()
    }
    return BudgetService.instance
  }

  async getUserBudgets(userId: string): Promise<Budget[]> {
    if (!this.db) throw new Error("Firestore not initialized")

    const budgetsRef = collection(this.db, "budgets")
    const q = query(
      budgetsRef,
      where("userId", "==", userId)
    )

    const snapshot = await getDocs(q)
    const budgets = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Budget))

    // Sort by creation date, client-side to avoid index requirement
    return budgets.sort((a, b) => {
      const aTime = a.createdAt?.toMillis() || 0
      const bTime = b.createdAt?.toMillis() || 0
      return bTime - aTime
    })
  }

  async createBudget(userId: string, budgetData: Omit<Budget, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'currentSpent'>): Promise<string> {
    if (!this.db) throw new Error("Firestore not initialized")

    const budgetsRef = collection(this.db, "budgets")
    const now = Timestamp.now()
    
    const docRef = await addDoc(budgetsRef, {
      ...budgetData,
      userId,
      currentSpent: 0,
      createdAt: now,
      updatedAt: now
    })

    return docRef.id
  }

  async updateBudget(budgetId: string, updates: Partial<Omit<Budget, 'id' | 'userId' | 'createdAt'>>): Promise<void> {
    if (!this.db) throw new Error("Firestore not initialized")

    const budgetRef = doc(this.db, "budgets", budgetId)
    await updateDoc(budgetRef, {
      ...updates,
      updatedAt: Timestamp.now()
    })
  }

  async deleteBudget(budgetId: string): Promise<void> {
    if (!this.db) throw new Error("Firestore not initialized")

    const budgetRef = doc(this.db, "budgets", budgetId)
    await deleteDoc(budgetRef)
  }

  async getBudgetStatus(userId: string): Promise<BudgetStatus[]> {
    const budgets = await this.getUserBudgets(userId)
    const transactionService = TransactionService.getInstance()

    return Promise.all(budgets.map(async (budget) => {
      // Calculate current period spending
      const currentPeriodStart = this.getCurrentPeriodStart(budget.period)
      const currentPeriodEnd = new Date().toISOString().split('T')[0]

      // Get transactions for this category in current period
      const allTransactions = await transactionService.getUserTransactions(userId)
      const categoryTransactions = allTransactions.filter(transaction => 
        transaction.category === budget.category &&
        transaction.amount < 0 && // Only expenses
        transaction.date >= currentPeriodStart &&
        transaction.date <= currentPeriodEnd
      )

      const currentSpent = categoryTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
      const spentPercentage = (currentSpent / budget.monthlyLimit) * 100
      const remainingAmount = Math.max(0, budget.monthlyLimit - currentSpent)
      const isOverBudget = currentSpent > budget.monthlyLimit
      const shouldAlert = spentPercentage >= budget.alertThreshold

      // Calculate projected spending based on current pace
      const now = new Date()
      const daysInPeriod = this.getDaysInPeriod(budget.period)
      const daysElapsed = this.getDaysElapsed(budget.period)
      const daysRemainingInPeriod = Math.max(0, daysInPeriod - daysElapsed)
      
      const dailyAverage = daysElapsed > 0 ? currentSpent / daysElapsed : 0
      const projectedSpending = dailyAverage * daysInPeriod

      // Update budget's currentSpent in database
      if (currentSpent !== budget.currentSpent) {
        await this.updateBudget(budget.id, { currentSpent })
        budget.currentSpent = currentSpent
      }

      return {
        budget,
        spentPercentage,
        remainingAmount,
        isOverBudget,
        shouldAlert,
        projectedSpending,
        daysRemainingInPeriod
      }
    }))
  }

  async getActiveBudgets(userId: string): Promise<Budget[]> {
    const budgets = await this.getUserBudgets(userId)
    return budgets.filter(budget => budget.isActive)
  }

  async getBudgetByCategory(userId: string, category: string): Promise<Budget | null> {
    const budgets = await this.getUserBudgets(userId)
    return budgets.find(budget => budget.category === category && budget.isActive) || null
  }

  async checkBudgetAlerts(userId: string): Promise<BudgetAlert[]> {
    const budgetStatuses = await this.getBudgetStatus(userId)
    const alerts: Omit<BudgetAlert, 'id'>[] = []

    budgetStatuses.forEach(status => {
      if (status.shouldAlert && !status.isOverBudget) {
        alerts.push({
          userId,
          budgetId: status.budget.id,
          category: status.budget.category,
          type: 'threshold',
          message: `You've spent ${status.spentPercentage.toFixed(1)}% of your ${status.budget.category} budget (₹${status.budget.currentSpent.toLocaleString()}/₹${status.budget.monthlyLimit.toLocaleString()})`,
          isRead: false,
          createdAt: Timestamp.now()
        })
      } else if (status.isOverBudget) {
        alerts.push({
          userId,
          budgetId: status.budget.id,
          category: status.budget.category,
          type: 'exceeded',
          message: `Budget exceeded! You've spent ₹${status.budget.currentSpent.toLocaleString()} of your ₹${status.budget.monthlyLimit.toLocaleString()} ${status.budget.category} budget.`,
          isRead: false,
          createdAt: Timestamp.now()
        })
      }
    })

    return alerts as BudgetAlert[]
  }

  async createBudgetAlert(alert: Omit<BudgetAlert, 'id'>): Promise<string> {
    if (!this.db) throw new Error("Firestore not initialized")

    const alertsRef = collection(this.db, "budget_alerts")
    const docRef = await addDoc(alertsRef, alert)
    return docRef.id
  }

  async getBudgetAlerts(userId: string): Promise<BudgetAlert[]> {
    if (!this.db) throw new Error("Firestore not initialized")

    const alertsRef = collection(this.db, "budget_alerts")
    const q = query(
      alertsRef,
      where("userId", "==", userId)
    )

    const snapshot = await getDocs(q)
    const alerts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BudgetAlert))

    // Sort by creation date, client-side
    return alerts.sort((a, b) => {
      const aTime = a.createdAt?.toMillis() || 0
      const bTime = b.createdAt?.toMillis() || 0
      return bTime - aTime
    })
  }

  private getCurrentPeriodStart(period: Budget['period']): string {
    const now = new Date()
    
    switch (period) {
      case 'weekly':
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay()) // Sunday
        return weekStart.toISOString().split('T')[0]
      
      case 'yearly':
        return `${now.getFullYear()}-01-01`
      
      case 'monthly':
      default:
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    }
  }

  private getDaysInPeriod(period: Budget['period']): number {
    const now = new Date()
    
    switch (period) {
      case 'weekly':
        return 7
      
      case 'yearly':
        return this.isLeapYear(now.getFullYear()) ? 366 : 365
      
      case 'monthly':
      default:
        return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    }
  }

  private getDaysElapsed(period: Budget['period']): number {
    const now = new Date()
    const periodStart = new Date(this.getCurrentPeriodStart(period))
    const diffTime = now.getTime() - periodStart.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  }

  private isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
  }

  // Helper methods
  static formatCurrency(amount: number): string {
    return `₹${Math.abs(amount).toLocaleString()}`
  }

  static getBudgetStatusColor(status: BudgetStatus): string {
    if (status.isOverBudget) return 'text-red-600 bg-red-50'
    if (status.shouldAlert) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }

  static getBudgetStatusIcon(status: BudgetStatus): string {
    if (status.isOverBudget) return '🚨'
    if (status.shouldAlert) return '⚠️'
    return '✅'
  }

  static getBudgetHealthText(status: BudgetStatus): string {
    if (status.isOverBudget) return 'Over Budget'
    if (status.shouldAlert) return 'Approaching Limit'
    return 'On Track'
  }
}