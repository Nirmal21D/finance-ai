"""
API endpoints for Expense Prediction Engine
Provides RESTful APIs for expense forecasting and pattern analysis
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
import logging
from models.expense_predictor import ExpensePredictor, PredictionResult, CategoryPrediction

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Global predictor instance
predictor = ExpensePredictor()

# Pydantic models for API
class TransactionInput(BaseModel):
    date: str = Field(..., description="Transaction date in YYYY-MM-DD format")
    amount: float = Field(..., description="Transaction amount (negative for expenses, positive for income)")
    category: str = Field(..., description="Transaction category")
    description: str = Field("", description="Transaction description")

class PredictionRequest(BaseModel):
    transactions: List[TransactionInput] = Field(..., description="Historical transaction data")
    target_month: Optional[str] = Field(None, description="Target month for prediction (YYYY-MM format)")

class PredictionResponse(BaseModel):
    predicted_amount: float = Field(..., description="Predicted expense amount")
    confidence: float = Field(..., description="Prediction confidence (0-1)")
    trend: str = Field(..., description="Spending trend: increasing, decreasing, or stable")
    seasonal_factor: float = Field(..., description="Seasonal adjustment factor")
    historical_average: float = Field(..., description="Historical monthly average")
    prediction_range: List[float] = Field(..., description="Prediction range [min, max]")
    target_month: str = Field(..., description="Target month for prediction")

class CategoryPredictionResponse(BaseModel):
    category: str = Field(..., description="Category name")
    predicted_amount: float = Field(..., description="Predicted expense amount for category")
    confidence: float = Field(..., description="Prediction confidence (0-1)")
    trend: str = Field(..., description="Category spending trend")
    percentage_of_total: float = Field(..., description="Percentage of total predicted expenses")

class CategoryPredictionsResponse(BaseModel):
    predictions: List[CategoryPredictionResponse] = Field(..., description="Category predictions")
    total_predicted: float = Field(..., description="Total predicted expenses")
    target_month: str = Field(..., description="Target month for predictions")

class PatternsResponse(BaseModel):
    overall_trend: Dict[str, Any] = Field(..., description="Overall spending trend analysis")
    category_patterns: Dict[str, Any] = Field(..., description="Category-wise spending patterns")
    seasonal_patterns: Dict[int, float] = Field(..., description="Monthly seasonal patterns")
    weekly_patterns: Dict[int, float] = Field(..., description="Weekly spending patterns")

class TrainingResponse(BaseModel):
    success: bool = Field(..., description="Training success status")
    model_scores: Dict[str, Any] = Field(..., description="Model performance scores")
    best_model: str = Field(..., description="Best performing model")
    training_samples: int = Field(..., description="Number of training samples")
    message: str = Field(..., description="Training status message")

@router.post("/predict-month", response_model=PredictionResponse)
async def predict_monthly_expenses(request: PredictionRequest):
    """
    Predict total expenses for the next month or specified target month
    """
    try:
        logger.info(f"Received prediction request with {len(request.transactions)} transactions")
        
        # Convert transactions to the format expected by the predictor
        transactions = []
        for txn in request.transactions:
            transactions.append({
                'date': txn.date,
                'amount': txn.amount,
                'category': txn.category,
                'description': txn.description
            })
        
        # Load transaction data
        df = predictor.load_transaction_data(transactions)
        
        if df.empty:
            raise HTTPException(status_code=400, detail="No valid transaction data provided")
        
        # Parse target month if provided
        target_date = None
        if request.target_month:
            try:
                target_date = datetime.strptime(request.target_month, "%Y-%m")
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid target_month format. Use YYYY-MM")
        
        # Make prediction
        prediction = predictor.predict_next_month(df, target_date)
        
        # Format target month for response
        if not target_date:
            target_date = datetime.now().replace(day=1) + timedelta(days=32)
            target_date = target_date.replace(day=1)
        
        response = PredictionResponse(
            predicted_amount=prediction.predicted_amount,
            confidence=prediction.confidence,
            trend=prediction.trend,
            seasonal_factor=prediction.seasonal_factor,
            historical_average=prediction.historical_average,
            prediction_range=list(prediction.prediction_range),
            target_month=target_date.strftime("%Y-%m")
        )
        
        logger.info(f"Prediction completed: ₹{prediction.predicted_amount:.2f} for {target_date.strftime('%Y-%m')}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@router.post("/predict-categories", response_model=CategoryPredictionsResponse)
async def predict_category_expenses(request: PredictionRequest):
    """
    Predict expenses by category for the next month or specified target month
    """
    try:
        logger.info(f"Received category prediction request with {len(request.transactions)} transactions")
        
        # Convert transactions
        transactions = []
        for txn in request.transactions:
            transactions.append({
                'date': txn.date,
                'amount': txn.amount,
                'category': txn.category,
                'description': txn.description
            })
        
        # Load transaction data
        df = predictor.load_transaction_data(transactions)
        
        if df.empty:
            raise HTTPException(status_code=400, detail="No valid transaction data provided")
        
        # Parse target month if provided
        target_date = None
        if request.target_month:
            try:
                target_date = datetime.strptime(request.target_month, "%Y-%m")
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid target_month format. Use YYYY-MM")
        
        # Make category predictions
        category_predictions = predictor.predict_by_category(df, target_date)
        
        # Calculate total predicted
        total_predicted = sum(pred.predicted_amount for pred in category_predictions)
        
        # Format target month
        if not target_date:
            target_date = datetime.now().replace(day=1) + timedelta(days=32)
            target_date = target_date.replace(day=1)
        
        # Convert to response format
        predictions_response = []
        for pred in category_predictions:
            predictions_response.append(CategoryPredictionResponse(
                category=pred.category,
                predicted_amount=pred.predicted_amount,
                confidence=pred.confidence,
                trend=pred.trend,
                percentage_of_total=pred.percentage_of_total
            ))
        
        response = CategoryPredictionsResponse(
            predictions=predictions_response,
            total_predicted=total_predicted,
            target_month=target_date.strftime("%Y-%m")
        )
        
        logger.info(f"Category predictions completed: {len(category_predictions)} categories, total ₹{total_predicted:.2f}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Category prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Category prediction failed: {str(e)}")

@router.post("/analyze-patterns", response_model=PatternsResponse)
async def analyze_spending_patterns(request: PredictionRequest):
    """
    Analyze spending patterns and trends from historical transaction data
    """
    try:
        logger.info(f"Received pattern analysis request with {len(request.transactions)} transactions")
        
        # Convert transactions
        transactions = []
        for txn in request.transactions:
            transactions.append({
                'date': txn.date,
                'amount': txn.amount,
                'category': txn.category,
                'description': txn.description
            })
        
        # Load transaction data
        df = predictor.load_transaction_data(transactions)
        
        if df.empty:
            raise HTTPException(status_code=400, detail="No valid transaction data provided")
        
        # Analyze patterns
        patterns = predictor.analyze_patterns(df)
        
        response = PatternsResponse(
            overall_trend=patterns.get('overall_trend', {}),
            category_patterns=patterns.get('category_patterns', {}),
            seasonal_patterns=patterns.get('seasonal_patterns', {}),
            weekly_patterns=patterns.get('weekly_patterns', {})
        )
        
        logger.info("Pattern analysis completed")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Pattern analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Pattern analysis failed: {str(e)}")

@router.post("/train-models", response_model=TrainingResponse)
async def train_prediction_models(request: PredictionRequest):
    """
    Train or retrain the expense prediction models with provided data
    """
    try:
        logger.info(f"Received model training request with {len(request.transactions)} transactions")
        
        # Convert transactions
        transactions = []
        for txn in request.transactions:
            transactions.append({
                'date': txn.date,
                'amount': txn.amount,
                'category': txn.category,
                'description': txn.description
            })
        
        # Load transaction data
        df = predictor.load_transaction_data(transactions)
        
        if df.empty:
            logger.warning("No transaction data provided, using synthetic data for training")
        
        # Train models
        training_results = predictor.train_prediction_models(df)
        
        if not training_results:
            raise HTTPException(status_code=500, detail="Model training failed")
        
        response = TrainingResponse(
            success=True,
            model_scores=training_results.get('model_scores', {}),
            best_model=training_results.get('best_model', 'unknown'),
            training_samples=training_results.get('training_samples', 0),
            message="Models trained successfully"
        )
        
        logger.info(f"Model training completed successfully with {training_results.get('training_samples', 0)} samples")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Model training error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Model training failed: {str(e)}")

@router.get("/model-info")
async def get_model_info():
    """
    Get information about the current prediction models
    """
    try:
        model_info = {
            "models_available": list(predictor.models.keys()),
            "category_models": list(predictor.category_models.keys()),
            "seasonal_patterns_months": list(predictor.seasonal_patterns.keys()),
            "last_updated": "unknown",
            "status": "ready" if predictor.models else "not_trained"
        }
        
        return model_info
        
    except Exception as e:
        logger.error(f"Model info error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get model info: {str(e)}")

@router.get("/demo-prediction")
async def get_demo_prediction():
    """
    Get a demo prediction using synthetic data (for testing purposes)
    """
    try:
        logger.info("Generating demo prediction with synthetic data")
        
        # Create a new predictor instance for demo to avoid conflicts
        from models.expense_predictor import ExpensePredictor
        demo_predictor = ExpensePredictor()
        
        # Generate synthetic data
        df = demo_predictor.generate_synthetic_data(12)  # 12 months of data
        
        # Make predictions
        monthly_prediction = demo_predictor.predict_next_month(df)
        category_predictions = demo_predictor.predict_by_category(df)
        patterns = demo_predictor.analyze_patterns(df)
        
        # Format response
        next_month = datetime.now().replace(day=1) + timedelta(days=32)
        next_month = next_month.replace(day=1)
        
        demo_response = {
            "demo_data": True,
            "target_month": next_month.strftime("%Y-%m"),
            "monthly_prediction": {
                "predicted_amount": round(monthly_prediction.predicted_amount, 2),
                "confidence": round(monthly_prediction.confidence, 2),
                "trend": monthly_prediction.trend,
                "seasonal_factor": round(monthly_prediction.seasonal_factor, 2),
                "historical_average": round(monthly_prediction.historical_average, 2),
                "prediction_range": [round(x, 2) for x in monthly_prediction.prediction_range],
                "target_month": next_month.strftime("%Y-%m")
            },
            "category_predictions": {
                "predictions": [
                    {
                        "category": pred.category,
                        "predicted_amount": round(pred.predicted_amount, 2),
                        "confidence": round(pred.confidence, 2),
                        "trend": pred.trend,
                        "percentage_of_total": round(pred.percentage_of_total, 1)
                    }
                    for pred in category_predictions[:10]  # Top 10 categories
                ],
                "total_predicted": round(sum(pred.predicted_amount for pred in category_predictions), 2),
                "target_month": next_month.strftime("%Y-%m")
            },
            "spending_patterns": patterns,
            "synthetic_data_info": {
                "months_generated": 12,
                "total_transactions": len(df),
                "date_range": f"{df['date'].min().strftime('%Y-%m-%d')} to {df['date'].max().strftime('%Y-%m-%d')}"
            }
        }
        
        logger.info("Demo prediction generated successfully")
        return demo_response
        
    except Exception as e:
        logger.error(f"Demo prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Demo prediction failed: {str(e)}")

# Initialize predictor on module load
import asyncio

async def init_predictor():
    """Initialize the predictor when the module loads"""
    await predictor.initialize()

# Initialization will happen on startup via FastAPI event handler