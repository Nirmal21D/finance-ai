"use client"

import React, { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { MonthlySpendingChart } from "@/components/charts/monthly-spending-chart"
import { GoalCard } from "@/components/finance/goal-card"
import useSWR from "swr"
import { ChatWidget } from "@/components/ai/chat-widget"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"
import { TransactionService } from "@/lib/transaction-service"
import { BudgetService } from "@/lib/budget-service"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function DashboardContent() {
  const { user, userProfile } = useAuth()
  const { data: market } = useSWR("/api/market", fetcher)
  const [financialData, setFinancialData] = useState<any>(null)
  const [budgetData, setBudgetData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadFinancialData()
    }
  }, [user])

  const loadFinancialData = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const transactionService = TransactionService.getInstance()
      const budgetService = BudgetService.getInstance()
      
      // Load both financial data and budget data
      const [summary, budgetStatuses] = await Promise.all([
        transactionService.getFinancialSummary(user.uid),
        budgetService.getBudgetStatus(user.uid)
      ])
      
      setFinancialData(summary)
      setBudgetData(budgetStatuses)
    } catch (error) {
      console.error("Failed to load financial data:", error)
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
    } finally {
      setLoading(false)
    }
  }

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
            </header>

            {/* Finance Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
              {(() => {
                // Calculate total budgets from real budget data
                const totalBudgeted = budgetData?.reduce((sum: number, budget: any) => sum + budget.budget.monthlyLimit, 0) || 0
                const totalBudgetSpent = budgetData?.reduce((sum: number, budget: any) => sum + budget.budget.currentSpent, 0) || 0
                const totalBudgetRemaining = Math.max(0, totalBudgeted - totalBudgetSpent)
                
                return [
                  { 
                    label: "Total Balance", 
                    value: TransactionService.formatCurrency(financialData?.totalBalance || 0, userProfile?.currency),
                    color: financialData?.totalBalance >= 0 ? "text-green-600" : "text-red-600"
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
                    label: totalBudgeted > 0 ? "Total Budgets" : "No Budgets Set", 
                    value: totalBudgeted > 0 
                      ? TransactionService.formatCurrency(totalBudgeted, userProfile?.currency)
                      : "Set budgets",
                    color: totalBudgeted > 0 ? "text-blue-600" : "text-gray-500"
                  },
                ]
              })().map((c) => (
                <div key={c.label} className="brut-border brut-shadow rounded-md p-4 bg-card">
                  <div className="text-xs uppercase tracking-wide">{c.label}</div>
                  <div className={`heading text-2xl mt-1 ${c.color || ''}`}>{c.value}</div>
                  {c.label.includes("Budgets") && budgetData && budgetData.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {budgetData.filter((b: any) => b.isOverBudget).length > 0 && (
                        <span className="text-red-600">⚠️ {budgetData.filter((b: any) => b.isOverBudget).length} over budget</span>
                      )}
                      {budgetData.filter((b: any) => b.shouldAlert && !b.isOverBudget).length > 0 && (
                        <span className="text-yellow-600">📊 {budgetData.filter((b: any) => b.shouldAlert && !b.isOverBudget).length} approaching limit</span>
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
                        <span className="text-xs">
                          {budget.isOverBudget ? '🚨' : budget.shouldAlert ? '⚠️' : '✅'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mb-1">
                        ₹{budget.budget.currentSpent.toLocaleString()} / ₹{budget.budget.monthlyLimit.toLocaleString()}
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

            {/* AI Insight + Market Watch + Goals */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    {financialData?.totalBalance >= 0 ? '🎯 Great financial health!' : '⚠️ Monitor your spending'}
                  </div>
                </div>
              </div>

              <div className="brut-border brut-shadow rounded-md p-4 bg-card">
                <div className="heading text-lg mb-3">Market Watch</div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 rounded bg-accent/20">
                    <div className="flex items-center gap-2">
                      <span>🟠</span>
                      <span className="font-medium">BTC</span>
                    </div>
                    <strong className="text-sm">
                      {market?.btc?.price ? 
                        `₹${market.btc.price.toLocaleString('en-IN')}` : 
                        market === undefined ? (
                          <span className="text-muted-foreground">Loading...</span>
                        ) : (
                          <span className="text-red-500">Error</span>
                        )
                      }
                    </strong>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-accent/20">
                    <div className="flex items-center gap-2">
                      <span>🍎</span>
                      <span className="font-medium">AAPL</span>
                    </div>
                    <strong className="text-sm">
                      {market?.aapl?.price ? 
                        `₹${market.aapl.price.toLocaleString('en-IN')}` : 
                        market === undefined ? (
                          <span className="text-muted-foreground">Loading...</span>
                        ) : (
                          <span className="text-red-500">Unavailable</span>
                        )
                      }
                    </strong>
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
