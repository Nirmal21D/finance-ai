"use client"

import React, { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { Sidebar } from "@/components/sidebar"
import { FinancialHealthDashboard } from "@/components/health/financial-health-dashboard"
import { TransactionService } from "@/lib/transaction-service"
import { BudgetService } from "@/lib/budget-service"
import { GoalService } from "@/lib/goal-service"
import { FinancialHealthService } from "@/lib/financial-health-service"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Shield, 
  TrendingUp, 
  AlertCircle, 
  BarChart3, 
  RefreshCw,
  ExternalLink
} from "lucide-react"

function HealthContent() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<any[]>([])
  const [budgets, setBudgets] = useState<any[]>([])
  const [goals, setGoals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadHealthData()
    }
  }, [user])

  const loadHealthData = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      setError(null)
      
      const transactionService = TransactionService.getInstance()
      const budgetService = BudgetService.getInstance()
      const goalService = GoalService.getInstance()

      // Load all data in parallel
      const [transactionList, budgetList, goalList] = await Promise.all([
        transactionService.getUserTransactions(user.uid),
        budgetService.getUserBudgets(user.uid),
        goalService.getActiveGoals(user.uid)
      ])

      // Convert transactions to health service format
      const healthTransactions = FinancialHealthService.convertTransactionsFromFirebase(transactionList)
      const healthBudgets = FinancialHealthService.convertBudgetsFromFirebase(budgetList)
      const healthGoals = FinancialHealthService.convertGoalsFromFirebase(goalList)

      setTransactions(healthTransactions)
      setBudgets(healthBudgets)
      setGoals(healthGoals)

    } catch (err) {
      console.error('Error loading health data:', err)
      setError('Failed to load financial data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen">
        <div className="w-full p-4 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
            <Sidebar />
            <section className="flex flex-col gap-6 min-w-0">
              <header className="brut-border brut-shadow rounded-md p-4 bg-card">
                <Skeleton className="h-8 w-64 mb-2" />
                <Skeleton className="h-4 w-96" />
              </header>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-16 w-full" />
                    </CardContent>
                  </Card>
                ))}
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
                <div>
                  <h1 className="heading text-2xl md:text-3xl flex items-center gap-3">
                    <Shield className="h-8 w-8 text-blue-600" />
                    Financial Health Score
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Comprehensive analysis of your financial wellness with actionable insights
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={loadHealthData}
                  className="brut-border brut-shadow"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </header>

            {error && (
              <Alert className="brut-border border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={loadHealthData}
                    className="ml-3"
                  >
                    Try Again
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Health Score Dashboard */}
            <FinancialHealthDashboard 
              transactions={transactions}
              budgets={budgets}
              goals={goals}
              className="brut-border brut-shadow rounded-md bg-card p-6"
            />

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="brut-border brut-shadow">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    Improve Score
                  </CardTitle>
                  <CardDescription>
                    Take action to boost your financial health
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => window.location.href = '/budgets'}
                    >
                      Set Up Budgets
                      <ExternalLink className="h-4 w-4 ml-auto" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => window.location.href = '/goals'}
                    >
                      Create Financial Goals
                      <ExternalLink className="h-4 w-4 ml-auto" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => window.location.href = '/transactions'}
                    >
                      Add Transactions
                      <ExternalLink className="h-4 w-4 ml-auto" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="brut-border brut-shadow">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Track Progress
                  </CardTitle>
                  <CardDescription>
                    Monitor your financial health over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-4">
                    <div className="text-2xl font-bold text-green-600 mb-2">
                      {transactions.length}
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Transactions analyzed
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.location.href = '/reports'}
                    >
                      View Reports
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="brut-border brut-shadow">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5 text-purple-600" />
                    Get Insights
                  </CardTitle>
                  <CardDescription>
                    AI-powered financial recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-4">
                    <div className="text-2xl mb-4">🤖</div>
                    <p className="text-sm text-gray-600 mb-4">
                      Chat with AI for personalized advice
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // Scroll to chat widget or open chat
                        const chatWidget = document.querySelector('[data-chat-widget]')
                        if (chatWidget) {
                          chatWidget.scrollIntoView({ behavior: 'smooth' })
                        }
                      }}
                    >
                      Ask AI Assistant
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Data Summary */}
            <Card className="brut-border brut-shadow">
              <CardHeader>
                <CardTitle>Data Summary</CardTitle>
                <CardDescription>
                  Overview of data used for health score calculation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{transactions.length}</div>
                    <div className="text-sm text-gray-600">Transactions</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{budgets.length}</div>
                    <div className="text-sm text-gray-600">Budgets</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{goals.length}</div>
                    <div className="text-sm text-gray-600">Financial Goals</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">
                      {transactions.length > 0 ? 
                        Math.ceil(
                          (new Date().getTime() - new Date(Math.min(...transactions.map(t => new Date(t.date).getTime()))).getTime()) 
                          / (1000 * 60 * 60 * 24 * 30)
                        ) : 0}
                    </div>
                    <div className="text-sm text-gray-600">Months of Data</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </main>
  )
}

export default function HealthPage() {
  return (
    <ProtectedRoute>
      <HealthContent />
    </ProtectedRoute>
  )
}