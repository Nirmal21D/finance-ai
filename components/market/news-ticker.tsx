'use client'

import React, { useState, useEffect } from 'react'
import { marketDataService, type NewsItem } from '@/lib/market-data-service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Newspaper, ExternalLink, RefreshCw, AlertCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NewsTickerProps {
  category?: string
  count?: number
  className?: string
}

export function NewsTicker({ category = 'business', count = 5, className = '' }: NewsTickerProps) {
  const [news, setNews] = useState<NewsItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  const fetchNews = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const newsData = await marketDataService.getFinancialNews(category, count)
      setNews(newsData)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch news')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchNews()
    
    // Auto-refresh every 15 minutes
    const interval = setInterval(fetchNews, 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [category, count])

  const getSentimentBadge = (sentiment?: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return <Badge variant="default" className="bg-green-100 text-green-800">Positive</Badge>
      case 'negative':
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Negative</Badge>
      case 'neutral':
        return <Badge variant="secondary">Neutral</Badge>
      default:
        return null
    }
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Financial News Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchNews} className="mt-4">
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
              <Newspaper className="h-5 w-5" />
              Financial News
            </CardTitle>
            <CardDescription>
              Latest market updates {lastUpdated && `• Updated ${lastUpdated}`}
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchNews}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-12" />
                </div>
              </div>
            ))}
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No news available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {news.map((item, index) => (
              <div key={index} className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm leading-5 hover:text-blue-600 transition-colors">
                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-start gap-2"
                    >
                      <span className="flex-1">{item.title}</span>
                      <ExternalLink className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    </a>
                  </h3>
                  
                  <p className="text-sm text-gray-600 leading-5">
                    {item.summary}
                  </p>
                  
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {item.source}
                      </Badge>
                      {getSentimentBadge(item.sentiment)}
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>{marketDataService.formatNewsDate(item.published_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {news.length > 0 && (
          <div className="mt-4 pt-3 border-t">
            <p className="text-xs text-gray-500 text-center">
              Stay informed with the latest financial market updates
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}