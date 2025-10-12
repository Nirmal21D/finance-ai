'use client'

import React, { useState, useEffect } from 'react'
import { marketDataService, type CryptoData } from '@/lib/market-data-service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TrendingUp, TrendingDown, Minus, RefreshCw, AlertCircle, Bitcoin } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CryptoTrackerProps {
  coins?: string[]
  className?: string
}

export function CryptoTracker({ coins, className = '' }: CryptoTrackerProps) {
  const [cryptos, setCryptos] = useState<CryptoData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  const fetchCryptos = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const cryptoData = await marketDataService.getCryptoData(coins)
      setCryptos(cryptoData)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch crypto data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCryptos()
    
    // Auto-refresh every 2 minutes for crypto (more volatile)
    const interval = setInterval(fetchCryptos, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [coins])

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

  const getCryptoIcon = (symbol: string) => {
    // Simple icon mapping - in production you'd use proper crypto icons
    const iconMap: { [key: string]: string } = {
      'bitcoin': '₿',
      'ethereum': 'Ξ',
      'binancecoin': 'BNB',
      'cardano': '₳',
      'solana': 'SOL',
      'polkadot': 'DOT',
      'dogecoin': 'Ð',
      'avalanche-2': 'AVAX'
    }
    
    return iconMap[symbol] || symbol.charAt(0).toUpperCase()
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Crypto Tracker Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchCryptos} className="mt-4">
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
            <CardTitle className="flex items-center gap-2">
              <Bitcoin className="h-5 w-5" />
              Cryptocurrency
            </CardTitle>
            <CardDescription>
              Real-time crypto prices {lastUpdated && `• Updated ${lastUpdated}`}
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchCryptos}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
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
        ) : cryptos.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No crypto data available</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cryptos.map((crypto) => (
              <div
                key={crypto.symbol}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-orange-700">
                      {getCryptoIcon(crypto.symbol)}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{crypto.name}</div>
                    <div className="text-xs text-gray-500 uppercase">
                      {crypto.symbol}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-semibold">
                    {marketDataService.formatCurrency(crypto.price)}
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${getChangeColor(crypto.change_24h)}`}>
                    {getTrendIcon(crypto.change_24h)}
                    <span>{marketDataService.formatPercentage(crypto.change_percent_24h)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {cryptos.length > 0 && (
          <div className="mt-4 pt-3 border-t">
            <p className="text-xs text-gray-500 text-center">
              24h volume: {cryptos.reduce((sum, crypto) => sum + crypto.volume_24h, 0).toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
                notation: 'compact',
                maximumFractionDigits: 1
              })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}