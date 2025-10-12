"""
Market Data API Endpoints
RESTful APIs for accessing real-time financial market data
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
import logging
from services.market_data_service import market_data_service, StockData, CryptoData, CurrencyRate, NewsItem

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Pydantic models for API responses
class StockResponse(BaseModel):
    symbol: str
    name: str
    price: float
    change: float
    change_percent: float
    volume: int
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    last_updated: Optional[str] = None

class CryptoResponse(BaseModel):
    symbol: str
    name: str
    price: float
    change_24h: float
    change_percent_24h: float
    market_cap: float
    volume_24h: float
    last_updated: Optional[str] = None

class CurrencyResponse(BaseModel):
    from_currency: str
    to_currency: str
    rate: float
    last_updated: Optional[str] = None

class NewsResponse(BaseModel):
    title: str
    summary: str
    url: str
    source: str
    published_at: str
    sentiment: Optional[str] = None

class MarketOverviewResponse(BaseModel):
    stocks: List[StockResponse]
    crypto: List[CryptoResponse]  
    currencies: List[CurrencyResponse]
    news: List[NewsResponse]
    last_updated: str

class APIStatusResponse(BaseModel):
    status: str
    message: str
    timestamp: str

@router.get("/health", response_model=APIStatusResponse)
async def market_health_check():
    """
    Health check endpoint for market data service
    """
    return APIStatusResponse(
        status="healthy",
        message="Market data service is operational",
        timestamp=datetime.now().isoformat()
    )

@router.get("/stocks/{symbol}", response_model=StockResponse)
async def get_stock_price(symbol: str):
    """
    Get real-time stock data for a specific symbol
    
    Args:
        symbol: Stock symbol (e.g., AAPL, GOOGL, TSLA)
    
    Returns:
        Real-time stock data including price, change, volume, etc.
    """
    try:
        logger.info(f"API request for stock data: {symbol}")
        
        stock_data = await market_data_service.get_stock_data(symbol.upper())
        
        if not stock_data:
            raise HTTPException(
                status_code=404, 
                detail=f"Stock data not found for symbol: {symbol}"
            )
        
        return StockResponse(
            symbol=stock_data.symbol,
            name=stock_data.name,
            price=stock_data.price,
            change=stock_data.change,
            change_percent=stock_data.change_percent,
            volume=stock_data.volume,
            market_cap=stock_data.market_cap,
            pe_ratio=stock_data.pe_ratio,
            last_updated=stock_data.last_updated
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch stock data for {symbol}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/stocks", response_model=List[StockResponse])
async def get_multiple_stocks(
    symbols: Optional[str] = Query(None, description="Comma-separated stock symbols (e.g., AAPL,GOOGL,TSLA)")
):
    """
    Get real-time stock data for multiple symbols
    
    Args:
        symbols: Optional comma-separated list of stock symbols
                If not provided, returns popular stocks
    
    Returns:
        List of stock data
    """
    try:
        logger.info(f"API request for multiple stocks: {symbols}")
        
        symbol_list = None
        if symbols:
            symbol_list = [s.strip().upper() for s in symbols.split(',')]
        
        stocks_data = await market_data_service.get_multiple_stocks(symbol_list)
        
        return [
            StockResponse(
                symbol=stock.symbol,
                name=stock.name,
                price=stock.price,
                change=stock.change,
                change_percent=stock.change_percent,
                volume=stock.volume,
                market_cap=stock.market_cap,
                pe_ratio=stock.pe_ratio,
                last_updated=stock.last_updated
            )
            for stock in stocks_data
        ]
        
    except Exception as e:
        logger.error(f"Failed to fetch multiple stocks: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/crypto", response_model=List[CryptoResponse])
async def get_crypto_prices(
    coins: Optional[str] = Query(None, description="Comma-separated crypto IDs (e.g., bitcoin,ethereum,cardano)")
):
    """
    Get real-time cryptocurrency data
    
    Args:
        coins: Optional comma-separated list of cryptocurrency IDs
               If not provided, returns popular cryptocurrencies
    
    Returns:
        List of cryptocurrency data
    """
    try:
        logger.info(f"API request for crypto data: {coins}")
        
        coin_list = None
        if coins:
            coin_list = [c.strip().lower() for c in coins.split(',')]
        
        crypto_data = await market_data_service.get_crypto_data(coin_list)
        
        return [
            CryptoResponse(
                symbol=crypto.symbol,
                name=crypto.name,
                price=crypto.price,
                change_24h=crypto.change_24h,
                change_percent_24h=crypto.change_percent_24h,
                market_cap=crypto.market_cap,
                volume_24h=crypto.volume_24h,
                last_updated=crypto.last_updated
            )
            for crypto in crypto_data
        ]
        
    except Exception as e:
        logger.error(f"Failed to fetch crypto data: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/currencies", response_model=List[CurrencyResponse])
async def get_exchange_rates(
    base: str = Query("USD", description="Base currency (e.g., USD, EUR, GBP)")
):
    """
    Get currency exchange rates
    
    Args:
        base: Base currency for exchange rates
    
    Returns:
        List of currency exchange rates
    """
    try:
        logger.info(f"API request for currency rates with base: {base}")
        
        currency_data = await market_data_service.get_currency_rates(base.upper())
        
        return [
            CurrencyResponse(
                from_currency=rate.from_currency,
                to_currency=rate.to_currency,
                rate=rate.rate,
                last_updated=rate.last_updated
            )
            for rate in currency_data
        ]
        
    except Exception as e:
        logger.error(f"Failed to fetch currency rates: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/news", response_model=List[NewsResponse])
async def get_financial_news(
    category: str = Query("business", description="News category (business, technology, etc.)"),
    count: int = Query(10, description="Number of news items to return", ge=1, le=50)
):
    """
    Get financial news articles
    
    Args:
        category: News category to filter by
        count: Number of news items to return (1-50)
    
    Returns:
        List of financial news articles
    """
    try:
        logger.info(f"API request for financial news: category={category}, count={count}")
        
        news_data = await market_data_service.get_financial_news(category, count)
        
        return [
            NewsResponse(
                title=news.title,
                summary=news.summary,
                url=news.url,
                source=news.source,
                published_at=news.published_at,
                sentiment=news.sentiment
            )
            for news in news_data
        ]
        
    except Exception as e:
        logger.error(f"Failed to fetch financial news: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/overview", response_model=MarketOverviewResponse)
async def get_market_overview():
    """
    Get comprehensive market overview including stocks, crypto, currencies, and news
    
    Returns:
        Complete market data overview
    """
    try:
        logger.info("API request for complete market overview")
        
        overview_data = await market_data_service.get_market_overview()
        
        return MarketOverviewResponse(
            stocks=[
                StockResponse(**stock) for stock in overview_data.get("stocks", [])
                if stock  # Filter out empty dictionaries
            ],
            crypto=[
                CryptoResponse(**crypto) for crypto in overview_data.get("crypto", [])
                if crypto  # Filter out empty dictionaries
            ],
            currencies=[
                CurrencyResponse(**currency) for currency in overview_data.get("currencies", [])
                if currency  # Filter out empty dictionaries
            ],
            news=[
                NewsResponse(**news) for news in overview_data.get("news", [])
                if news  # Filter out empty dictionaries
            ],
            last_updated=overview_data.get("last_updated", datetime.now().isoformat())
        )
        
    except Exception as e:
        logger.error(f"Failed to fetch market overview: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Cleanup function for when the app shuts down
async def cleanup_market_service():
    """Cleanup market data service resources"""
    try:
        await market_data_service.close_session()
        logger.info("Market data service cleaned up successfully")
    except Exception as e:
        logger.error(f"Error during market service cleanup: {e}")