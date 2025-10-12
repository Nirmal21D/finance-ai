'use client'

import React, { useState, useEffect } from 'react'
import { 
  expensePredictionService, 
  type Transaction, 
  type MonthlyPrediction, 
  type CategoryPredictions, 
  type SpendingPatterns 
} from '@/lib/expense-prediction-service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Target, 
  Brain, 
  BarChart3, 
  Calendar,
  PieChart,
  AlertCircle,
  CheckCircle2,
  Zap
} from 'lucide-react'

interface ExpensePredictionDashboardProps {
  transactions?: Transaction[]
  className?: string
}

export function ExpensePredictionDashboard({ 
  transactions = [], 
  className = '' 
}: ExpensePredictionDashboardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [serviceAvailable, setServiceAvailable] = useState<boolean | null>(null)
  
  // Prediction states
  const [monthlyPrediction, setMonthlyPrediction] = useState<MonthlyPrediction | null>(null)
  const [categoryPredictions, setCategoryPredictions] = useState<CategoryPredictions | null>(null)
  const [spendingPatterns, setSpendingPatterns] = useState<SpendingPatterns | null>(null)
  
  const [activeTab, setActiveTab] = useState('monthly')

  // Check service availability on mount
  useEffect(() => {
    checkServiceAvailability()
  }, [])

  const checkServiceAvailability = async () => {
    try {
      const available = await expensePredictionService.isServiceAvailable()
      setServiceAvailable(available)
      if (!available) {
        setError('ML prediction service is not available. Please ensure the Python server is running.')
      }
    } catch (err) {
      setServiceAvailable(false)
      setError('Failed to connect to prediction service')
    }
  }

  const runPredictions = async () => {
    if (!serviceAvailable) {
      setError('Prediction service is not available')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('🔍 Running predictions with transactions:', transactions.length, transactions.slice(0, 2))
      const targetMonth = expensePredictionService.getNextMonth()
      
      // Run all predictions in parallel
      const [monthly, categories, patterns] = await Promise.all([
        expensePredictionService.predictMonthlyExpenses(transactions, targetMonth),
        expensePredictionService.predictCategoryExpenses(transactions, targetMonth),
        expensePredictionService.analyzeSpendingPatterns(transactions)
      ])

      console.log('📊 Prediction results:', { monthly, categories, patterns })
      
      setMonthlyPrediction(monthly)
      setCategoryPredictions(categories)
      setSpendingPatterns(patterns)

      if (!monthly && !categories && !patterns) {
        setError('Failed to generate predictions. Please try again.')
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prediction failed')
    } finally {
      setIsLoading(false)
    }
  }

  const runDemoPrediction = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const demo = await expensePredictionService.getDemoPrediction()
      if (demo) {
        setMonthlyPrediction(demo.monthly_prediction)
        setCategoryPredictions(demo.category_predictions)
        setSpendingPatterns(demo.spending_patterns)
      } else {
        setError('Failed to load demo prediction')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo prediction failed')
    } finally {
      setIsLoading(false)
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-red-500" />
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-green-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const formatCurrency = (amount: number) => {
    return expensePredictionService.formatCurrency(amount)
  }

  const getMonthName = (monthString: string) => {
    return expensePredictionService.getMonthName(monthString)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-600" />
            Expense Prediction Engine
          </h2>
          <p className="text-muted-foreground">
            AI-powered spending forecasts based on your transaction history
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={runPredictions}
            disabled={isLoading || !serviceAvailable || transactions.length === 0}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <Target className="h-4 w-4" />
            )}
            {transactions.length > 0 ? 'Analyze My Spending' : 'Add Transactions First'}
          </Button>
          
          {transactions.length === 0 && (
            <Button 
              variant="outline"
              onClick={runDemoPrediction}
              disabled={isLoading || !serviceAvailable}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Try Demo
            </Button>
          )}
          
          {transactions.length > 0 && (
            <Button 
              variant="outline"
              onClick={() => {
                setMonthlyPrediction(null)
                setCategoryPredictions(null)
                setSpendingPatterns(null)
                setError('Cleared results. Click "Analyze My Spending" to try again with your real data.')
              }}
              className="flex items-center gap-2 text-orange-600"
            >
              Clear Results
            </Button>
          )}
        </div>
      </div>

      {/* Service Status */}
      {serviceAvailable === false && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            ML prediction service is unavailable. Make sure the Python server is running on port 8000.
          </AlertDescription>
        </Alert>
      )}

      {serviceAvailable === true && !error && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            {transactions.length > 0 
              ? `Ready to analyze your ${transactions.length} transactions for spending predictions.`
              : `Prediction service is ready. Add some transactions to get personalized insights.`
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Data Quality Warning */}
      {(monthlyPrediction || categoryPredictions) && (() => {
        const totalPredicted = categoryPredictions?.total_predicted || monthlyPrediction?.predicted_amount || 0
        const isLikelyDemo = totalPredicted > 20000 || (totalPredicted > 0 && Math.round(totalPredicted) === totalPredicted && totalPredicted > 5000)
        
        if (isLikelyDemo && transactions.length === 0) {
          return (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>📊 Demo Data:</strong> Since you have no transactions, this uses synthetic data to show how predictions work. 
                Add real transactions to get personalized insights.
              </AlertDescription>
            </Alert>
          )
        } else if (isLikelyDemo && transactions.length > 0) {
          return (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>⚠️ Unexpected Demo Data!</strong> You have {transactions.length} transactions but got demo-like results. 
                This might indicate insufficient transaction history (&lt;30 transactions or &lt;3 months).
                <br />
                <span className="text-xs mt-1 block">
                  Got: ₹{totalPredicted.toLocaleString()} • Try adding more transaction history for better predictions
                </span>
              </AlertDescription>
            </Alert>
          )
        } else if (transactions.length > 0 && transactions.length < 30) {
          return (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>📈 Limited Data:</strong> Using your {transactions.length} transactions. 
                Add more transaction history (30+ transactions across 3+ months) for more accurate predictions.
              </AlertDescription>
            </Alert>
          )
        }
        return null
      })()}

      {/* Results */}
      {(monthlyPrediction || categoryPredictions || spendingPatterns) && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="monthly" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Monthly
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="patterns" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Patterns
            </TabsTrigger>
          </TabsList>

          <TabsContent value="monthly" className="space-y-4">
            {monthlyPrediction && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Next Month Prediction
                    {getTrendIcon(monthlyPrediction.trend)}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <span>Forecast for {getMonthName(monthlyPrediction.target_month)}</span>
                    {(() => {
                      // Check if this looks like demo data (high amounts, round numbers)
                      const totalPredicted = categoryPredictions?.total_predicted || monthlyPrediction.predicted_amount
                      const isLikelyDemo = totalPredicted > 20000 || Math.round(totalPredicted) === totalPredicted
                      
                      if (transactions.length === 0 || isLikelyDemo) {
                        return (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                            ⚠️ Demo data - Add real transactions
                          </span>
                        )
                      } else {
                        return (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                            ✅ Based on your data
                          </span>
                        )
                      }
                    })()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Predicted Amount</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(monthlyPrediction.predicted_amount)}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Confidence</p>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={monthlyPrediction.confidence * 100} 
                          className="flex-1" 
                        />
                        <span className="text-sm font-medium">
                          {Math.round(monthlyPrediction.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 pt-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Historical Avg</p>
                      <p className="font-semibold">
                        {formatCurrency(monthlyPrediction.historical_average)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Seasonal Factor</p>
                      <p className="font-semibold">
                        {monthlyPrediction.seasonal_factor.toFixed(2)}x
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Trend</p>
                      <Badge variant={monthlyPrediction.trend === 'increasing' ? 'destructive' : 'default'}>
                        {monthlyPrediction.trend}
                      </Badge>
                    </div>
                  </div>

                  <div className="pt-4">
                    <p className="text-sm text-muted-foreground">Prediction Range</p>
                    <p className="text-lg">
                      {formatCurrency(monthlyPrediction.prediction_range[0])} - {formatCurrency(monthlyPrediction.prediction_range[1])}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            {categoryPredictions && (
              <Card>
                <CardHeader>
                  <CardTitle>Category Predictions</CardTitle>
                  <CardDescription>
                    Expected spending by category for {getMonthName(categoryPredictions.target_month)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center pb-4">
                      <p className="text-sm text-muted-foreground">Total Predicted</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(categoryPredictions.total_predicted)}
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      {categoryPredictions.predictions.map((pred, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-medium">{pred.category}</p>
                              <div className="flex items-center gap-2">
                                {getTrendIcon(pred.trend)}
                                <span className="text-sm text-muted-foreground">
                                  {pred.confidence > 0.7 ? 'High' : pred.confidence > 0.5 ? 'Medium' : 'Low'} confidence
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              {formatCurrency(pred.predicted_amount)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {pred.percentage_of_total.toFixed(1)}% of total
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="patterns" className="space-y-4">
            {spendingPatterns && (
              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Overall Spending Trend</CardTitle>
                    <CardDescription>
                      Your spending behavior analysis
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Monthly Average</p>
                        <p className="text-xl font-bold">
                          {formatCurrency(spendingPatterns.overall_trend.monthly_average)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Trend Direction</p>
                        <div className="flex items-center gap-2">
                          {getTrendIcon(spendingPatterns.overall_trend.direction)}
                          <Badge variant={spendingPatterns.overall_trend.direction === 'increasing' ? 'destructive' : 'default'}>
                            {spendingPatterns.overall_trend.direction}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Categories</CardTitle>
                    <CardDescription>
                      Your biggest spending categories
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(spendingPatterns.category_patterns)
                        .sort(([,a], [,b]) => b.monthly_average - a.monthly_average)
                        .slice(0, 5)
                        .map(([category, pattern]) => (
                          <div key={category} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <p className="font-medium">{category}</p>
                              <p className="text-sm text-muted-foreground">
                                {pattern.total_transactions} transactions
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">
                                {formatCurrency(pattern.monthly_average)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {pattern.percentage_of_total.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Empty State */}
      {!monthlyPrediction && !categoryPredictions && !spendingPatterns && !isLoading && (
        <Card>
          <CardContent className="text-center py-12">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {transactions.length > 0 ? 'Ready to Analyze Your Spending' : 'Start Your Prediction Journey'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {transactions.length > 0 
                ? `Analyze your ${transactions.length} transactions to get personalized spending forecasts and insights.`
                : 'Add some transactions to unlock AI-powered expense predictions and spending pattern analysis.'
              }
            </p>
            <div className="flex gap-2 justify-center">
              <Button 
                onClick={runPredictions}
                disabled={transactions.length === 0 || !serviceAvailable}
              >
                {transactions.length > 0 ? 'Analyze My Spending' : 'Add Transactions First'}
              </Button>
              {transactions.length === 0 && (
                <Button variant="outline" onClick={runDemoPrediction} disabled={!serviceAvailable}>
                  Try Demo
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}