'use client'

import React, { useState, useEffect } from 'react'
import { marketDataService, type MarketOverview } from '@/lib/market-data-service'
import { StockTracker } from './stock-tracker'
import { CryptoTracker } from './crypto-tracker'
import { NewsTicker } from './news-ticker'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TrendingUp, TrendingDown, RefreshCw, AlertCircle, BarChart3, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface MarketDashboardProps {
  className?: string
}

export function MarketDashboard({ className = '' }: MarketDashboardProps) {
  const [marketData, setMarketData] = useState<MarketOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [serviceAvailable, setServiceAvailable] = useState<boolean | null>(null)

  const checkServiceAndFetchData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Check if service is available
      const available = await marketDataService.isServiceAvailable()
      setServiceAvailable(available)

      if (!available) {
        setError('Market data service is not available. Please ensure the Python server is running.')
        return
      }

      // Fetch market data
      const data = await marketDataService.getMarketOverview()
      setMarketData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch market data')
      setServiceAvailable(false)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkServiceAndFetchData()
    
    // Auto-refresh every 10 minutes
    const interval = setInterval(checkServiceAndFetchData, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Market Dashboard Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={checkServiceAndFetchData} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Market Dashboard
          </h2>
          <p className="text-muted-foreground">
            Real-time financial market data and insights
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={serviceAvailable ? "default" : "destructive"}>
            {serviceAvailable ? "Live" : "Offline"}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={checkServiceAndFetchData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Service Status */}
      {!serviceAvailable && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Market data service is unavailable. Make sure the Python server is running on port 8001.
          </AlertDescription>
        </Alert>
      )}

      {/* Market Overview Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stocks">Stocks</TabsTrigger>
          <TabsTrigger value="crypto">Crypto</TabsTrigger>
          <TabsTrigger value="news">News</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[...Array(3)].map((_, j) => (
                        <div key={j} className="flex justify-between">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <StockTracker />
              <CryptoTracker />
              <NewsTicker count={3} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="stocks">
          <StockTracker className="max-w-2xl" />
        </TabsContent>

        <TabsContent value="crypto">
          <CryptoTracker className="max-w-2xl" />
        </TabsContent>

        <TabsContent value="news">
          <NewsTicker count={10} className="max-w-3xl" />
        </TabsContent>
      </Tabs>

      {/* Market Summary */}
      {marketData && !isLoading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Market Summary
            </CardTitle>
            <CardDescription>
              Last updated: {new Date(marketData.last_updated).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {marketData.stocks.length}
                </div>
                <div className="text-sm text-gray-500">Stocks Tracked</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {marketData.crypto.length}
                </div>
                <div className="text-sm text-gray-500">Cryptocurrencies</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {marketData.currencies.length}
                </div>
                <div className="text-sm text-gray-500">Currency Pairs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {marketData.news.length}
                </div>
                <div className="text-sm text-gray-500">News Articles</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}