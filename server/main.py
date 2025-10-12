"""
FastAPI server for Finance AI ML services
Provides AI/ML endpoints for transaction categorization and financial insights
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import uvicorn
import logging

# Configure logging first
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from models.transaction_ml import TransactionCategorizer
    ML_AVAILABLE = True
    logger.info("Advanced ML libraries available")
except ImportError as e:
    logger.warning(f"ML libraries not available: {e}")
    from models.simple_categorizer import SimpleCategorizer as TransactionCategorizer
    ML_AVAILABLE = False
    logger.info("Using simple rule-based categorizer")

from api.ml_endpoints import router as ml_router

# Initialize FastAPI app
app = FastAPI(
    title="Finance AI ML Server",
    description="Advanced AI/ML services for personal finance management",
    version="1.0.0"
)

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include ML endpoints
app.include_router(ml_router, prefix="/api/ml", tags=["Machine Learning"])

# Include prediction endpoints
from api.prediction_endpoints import router as prediction_router
app.include_router(prediction_router, prefix="/api/predictions", tags=["Expense Prediction"])

# Include market data endpoints
from api.market_endpoints import router as market_router
app.include_router(market_router, prefix="/api/market", tags=["Market Data"])

# Global ML model instance
categorizer = None

@app.on_event("startup")
async def startup_event():
    """Initialize ML models on server startup"""
    global categorizer
    try:
        if ML_AVAILABLE:
            logger.info("Loading advanced ML models...")
        else:
            logger.info("Loading simple rule-based categorizer...")
        
        categorizer = TransactionCategorizer()
        await categorizer.initialize()
        
        model_type = "Advanced ML" if ML_AVAILABLE else "Rule-based"
        logger.info(f"{model_type} categorizer loaded successfully!")
    except Exception as e:
        logger.error(f"Failed to load categorizer: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on server shutdown"""
    logger.info("Shutting down Finance AI ML Server...")
    
    # Cleanup market data service
    try:
        from api.market_endpoints import cleanup_market_service
        await cleanup_market_service()
    except Exception as e:
        logger.error(f"Error during market service cleanup: {e}")

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Finance AI ML Server is running!",
        "version": "1.0.0",
        "status": "healthy",
        "models_loaded": categorizer is not None
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "models": {
            "transaction_categorizer": categorizer is not None and categorizer.is_ready()
        },
        "memory_usage": "TODO: Add memory monitoring",
        "uptime": "TODO: Add uptime tracking"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )