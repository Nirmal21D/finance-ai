"use client"

import React, { useEffect, useState, useMemo, useCallback } from "react"
import { Sidebar } from "@/components/sidebar"
import { MonthlySpendingChart } from "@/components/charts/monthly-spending-chart"
import { GoalCard } from "@/components/finance/goal-card"
import useSWR from "swr"
import { ChatWidget } from "@/components/ai/chat-widget"
import { ExpensePredictionDashboard } from "@/components/ai/expense-prediction-dashboard"
import { StockTracker } from "@/components/market/stock-tracker"
import { CryptoTracker } from "@/components/market/crypto-tracker"
import { NewsTicker } from "@/components/market/news-ticker"
import { HealthScoreCard } from "@/components/health/health-score-card"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"
import { TransactionService } from "@/lib/transaction-service"
import { BudgetService } from "@/lib/budget-service"
import { expensePredictionService } from "@/lib/expense-prediction-service"


const fetcher = (url: string) => fetch(url).then((r) => r.json())

// TypeScript interfaces for better type safety
interface BudgetStatus {
  budget: {
    id: string
    category: string
    monthlyLimit: number
    currentSpent: number
  }
  isOverBudget: boolean
  shouldAlert: boolean
  spentPercentage: number
}

interface FinancialData {
  totalBalance: number
  totalIncome: number
  totalExpenses: number
  monthlyData: any[]
  categoryBreakdown: any[]
  recentTransactions: any[]
}

interface MarketData {
  btc?: { price: number }
  aapl?: { price: number }
}

function DashboardContent() {
  const { user, userProfile } = useAuth()
  const { data: market } = useSWR<MarketData>("/api/market", fetcher)
  const [financialData, setFinancialData] = useState<FinancialData | null>(null)
  const [budgetData, setBudgetData] = useState<BudgetStatus[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])

  const loadFinancialData = useCallback(async () => {
    if (!user) return
    
    try {
      setLoading(true)
      setError(null)
      const transactionService = TransactionService.getInstance()
      const budgetService = BudgetService.getInstance()
      
      // Load financial data, budget data, and transactions for predictions
      const [summary, budgetStatuses, transactionList] = await Promise.all([
        transactionService.getFinancialSummary(user.uid),
        budgetService.getBudgetStatus(user.uid),
        transactionService.getUserTransactions(user.uid)
      ])
      
      setFinancialData(summary)
      setBudgetData(budgetStatuses)
      
      // Convert transactions for prediction service (real user data, not demo)
      const convertedTransactions = expensePredictionService.convertFirebaseTransactions(transactionList)
      console.log('🔍 Dashboard loaded transactions:', transactionList.length, 'original,', convertedTransactions.length, 'converted')
      console.log('📝 Sample transactions:', convertedTransactions.slice(0, 3))
      setTransactions(convertedTransactions)
    } catch (error) {
      console.error("Failed to load financial data:", error)
      setError(error instanceof Error ? error.message : "Failed to load financial data")
      
      // Fallback to demo data on error
      setFinancialData({
        totalBalance: 0,
        totalIncome: 0,
        totalExpenses: 0,
        monthlyData: [],
        categoryBreakdown: [],
        recentTransactions: []
      })
      setBudgetData([])
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadFinancialData()
    }
  }, [user, loadFinancialData])

  // Memoized budget calculations
  const budgetSummary = useMemo(() => {
    if (!budgetData) return { 
      totalBudgeted: 0, 
      totalSpent: 0, 
      overBudgetCount: 0,
      alertingCount: 0
    }
    
    return budgetData.reduce((acc, budget) => ({
      totalBudgeted: acc.totalBudgeted + budget.budget.monthlyLimit,
      totalSpent: acc.totalSpent + budget.budget.currentSpent,
      overBudgetCount: acc.overBudgetCount + (budget.isOverBudget ? 1 : 0),
      alertingCount: acc.alertingCount + (budget.shouldAlert && !budget.isOverBudget ? 1 : 0)
    }), { totalBudgeted: 0, totalSpent: 0, overBudgetCount: 0, alertingCount: 0 })
  }, [budgetData])

  // Memoized finance summary cards
  const financeSummaryCards = useMemo(() => [
    { 
      label: "Total Balance", 
      value: TransactionService.formatCurrency(financialData?.totalBalance || 0, userProfile?.currency),
      color: (financialData?.totalBalance ?? 0) >= 0 ? "text-green-600" : "text-red-600"
    },
    { 
      label: "Income", 
      value: TransactionService.formatCurrency(financialData?.totalIncome || 0, userProfile?.currency),
      color: "text-green-600"
    },
    { 
      label: "Expenses", 
      value: TransactionService.formatCurrency(financialData?.totalExpenses || 0, userProfile?.currency),
      color: "text-red-600"
    },
    { 
      label: budgetSummary.totalBudgeted > 0 ? "Total Budgets" : "No Budgets Set", 
      value: budgetSummary.totalBudgeted > 0 
        ? TransactionService.formatCurrency(budgetSummary.totalBudgeted, userProfile?.currency)
        : "Set budgets",
      color: budgetSummary.totalBudgeted > 0 ? "text-blue-600" : "text-gray-500"
    },
  ], [financialData, userProfile?.currency, budgetSummary])

  // Show loading state
  if (loading) {
    return (
      <main className="min-h-screen">
        <div className="w-full p-4 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
            <Sidebar />
            <section className="flex items-center justify-center">
              <div className="brut-border brut-shadow rounded-md p-6 bg-card">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                  <span>Loading your financial data...</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      <div className="w-full p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
          <Sidebar />
          <section className="flex flex-col gap-6 min-w-0">
            <header className="brut-border brut-shadow rounded-md p-4 bg-card">
              <div className="flex items-center justify-between">
                <h1 className="heading text-2xl md:text-3xl">Dashboard</h1>
                <div className="text-sm text-muted-foreground">
                  Welcome back, {userProfile?.displayName || user?.email || "User"}
                </div>
              </div>
              {error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center gap-2 text-red-800">
                    <span>⚠️</span>
                    <span className="text-sm">{error}</span>
                    <button 
                      onClick={() => { setError(null); loadFinancialData(); }}
                      className="ml-auto text-xs text-red-600 hover:text-red-800 underline"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
            </header>

            {/* Finance Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
              {financeSummaryCards.map((c) => (
                <div key={c.label} className="brut-border brut-shadow rounded-md p-4 bg-card">
                  <div className="text-xs uppercase tracking-wide">{c.label}</div>
                  <div className={`heading text-2xl mt-1 ${c.color || ''}`}>{c.value}</div>
                  {c.label.includes("Budgets") && budgetData && budgetData.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {budgetSummary.overBudgetCount > 0 && (
                        <span className="text-red-600" aria-label={`${budgetSummary.overBudgetCount} budgets over limit`}>
                          ⚠️ {budgetSummary.overBudgetCount} over budget
                        </span>
                      )}
                      {budgetSummary.alertingCount > 0 && (
                        <span className="text-yellow-600" aria-label={`${budgetSummary.alertingCount} budgets approaching limit`}>
                          📊 {budgetSummary.alertingCount} approaching limit
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Budget Overview (if budgets exist) */}
            {budgetData && budgetData.length > 0 && (
              <div className="brut-border brut-shadow rounded-md p-4 bg-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="heading text-lg">Budget Overview</div>
                  <a href="/budgets" className="text-sm text-primary hover:underline">View All</a>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {budgetData.slice(0, 3).map((budget: any) => (
                    <div key={budget.budget.id} className="p-3 rounded-lg bg-accent/20 brut-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{budget.budget.category}</span>
                        <span className="text-xs" aria-label={
                          budget.isOverBudget ? 'Over budget' : 
                          budget.shouldAlert ? 'Approaching limit' : 'On track'
                        }>
                          {budget.isOverBudget ? '🚨' : budget.shouldAlert ? '⚠️' : '✅'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mb-1">
                        {TransactionService.formatCurrency(budget.budget.currentSpent, userProfile?.currency)} / {TransactionService.formatCurrency(budget.budget.monthlyLimit, userProfile?.currency)}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full ${
                            budget.isOverBudget ? 'bg-red-500' : 
                            budget.shouldAlert ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(budget.spentPercentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Main Chart - Full Width */}
            <div className="w-full">
              <MonthlySpendingChart data={financialData?.monthlyData || []} />
            </div>

            {/* AI Expense Prediction Dashboard - Using Real User Data */}
            <div className="w-full">
              <ExpensePredictionDashboard 
                transactions={transactions}
                className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20"
              />
            </div>

            {/* Market Data Section */}
            <div className="w-full">
              <NewsTicker />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StockTracker />
              <CryptoTracker />
            </div>

            {/* Financial Health Score + AI Insights + Goals */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <HealthScoreCard 
                transactions={transactions}
                budgets={budgetData?.map(bs => ({
                  category: bs.budget.category,
                  monthlyLimit: bs.budget.monthlyLimit,
                  currentSpent: bs.budget.currentSpent,
                  alertThreshold: 80
                })) || []}
                showDetails={true}
                className="brut-border brut-shadow"
              />

              <div className="brut-border brut-shadow rounded-md p-4 bg-card">
                <div className="heading text-lg mb-3">AI Insights</div>
                <div className="space-y-2">
                  <p className="text-sm">
                    {budgetData && budgetData.length > 0 
                      ? `You have ${budgetData.filter((b: any) => !b.isOverBudget).length} budgets on track this month!`
                      : "Create budgets to get personalized spending insights."
                    }
                  </p>
                  <div className="text-xs text-muted-foreground">
                    {(financialData?.totalBalance ?? 0) >= 0 ? '🎯 Great financial health!' : '⚠️ Monitor your spending'}
                  </div>
                </div>
              </div>

              <GoalCard />
            </div>
          </section>
        </div>
      </div>

      <ChatWidget />
    </main>
  )
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}
