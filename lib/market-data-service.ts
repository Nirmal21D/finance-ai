/**
 * Market Data Service
 * Frontend service for integrating with Python market data APIs
 */

export interface StockData {
  symbol: string
  name: string
  price: number
  change: number
  change_percent: number
  volume: number
  market_cap?: number
  pe_ratio?: number
  last_updated?: string
}

export interface CryptoData {
  symbol: string
  name: string
  price: number
  change_24h: number
  change_percent_24h: number
  market_cap: number
  volume_24h: number
  last_updated?: string
}

export interface CurrencyRate {
  from_currency: string
  to_currency: string
  rate: number
  last_updated?: string
}

export interface NewsItem {
  title: string
  summary: string
  url: string
  source: string
  published_at: string
  sentiment?: string
}

export interface MarketOverview {
  stocks: StockData[]
  crypto: CryptoData[]
  currencies: CurrencyRate[]
  news: NewsItem[]
  last_updated: string
}

export interface APIStatus {
  status: string
  message: string
  timestamp: string
}

export class MarketDataService {
  private static instance: MarketDataService
  private baseUrl: string
  private timeout: number

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_ML_SERVER_URL || 'http://localhost:8001'
    this.timeout = 15000 // 15 seconds for market data requests
  }

  static getInstance(): MarketDataService {
    if (!MarketDataService.instance) {
      MarketDataService.instance = new MarketDataService()
    }
    return MarketDataService.instance
  }

  /**
   * Check if the market data service is available
   */
  async isServiceAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/market/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout for health check
      })
      return response.ok
    } catch (error) {
      console.error('Market data service health check failed:', error)
      return false
    }
  }

  /**
   * Get real-time stock data for a specific symbol
   */
  async getStockData(symbol: string): Promise<StockData | null> {
    try {
      console.log(`Fetching stock data for ${symbol}`)

      const response = await fetch(`${this.baseUrl}/api/market/stocks/${symbol.toUpperCase()}`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.timeout)
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Stock symbol ${symbol} not found`)
        }
        throw new Error(`Failed to fetch stock data: ${response.status}`)
      }

      const stockData = await response.json()
      console.log(`Stock data for ${symbol}:`, stockData)
      
      return stockData

    } catch (error) {
      console.error(`Error fetching stock data for ${symbol}:`, error)
      return null
    }
  }

  /**
   * Get stock data for multiple symbols
   */
  async getMultipleStocks(symbols?: string[]): Promise<StockData[]> {
    try {
      console.log(`Fetching multiple stocks:`, symbols)

      const url = new URL(`${this.baseUrl}/api/market/stocks`)
      if (symbols && symbols.length > 0) {
        url.searchParams.set('symbols', symbols.join(','))
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        signal: AbortSignal.timeout(this.timeout)
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch stocks data: ${response.status}`)
      }

      const stocksData = await response.json()
      console.log(`Fetched ${stocksData.length} stocks`)
      
      return stocksData

    } catch (error) {
      console.error('Error fetching multiple stocks:', error)
      return []
    }
  }

  /**
   * Get cryptocurrency data
   */
  async getCryptoData(coins?: string[]): Promise<CryptoData[]> {
    try {
      console.log(`Fetching crypto data:`, coins)

      const url = new URL(`${this.baseUrl}/api/market/crypto`)
      if (coins && coins.length > 0) {
        url.searchParams.set('coins', coins.join(','))
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        signal: AbortSignal.timeout(this.timeout)
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch crypto data: ${response.status}`)
      }

      const cryptoData = await response.json()
      console.log(`Fetched ${cryptoData.length} cryptocurrencies`)
      
      return cryptoData

    } catch (error) {
      console.error('Error fetching crypto data:', error)
      return []
    }
  }

  /**
   * Get currency exchange rates
   */
  async getCurrencyRates(baseCurrency: string = 'USD'): Promise<CurrencyRate[]> {
    try {
      console.log(`Fetching currency rates for base ${baseCurrency}`)

      const url = new URL(`${this.baseUrl}/api/market/currencies`)
      url.searchParams.set('base', baseCurrency.toUpperCase())

      const response = await fetch(url.toString(), {
        method: 'GET',
        signal: AbortSignal.timeout(this.timeout)
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch currency rates: ${response.status}`)
      }

      const currencyData = await response.json()
      console.log(`Fetched ${currencyData.length} currency rates`)
      
      return currencyData

    } catch (error) {
      console.error('Error fetching currency rates:', error)
      return []
    }
  }

  /**
   * Get financial news
   */
  async getFinancialNews(category: string = 'business', count: number = 10): Promise<NewsItem[]> {
    try {
      console.log(`Fetching financial news: category=${category}, count=${count}`)

      const url = new URL(`${this.baseUrl}/api/market/news`)
      url.searchParams.set('category', category)
      url.searchParams.set('count', count.toString())

      const response = await fetch(url.toString(), {
        method: 'GET',
        signal: AbortSignal.timeout(this.timeout)
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch financial news: ${response.status}`)
      }

      const newsData = await response.json()
      console.log(`Fetched ${newsData.length} news items`)
      
      return newsData

    } catch (error) {
      console.error('Error fetching financial news:', error)
      return []
    }
  }

  /**
   * Get comprehensive market overview
   */
  async getMarketOverview(): Promise<MarketOverview | null> {
    try {
      console.log('Fetching comprehensive market overview')

      const response = await fetch(`${this.baseUrl}/api/market/overview`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.timeout)
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch market overview: ${response.status}`)
      }

      const overviewData = await response.json()
      console.log('Market overview fetched:', {
        stocks: overviewData.stocks.length,
        crypto: overviewData.crypto.length,
        currencies: overviewData.currencies.length,
        news: overviewData.news.length
      })
      
      return overviewData

    } catch (error) {
      console.error('Error fetching market overview:', error)
      return null
    }
  }

  /**
   * Format currency values
   */
  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  /**
   * Format percentage values
   */
  formatPercentage(value: number): string {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(2)}%`
  }

  /**
   * Get color for percentage changes
   */
  getChangeColor(change: number): string {
    if (change > 0) return '#10b981' // green
    if (change < 0) return '#ef4444' // red
    return '#6b7280' // gray
  }

  /**
   * Get popular stock symbols
   */
  getPopularStocks(): string[] {
    return ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'UBER', 'SPOT']
  }

  /**
   * Get popular cryptocurrency symbols
   */
  getPopularCrypto(): string[] {
    return ['bitcoin', 'ethereum', 'binancecoin', 'cardano', 'solana', 'polkadot', 'dogecoin', 'avalanche-2']
  }

  /**
   * Get major currency codes
   */
  getMajorCurrencies(): string[] {
    return ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR']
  }

  /**
   * Format news publication date
   */
  formatNewsDate(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffHours < 1) {
      return 'Just now'
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else if (diffDays < 7) {
      return `${diffDays}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  /**
   * Get sentiment color for news
   */
  getSentimentColor(sentiment?: string): string {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return '#10b981' // green
      case 'negative':
        return '#ef4444' // red
      case 'neutral':
      default:
        return '#6b7280' // gray
    }
  }
}

// Export singleton instance
export const marketDataService = MarketDataService.getInstance()