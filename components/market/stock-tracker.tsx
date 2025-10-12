'use client'

import React, { useState, useEffect } from 'react'
import { marketDataService, type StockData } from '@/lib/market-data-service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TrendingUp, TrendingDown, Minus, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StockTrackerProps {
  symbols?: string[]
  className?: string
}

export function StockTracker({ symbols, className = '' }: StockTrackerProps) {
  const [stocks, setStocks] = useState<StockData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  const fetchStocks = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const stockData = await marketDataService.getMultipleStocks(symbols)
      setStocks(stockData)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stock data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStocks()
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchStocks, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [symbols])

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-gray-500" />
  }

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600'
    if (change < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Stock Tracker Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchStocks} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Stock Market</CardTitle>
            <CardDescription>
              Real-time stock prices {lastUpdated && `• Updated ${lastUpdated}`}
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchStocks}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : stocks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No stock data available</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stocks.map((stock) => (
              <div
                key={stock.symbol}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-semibold text-blue-700">
                      {stock.symbol.substring(0, 2)}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{stock.symbol}</div>
                    <div className="text-xs text-gray-500 truncate max-w-32">
                      {stock.name}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-semibold">
                    {marketDataService.formatCurrency(stock.price)}
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${getChangeColor(stock.change)}`}>
                    {getTrendIcon(stock.change)}
                    <span>{marketDataService.formatPercentage(stock.change_percent)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}