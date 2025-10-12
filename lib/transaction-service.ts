import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  Timestamp 
} from "firebase/firestore"
import { getFirebase } from "@/lib/firebase"

export interface Transaction {
  id: string
  userId: string
  category: string
  amount: number
  date: string
  note: string
  type: 'income' | 'expense'
  createdAt: Timestamp
}

export interface FinancialSummary {
  totalBalance: number
  totalIncome: number
  totalExpenses: number
  monthlyData: { month: string; spent: number; income: number }[]
  categoryBreakdown: { category: string; amount: number; percentage: number }[]
  recentTransactions: Transaction[]
}

export interface MonthlyData {
  month: string
  spent: number
  income: number
  net: number
}

export class TransactionService {
  private static instance: TransactionService
  private db = getFirebase().db

  static getInstance(): TransactionService {
    if (!TransactionService.instance) {
      TransactionService.instance = new TransactionService()
    }
    return TransactionService.instance
  }

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    if (!this.db) throw new Error("Firestore not initialized")

    const transactionsRef = collection(this.db, "transactions")
    // Temporary fix: Query without orderBy to avoid index requirement
    // TODO: Re-enable orderBy after creating composite index in Firebase Console
    const q = query(
      transactionsRef,
      where("userId", "==", userId)
    )

    const snapshot = await getDocs(q)
    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Transaction))

    // Sort in memory as temporary workaround
    return transactions.sort((a, b) => {
      const aTime = a.createdAt?.toMillis() || 0
      const bTime = b.createdAt?.toMillis() || 0
      return bTime - aTime // Descending order
    })
  }

  async getFinancialSummary(userId: string): Promise<FinancialSummary> {
    const transactions = await this.getUserTransactions(userId)
    
    // Calculate totals using type field (correct way)
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    
    const totalBalance = totalIncome - totalExpenses

    // Generate monthly data for the last 6 months
    const monthlyData = this.generateMonthlyData(transactions)

    // Calculate category breakdown for expenses
    const categoryBreakdown = this.generateCategoryBreakdown(transactions)

    // Get recent transactions (last 10)
    const recentTransactions = transactions.slice(0, 10)

    return {
      totalBalance,
      totalIncome,
      totalExpenses,
      monthlyData,
      categoryBreakdown,
      recentTransactions
    }
  }

  private generateMonthlyData(transactions: Transaction[]): MonthlyData[] {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const now = new Date()
    const monthlyData: MonthlyData[] = []

    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthName = monthNames[date.getMonth()]
      const year = date.getFullYear()
      const monthKey = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`

      const monthTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date)
        return (
          transactionDate.getFullYear() === year &&
          transactionDate.getMonth() === date.getMonth()
        )
      })

      const spent = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)

      const income = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)

      monthlyData.push({
        month: monthName,
        spent,
        income,
        net: income - spent
      })
    }

    return monthlyData
  }

  private generateCategoryBreakdown(transactions: Transaction[]): { category: string; amount: number; percentage: number }[] {
    const expenses = transactions.filter(t => t.type === 'expense')
    const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0)

    if (totalExpenses === 0) return []

    const categoryTotals = expenses.reduce((acc, t) => {
      const category = t.category || 'Other'
      acc[category] = (acc[category] || 0) + Math.abs(t.amount)
      return acc
    }, {} as Record<string, number>)

    return Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: Math.round((amount / totalExpenses) * 100)
      }))
      .sort((a, b) => b.amount - a.amount)
  }

  async getMonthlySpendingData(userId: string): Promise<{ month: string; spent: number }[]> {
    const summary = await this.getFinancialSummary(userId)
    return summary.monthlyData.map(({ month, spent }) => ({ month, spent }))
  }

  // Helper method to determine transaction type based on amount
  static determineTransactionType(amount: number): 'income' | 'expense' {
    return amount >= 0 ? 'income' : 'expense'
  }

  // Create a new transaction
  async createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<string> {
    if (!this.db) throw new Error("Firestore not initialized")

    const { addDoc, collection } = await import('firebase/firestore')
    
    const newTransaction = {
      ...transaction,
      createdAt: Timestamp.now()
    }

    const docRef = await addDoc(collection(this.db, 'transactions'), newTransaction)
    return docRef.id
  }

  // Helper method to format currency
  static formatCurrency(amount: number, currency: string = 'INR'): string {
    const symbols: Record<string, string> = {
      'INR': '₹',
      'USD': '$',
      'EUR': '€',
      'GBP': '£'
    }
    
    const symbol = symbols[currency] || '₹'
    return `${symbol}${Math.abs(amount).toLocaleString()}`
  }
}