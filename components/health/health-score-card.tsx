'use client'

import React, { useState, useEffect } from 'react'
import { 
  financialHealthService, 
  FinancialHealthService,
  type Transaction, 
  type Budget,
  type QuickHealthCheck
} from '@/lib/financial-health-service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { 
  Shield, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertCircle, 
  ExternalLink,
  RefreshCw
} from 'lucide-react'

interface HealthScoreCardProps {
  transactions?: Transaction[]
  budgets?: Budget[]
  showDetails?: boolean
  className?: string
}

export function HealthScoreCard({ 
  transactions = [], 
  budgets = [],
  showDetails = false,
  className = '' 
}: HealthScoreCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quickCheck, setQuickCheck] = useState<QuickHealthCheck | null>(null)
  const [serviceAvailable, setServiceAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    checkService()
  }, [])

  useEffect(() => {
    if (serviceAvailable && transactions.length > 0) {
      calculateQuickScore()
    }
  }, [transactions, budgets, serviceAvailable])

  const checkService = async () => {
    const available = await financialHealthService.isServiceAvailable()
    setServiceAvailable(available)
    if (!available) {
      setError('Health scoring service unavailable')
    }
  }

  const calculateQuickScore = async () => {
    if (!serviceAvailable) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await financialHealthService.getQuickHealthCheck(transactions, budgets)
      setQuickCheck(result)
    } catch (err) {
      setError('Failed to calculate health score')
    } finally {
      setIsLoading(false)
    }
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

  const getStatusColor = (color: string) => {
    switch (color) {
      case 'green': return 'text-green-600 bg-green-50'
      case 'yellow': return 'text-yellow-600 bg-yellow-50'
      case 'orange': return 'text-orange-600 bg-orange-50'
      case 'red': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (isLoading) {
    return (
      <Card className={`${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Financial Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <div className="flex items-center gap-3">
              <Spinner />
              <span className="text-sm">Calculating...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !quickCheck) {
    return (
      <Card className={`${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-600" />
            Financial Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-3">
              {error || 'Add transactions to see your health score'}
            </p>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={calculateQuickScore}
              disabled={!serviceAvailable}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {serviceAvailable ? 'Retry' : 'Service Unavailable'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Financial Health Score
          </div>
          {showDetails && (
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => window.location.href = '/health'}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          Overall assessment of your financial wellness
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Score Display */}
          <div className={`p-4 rounded-lg text-center ${getStatusColor(quickCheck.status_color)}`}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-3xl font-bold">
                {quickCheck.overall_score.toFixed(0)}%
              </span>
              <span className="text-2xl">
                {FinancialHealthService.getGradeEmoji(quickCheck.grade)}
              </span>
            </div>
            <Badge variant="outline" className="mb-2">
              Grade: {quickCheck.grade}
            </Badge>
            <div className="text-sm">
              {quickCheck.summary_message}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Health Score</span>
              <span>{quickCheck.overall_score.toFixed(0)}%</span>
            </div>
            <Progress value={quickCheck.overall_score} className="h-2" />
          </div>

          {/* Top Priority Action */}
          <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
            <h4 className="text-sm font-semibold text-blue-800 mb-1">Priority Action</h4>
            <p className="text-xs text-blue-700">{quickCheck.top_priority}</p>
          </div>

          {showDetails && (
            <div className="pt-2">
              <Button 
                className="w-full" 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/health'}
              >
                View Detailed Analysis
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}