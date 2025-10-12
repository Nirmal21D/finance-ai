"""
Market Data Service
Integrates with multiple APIs to provide real-time financial market data
Supports stocks, cryptocurrencies, currencies, and financial news
"""

import yfinance as yf
import aiohttp
import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import json
import os
from dataclasses import dataclass

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class StockData:
    """Stock data structure"""
    symbol: str
    name: str
    price: float
    change: float
    change_percent: float
    volume: int
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    last_updated: Optional[str] = None

@dataclass
class CryptoData:
    """Cryptocurrency data structure"""
    symbol: str
    name: str
    price: float
    change_24h: float
    change_percent_24h: float
    market_cap: float
    volume_24h: float
    last_updated: Optional[str] = None

@dataclass
class CurrencyRate:
    """Currency exchange rate structure"""
    from_currency: str
    to_currency: str
    rate: float
    last_updated: Optional[str] = None

@dataclass
class NewsItem:
    """Financial news item structure"""
    title: str
    summary: str
    url: str
    source: str
    published_at: str
    sentiment: Optional[str] = None

class MarketDataService:
    """
    Advanced market data service providing real-time financial information
    """
    
    def __init__(self):
        self.session = None
        
        # Popular symbols to track
        self.popular_stocks = [
            'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 
            'META', 'NVDA', 'NFLX', 'UBER', 'SPOT'
        ]
        
        self.popular_crypto = [
            'bitcoin', 'ethereum', 'binancecoin', 'cardano', 
            'solana', 'polkadot', 'dogecoin', 'avalanche-2'
        ]
        
        # API endpoints
        self.coingecko_api = "https://api.coingecko.com/api/v3"
        self.exchange_api = "https://api.exchangerate-api.com/v4/latest"
        self.news_api = "https://newsapi.org/v2"
        
        # Cache for API responses (simple in-memory cache)
        self.cache = {}
        self.cache_duration = 300  # 5 minutes

    async def get_session(self) -> aiohttp.ClientSession:
        """Get or create HTTP session"""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
        return self.session

    async def close_session(self):
        """Close HTTP session"""
        if self.session and not self.session.closed:
            await self.session.close()

    def is_cache_valid(self, cache_key: str) -> bool:
        """Check if cached data is still valid"""
        if cache_key not in self.cache:
            return False
        
        cached_time = self.cache[cache_key].get('timestamp', 0)
        return (datetime.now().timestamp() - cached_time) < self.cache_duration

    def get_from_cache(self, cache_key: str) -> Optional[Any]:
        """Get data from cache if valid"""
        if self.is_cache_valid(cache_key):
            return self.cache[cache_key]['data']
        return None

    def save_to_cache(self, cache_key: str, data: Any):
        """Save data to cache with timestamp"""
        self.cache[cache_key] = {
            'data': data,
            'timestamp': datetime.now().timestamp()
        }

    async def get_stock_data(self, symbol: str) -> Optional[StockData]:
        """
        Get real-time stock data using yfinance
        """
        cache_key = f"stock_{symbol}"
        cached_data = self.get_from_cache(cache_key)
        if cached_data:
            return cached_data

        try:
            logger.info(f"Fetching stock data for {symbol}")
            
            # Create ticker object
            ticker = yf.Ticker(symbol)
            
            # Get current info
            info = ticker.info
            history = ticker.history(period="2d")
            
            if history.empty:
                logger.warning(f"No history data for {symbol}")
                return None

            current_price = history['Close'].iloc[-1]
            previous_price = history['Close'].iloc[-2] if len(history) > 1 else current_price
            
            change = current_price - previous_price
            change_percent = (change / previous_price) * 100 if previous_price != 0 else 0

            stock_data = StockData(
                symbol=symbol.upper(),
                name=info.get('longName', symbol),
                price=float(current_price),
                change=float(change),
                change_percent=float(change_percent),
                volume=int(info.get('volume', 0)),
                market_cap=info.get('marketCap'),
                pe_ratio=info.get('trailingPE'),
                last_updated=datetime.now().isoformat()
            )
            
            # Cache the result
            self.save_to_cache(cache_key, stock_data)
            return stock_data
            
        except Exception as e:
            logger.error(f"Failed to fetch stock data for {symbol}: {e}")
            return None

    async def get_multiple_stocks(self, symbols: List[str] = None) -> List[StockData]:
        """
        Get stock data for multiple symbols
        """
        if symbols is None:
            symbols = self.popular_stocks

        # Use asyncio.gather to fetch all stocks concurrently
        tasks = [self.get_stock_data(symbol) for symbol in symbols]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out None results and exceptions
        stock_data = []
        for result in results:
            if isinstance(result, StockData):
                stock_data.append(result)
            elif isinstance(result, Exception):
                logger.error(f"Stock data fetch error: {result}")
        
        return stock_data

    async def get_crypto_data(self, coins: List[str] = None) -> List[CryptoData]:
        """
        Get cryptocurrency data using CoinGecko API
        """
        if coins is None:
            coins = self.popular_crypto

        cache_key = f"crypto_{'_'.join(coins)}"
        cached_data = self.get_from_cache(cache_key)
        if cached_data:
            return cached_data

        try:
            logger.info(f"Fetching crypto data for {len(coins)} coins")
            
            session = await self.get_session()
            coins_str = ','.join(coins)
            url = f"{self.coingecko_api}/simple/price"
            
            params = {
                'ids': coins_str,
                'vs_currencies': 'usd',
                'include_24hr_change': 'true',
                'include_market_cap': 'true',
                'include_24hr_vol': 'true'
            }
            
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    crypto_data = []
                    for coin_id in coins:
                        if coin_id in data:
                            coin_info = data[coin_id]
                            crypto_data.append(CryptoData(
                                symbol=coin_id,
                                name=coin_id.replace('-', ' ').title(),
                                price=coin_info['usd'],
                                change_24h=coin_info.get('usd_24h_change', 0),
                                change_percent_24h=coin_info.get('usd_24h_change', 0),
                                market_cap=coin_info.get('usd_market_cap', 0),
                                volume_24h=coin_info.get('usd_24h_vol', 0),
                                last_updated=datetime.now().isoformat()
                            ))
                    
                    # Cache the result
                    self.save_to_cache(cache_key, crypto_data)
                    return crypto_data
                else:
                    logger.error(f"CoinGecko API error: {response.status}")
                    
        except Exception as e:
            logger.error(f"Failed to fetch crypto data: {e}")
        
        return []

    async def get_currency_rates(self, base_currency: str = "USD") -> List[CurrencyRate]:
        """
        Get currency exchange rates
        """
        cache_key = f"currency_{base_currency}"
        cached_data = self.get_from_cache(cache_key)
        if cached_data:
            return cached_data

        try:
            logger.info(f"Fetching currency rates for base {base_currency}")
            
            session = await self.get_session()
            url = f"{self.exchange_api}/{base_currency}"
            
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    rates = data.get('rates', {})
                    
                    # Focus on major currencies
                    major_currencies = ['EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR']
                    
                    currency_data = []
                    for currency in major_currencies:
                        if currency in rates and currency != base_currency:
                            currency_data.append(CurrencyRate(
                                from_currency=base_currency,
                                to_currency=currency,
                                rate=rates[currency],
                                last_updated=data.get('date', datetime.now().isoformat())
                            ))
                    
                    # Cache the result
                    self.save_to_cache(cache_key, currency_data)
                    return currency_data
                else:
                    logger.error(f"Exchange rate API error: {response.status}")
                    
        except Exception as e:
            logger.error(f"Failed to fetch currency rates: {e}")
        
        return []

    async def get_financial_news(self, category: str = "business", count: int = 10) -> List[NewsItem]:
        """
        Get financial news (placeholder implementation)
        Note: Requires NewsAPI key for full implementation
        """
        cache_key = f"news_{category}_{count}"
        cached_data = self.get_from_cache(cache_key)
        if cached_data:
            return cached_data

        # For now, return dummy news data
        # In production, integrate with NewsAPI or other news sources
        dummy_news = [
            NewsItem(
                title="Stock Market Reaches New Highs",
                summary="Major indices continue their upward trajectory as investors remain optimistic.",
                url="https://example.com/news/1",
                source="Financial Times",
                published_at=datetime.now().isoformat(),
                sentiment="positive"
            ),
            NewsItem(
                title="Cryptocurrency Market Shows Volatility",
                summary="Bitcoin and major altcoins experience significant price movements.",
                url="https://example.com/news/2", 
                source="CoinDesk",
                published_at=(datetime.now() - timedelta(hours=2)).isoformat(),
                sentiment="neutral"
            ),
            NewsItem(
                title="Federal Reserve Announces Interest Rate Decision",
                summary="Central bank maintains current monetary policy stance.",
                url="https://example.com/news/3",
                source="Reuters",
                published_at=(datetime.now() - timedelta(hours=4)).isoformat(),
                sentiment="neutral"
            )
        ]
        
        # Cache the dummy data
        self.save_to_cache(cache_key, dummy_news[:count])
        return dummy_news[:count]

    async def get_market_overview(self) -> Dict[str, Any]:
        """
        Get comprehensive market overview
        """
        try:
            logger.info("Fetching comprehensive market overview")
            
            # Fetch all data concurrently
            stocks_task = self.get_multiple_stocks()
            crypto_task = self.get_crypto_data()
            currencies_task = self.get_currency_rates()
            news_task = self.get_financial_news(count=5)
            
            stocks, crypto, currencies, news = await asyncio.gather(
                stocks_task, crypto_task, currencies_task, news_task,
                return_exceptions=True
            )
            
            # Handle exceptions
            if isinstance(stocks, Exception):
                logger.error(f"Stocks fetch failed: {stocks}")
                stocks = []
            if isinstance(crypto, Exception):
                logger.error(f"Crypto fetch failed: {crypto}")
                crypto = []
            if isinstance(currencies, Exception):
                logger.error(f"Currencies fetch failed: {currencies}")
                currencies = []
            if isinstance(news, Exception):
                logger.error(f"News fetch failed: {news}")
                news = []
            
            return {
                "stocks": [stock.__dict__ if stock else {} for stock in stocks],
                "crypto": [coin.__dict__ if coin else {} for coin in crypto],
                "currencies": [rate.__dict__ if rate else {} for rate in currencies],
                "news": [item.__dict__ if item else {} for item in news],
                "last_updated": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to fetch market overview: {e}")
            return {
                "stocks": [],
                "crypto": [],
                "currencies": [],
                "news": [],
                "last_updated": datetime.now().isoformat(),
                "error": str(e)
            }

# Global instance
market_data_service = MarketDataService()