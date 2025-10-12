'use client'

import React, { useState, useEffect } from 'react'
import { 
  financialHealthService, 
  FinancialHealthService,
  type Transaction, 
  type Budget,
  type FinancialGoal,
  type FinancialHealthScore,
  type HealthInsights,
  type QuickHealthCheck
} from '@/lib/financial-health-service'
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
  Shield,
  PiggyBank,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Users,
  Trophy,
  Zap
} from 'lucide-react'

interface FinancialHealthDashboardProps {
  transactions?: Transaction[]
  budgets?: Budget[]
  goals?: FinancialGoal[]
  className?: string
}

export function FinancialHealthDashboard({ 
  transactions = [], 
  budgets = [],
  goals = [],
  className = '' 
}: FinancialHealthDashboardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [serviceAvailable, setServiceAvailable] = useState<boolean | null>(null)
  
  // Health score states
  const [healthScore, setHealthScore] = useState<FinancialHealthScore | null>(null)
  const [quickCheck, setQuickCheck] = useState<QuickHealthCheck | null>(null)
  const [insights, setInsights] = useState<HealthInsights | null>(null)
  
  const [activeTab, setActiveTab] = useState('overview')

  // Check service availability on mount
  useEffect(() => {
    checkServiceAvailability()
  }, [])

  // Auto-calculate when transaction data changes
  useEffect(() => {
    if (serviceAvailable && transactions.length > 0) {
      calculateHealthScore()
    }
  }, [transactions, budgets, goals, serviceAvailable])

  const checkServiceAvailability = async () => {
    try {
      const available = await financialHealthService.isServiceAvailable()
      setServiceAvailable(available)
      if (!available) {
        setError('Health scoring service is not available. Please ensure the Python server is running.')
      }
    } catch (err) {
      setServiceAvailable(false)
      setError('Failed to connect to health scoring service')
    }
  }

  const calculateHealthScore = async () => {
    if (!serviceAvailable) {
      setError('Health scoring service is not available')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('🏥 Running health score calculation with:', transactions.length, 'transactions')
      
      // Run calculations in parallel
      const [healthScoreResult, quickCheckResult, insightsResult] = await Promise.all([
        financialHealthService.calculateHealthScore(transactions, budgets, goals),
        financialHealthService.getQuickHealthCheck(transactions, budgets),
        financialHealthService.getHealthInsights(transactions, budgets, goals)
      ])

      console.log('✅ Health calculations completed')
      setHealthScore(healthScoreResult)
      setQuickCheck(quickCheckResult)
      setInsights(insightsResult)
      
    } catch (err) {
      console.error('❌ Health calculation error:', err)
      setError('Failed to calculate health score. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    return FinancialHealthService.getScoreColor(score)
  }

  const getScoreBackground = (score: number) => {
    return FinancialHealthService.getScoreBackgroundColor(score)
  }

  const getGradeEmoji = (grade: string) => {
    return FinancialHealthService.getGradeEmoji(grade)
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'good':
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />
      case 'fair':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'poor':
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  // Show loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Financial Health Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="flex items-center gap-3">
              <Spinner />
              <span>Calculating your financial health score...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-600" />
            Financial Health Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={checkServiceAvailability}
                className="ml-3"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Show empty state if no data
  if (!healthScore && transactions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Financial Health Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Add transactions to see your financial health score</p>
            <Button onClick={() => window.location.href = '/transactions'}>
              Add Transactions
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Quick Health Overview */}
      {quickCheck && (
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Financial Health Score
              </div>
              <Badge variant="outline" className="text-sm">
                Last updated: {new Date().toLocaleDateString()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Overall Score */}
              <div className={`text-center p-4 rounded-lg ${getScoreBackground(quickCheck.overall_score)}`}>
                <div className="text-3xl font-bold flex items-center justify-center gap-2">
                  <span className={getScoreColor(quickCheck.overall_score)}>
                    {quickCheck.overall_score.toFixed(0)}%
                  </span>
                  <span className="text-2xl">
                    {getGradeEmoji(quickCheck.grade)}
                  </span>
                </div>
                <div className="text-lg font-semibold mt-1">
                  Grade: {quickCheck.grade}
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  {quickCheck.summary_message}
                </div>
              </div>

              {/* Top Priority */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Priority Action</h4>
                  <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                    <p className="text-sm text-blue-800">{quickCheck.top_priority}</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-700">Quick Actions</h4>
                <div className="space-y-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setActiveTab('metrics')}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Detailed Metrics
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setActiveTab('insights')}
                  >
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Get Recommendations
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Health Analysis */}
      {healthScore && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Metrics
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Trends
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-green-600" />
                    Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {healthScore.strengths.map((strength, index) => (
                      <div key={index} className="flex items-start gap-2 p-2 bg-green-50 rounded">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-green-800">{strength}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    Areas for Improvement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {healthScore.weaknesses.map((weakness, index) => (
                      <div key={index} className="flex items-start gap-2 p-2 bg-orange-50 rounded">
                        <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-orange-800">{weakness}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Priority Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  Priority Actions
                </CardTitle>
                <CardDescription>
                  Top recommendations to improve your financial health
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {healthScore.priority_actions.map((action, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">
                        {index + 1}
                      </div>
                      <span className="text-sm">{action}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            {/* Individual Health Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { metric: healthScore.emergency_fund_score, icon: Shield, color: 'blue' },
                { metric: healthScore.debt_to_income_score, icon: AlertCircle, color: 'red' },
                { metric: healthScore.savings_rate_score, icon: PiggyBank, color: 'green' },
                { metric: healthScore.spending_stability_score, icon: BarChart3, color: 'purple' },
                { metric: healthScore.budget_adherence_score, icon: Target, color: 'orange' },
                { metric: healthScore.investment_diversification_score, icon: TrendingUp, color: 'indigo' }
              ].map(({ metric, icon: Icon, color }, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 text-${color}-600`} />
                        {metric.name}
                      </div>
                      {getStatusIcon(metric.status)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-2xl font-bold ${getScoreColor(metric.score)}`}>
                          {metric.score.toFixed(0)}%
                        </span>
                        <Badge variant={
                          metric.status === 'excellent' ? 'default' :
                          metric.status === 'good' ? 'secondary' :
                          metric.status === 'fair' ? 'outline' : 'destructive'
                        }>
                          {metric.status}
                        </Badge>
                      </div>
                      <Progress value={metric.score} className="h-2" />
                      <div className="space-y-2">
                        <p className="text-xs text-gray-600">{metric.description}</p>
                        <p className="text-xs text-blue-600 font-medium">{metric.recommendation}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            {insights && (
              <>
                {/* Improvement Potential */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-green-600" />
                      Improvement Potential
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center p-4">
                      <div className="text-3xl font-bold text-green-600 mb-2">
                        +{insights.improvement_potential.toFixed(0)} points
                      </div>
                      <p className="text-gray-600 mb-4">
                        Potential score increase with focused improvements
                      </p>
                      {insights.next_grade_threshold.next_grade && (
                        <div className="bg-green-50 p-3 rounded-lg">
                          <p className="text-sm text-green-800">
                            <strong>{insights.next_grade_threshold.points_needed?.toFixed(0)} more points</strong> needed to reach <strong>Grade {insights.next_grade_threshold.next_grade}</strong>
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Financial Wellness Tips */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-yellow-600" />
                      Personalized Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {insights.financial_wellness_tips.map((tip, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                          <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-yellow-800">{tip}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recommended Tools */}
                {insights.recommended_tools.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-blue-600" />
                        Recommended Tools
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {insights.recommended_tools.map((tool, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                            <div className={`w-2 h-2 rounded-full mt-2 ${
                              tool.priority === 'high' ? 'bg-red-400' :
                              tool.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                            }`} />
                            <div>
                              <h4 className="font-medium text-sm">{tool.name}</h4>
                              <p className="text-xs text-gray-600">{tool.purpose}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            {/* Score Trends */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getTrendIcon(healthScore.score_trend)}
                    Score Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-2xl font-bold mb-2">
                      {healthScore.score_trend.charAt(0).toUpperCase() + healthScore.score_trend.slice(1)}
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Your financial health is currently {healthScore.score_trend}
                    </p>
                    {healthScore.predicted_3_month_score && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>3-month prediction:</strong> {healthScore.predicted_3_month_score.toFixed(0)}%
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    Peer Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    {healthScore.peer_percentile && (
                      <>
                        <div className="text-2xl font-bold text-purple-600 mb-2">
                          {healthScore.peer_percentile}th
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                          percentile
                        </p>
                        <div className="bg-purple-50 p-3 rounded-lg">
                          <p className="text-xs text-purple-800">
                            You're doing better than {healthScore.peer_percentile}% of users with similar profiles
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Goals Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-600" />
                  Goals Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-4">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {healthScore.financial_goals_on_track}
                  </div>
                  <p className="text-gray-600">
                    Financial goals on track
                  </p>
                  {healthScore.financial_goals_on_track === 0 && (
                    <Button 
                      className="mt-4"
                      onClick={() => window.location.href = '/goals'}
                    >
                      Set Financial Goals
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}