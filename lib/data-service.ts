import { TransactionService, Transaction } from "./transaction-service"
import { BudgetService, Budget } from "./budget-service"
import { Timestamp } from "firebase/firestore"

export interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  errors: string[]
  duplicates: number
}

export interface ExportData {
  transactions: Transaction[]
  budgets: Budget[]
  summary: {
    totalTransactions: number
    totalIncome: number
    totalExpenses: number
    dateRange: {
      start: string
      end: string
    }
  }
}

export class DataService {
  private static instance: DataService
  private transactionService = TransactionService.getInstance()
  private budgetService = BudgetService.getInstance()

  static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService()
    }
    return DataService.instance
  }

  // =============== EXPORT FUNCTIONALITY ===============

  async exportUserData(userId: string, includeInactive = false): Promise<ExportData> {
    const transactions = await this.transactionService.getUserTransactions(userId)
    const budgets = includeInactive 
      ? await this.budgetService.getUserBudgets(userId)
      : await this.budgetService.getActiveBudgets(userId)

    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    const dates = transactions.map(t => t.date).sort()
    const dateRange = {
      start: dates[0] || new Date().toISOString().split('T')[0],
      end: dates[dates.length - 1] || new Date().toISOString().split('T')[0]
    }

    return {
      transactions,
      budgets,
      summary: {
        totalTransactions: transactions.length,
        totalIncome,
        totalExpenses,
        dateRange
      }
    }
  }

  generateTransactionCSV(transactions: Transaction[]): string {
    const headers = ['Date', 'Type', 'Category', 'Amount', 'Note', 'Created']
    const rows = transactions.map(t => [
      t.date,
      t.type,
      t.category,
      t.amount.toString(),
      `"${t.note || ''}"`, // Escape quotes in notes
      t.createdAt?.toDate().toISOString() || ''
    ])

    return [headers, ...rows]
      .map(row => row.join(','))
      .join('\n')
  }

  generateBudgetCSV(budgets: Budget[]): string {
    const headers = ['Category', 'Period', 'Budget Limit', 'Current Spent', 'Alert Threshold %', 'Status', 'Created']
    const rows = budgets.map(b => [
      b.category,
      b.period,
      b.monthlyLimit.toString(),
      b.currentSpent.toString(),
      b.alertThreshold.toString(),
      b.isActive ? 'Active' : 'Inactive',
      b.createdAt?.toDate().toISOString() || ''
    ])

    return [headers, ...rows]
      .map(row => row.join(','))
      .join('\n')
  }

  downloadCSV(data: string, filename: string): void {
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // =============== IMPORT FUNCTIONALITY ===============

  async importTransactionsFromCSV(
    userId: string, 
    csvContent: string, 
    skipDuplicates = true
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: 0,
      skipped: 0,
      errors: [],
      duplicates: 0
    }

    try {
      const lines = csvContent.trim().split('\n')
      if (lines.length < 2) {
        result.errors.push('CSV file is empty or has no data rows')
        return result
      }

      const headers = lines[0].toLowerCase().split(',').map(h => h.trim())
      const existingTransactions = await this.transactionService.getUserTransactions(userId)
      
      // Create a set of existing transaction signatures for duplicate detection
      const existingSignatures = new Set(
        existingTransactions.map(t => `${t.date}-${t.amount}-${t.category}-${t.note}`)
      )

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = this.parseCSVLine(lines[i])
          const transaction = this.mapCSVToTransaction(headers, values, userId)
          
          if (!transaction) {
            result.skipped++
            continue
          }

          // Check for duplicates
          const signature = `${transaction.date}-${transaction.amount}-${transaction.category}-${transaction.note}`
          if (skipDuplicates && existingSignatures.has(signature)) {
            result.duplicates++
            continue
          }

          // Import transaction (you'll need to add this method to TransactionService)
          await this.createTransactionFromImport(transaction)
          result.imported++

        } catch (error) {
          result.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      result.success = result.imported > 0
      return result

    } catch (error) {
      result.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return result
    }
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    result.push(current.trim())
    return result
  }

  private mapCSVToTransaction(
    headers: string[], 
    values: string[], 
    userId: string
  ): Omit<Transaction, 'id'> | null {
    const getField = (fieldNames: string[]): string => {
      for (const name of fieldNames) {
        const index = headers.findIndex(h => h.includes(name))
        if (index !== -1 && values[index]) {
          return values[index].replace(/"/g, '').trim()
        }
      }
      return ''
    }

    const amount = parseFloat(getField(['amount', 'value', 'sum']))
    const date = getField(['date', 'transaction_date', 'created'])
    const category = getField(['category', 'type', 'class'])
    const note = getField(['note', 'description', 'memo', 'details'])
    const type = getField(['type', 'transaction_type'])

    if (isNaN(amount) || !date) {
      return null
    }

    // Determine transaction type
    let transactionType: 'income' | 'expense'
    if (type) {
      transactionType = type.toLowerCase().includes('income') ? 'income' : 'expense'
    } else {
      transactionType = amount >= 0 ? 'income' : 'expense'
    }

    // Validate and format date
    const parsedDate = new Date(date)
    if (isNaN(parsedDate.getTime())) {
      throw new Error(`Invalid date format: ${date}`)
    }

    return {
      userId,
      amount: Math.abs(amount),
      date: parsedDate.toISOString().split('T')[0],
      category: category || 'Other',
      note: note || '',
      type: transactionType,
      createdAt: Timestamp.now()
    }
  }

  private async createTransactionFromImport(transaction: Omit<Transaction, 'id'>): Promise<void> {
    // You'll need to add this method to TransactionService or use Firebase directly
    const { db } = await import('@/lib/firebase').then(m => m.getFirebase())
    if (!db) throw new Error("Firestore not initialized")

    const { addDoc, collection } = await import('firebase/firestore')
    await addDoc(collection(db, 'transactions'), transaction)
  }

  // =============== BACKUP & RESTORE ===============

  async createFullBackup(userId: string): Promise<string> {
    const exportData = await this.exportUserData(userId, true)
    const backup = {
      version: '1.0',
      userId,
      exportDate: new Date().toISOString(),
      data: exportData
    }
    
    return JSON.stringify(backup, null, 2)
  }

  async restoreFromBackup(backupContent: string): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: 0,
      skipped: 0,
      errors: [],
      duplicates: 0
    }

    try {
      const backup = JSON.parse(backupContent)
      
      if (!backup.data || !backup.userId) {
        result.errors.push('Invalid backup file format')
        return result
      }

      // Import transactions
      const transactionCSV = this.generateTransactionCSV(backup.data.transactions)
      const transactionResult = await this.importTransactionsFromCSV(backup.userId, transactionCSV)
      
      result.imported += transactionResult.imported
      result.errors.push(...transactionResult.errors)
      result.duplicates += transactionResult.duplicates

      // TODO: Import budgets (you'll need to implement budget import)
      
      result.success = result.imported > 0
      return result

    } catch (error) {
      result.errors.push(`Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return result
    }
  }

  // =============== UTILITY METHODS ===============

  validateCSVFormat(csvContent: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const lines = csvContent.trim().split('\n')

    if (lines.length < 2) {
      errors.push('CSV must have at least a header row and one data row')
    }

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim())
    const requiredFields = ['amount', 'date']
    const hasRequired = requiredFields.every(field => 
      headers.some(h => h.includes(field))
    )

    if (!hasRequired) {
      errors.push(`CSV must contain columns for: ${requiredFields.join(', ')}`)
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  getImportTemplate(): string {
    return [
      'Date,Type,Category,Amount,Note',
      '2024-01-15,expense,Food & Dining,250,"Lunch at restaurant"',
      '2024-01-16,income,Salary,50000,"Monthly salary"',
      '2024-01-17,expense,Transportation,45,"Bus fare"'
    ].join('\n')
  }
}