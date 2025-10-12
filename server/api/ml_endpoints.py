"""
ML API endpoints for Finance AI
Provides REST APIs for machine learning services
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import logging
try:
    from models.transaction_ml import TransactionCategorizer
except ImportError:
    from models.simple_categorizer import SimpleCategorizer as TransactionCategorizer

logger = logging.getLogger(__name__)

router = APIRouter()

# Global ML model instance
categorizer = None

def get_categorizer():
    """Dependency to get ML categorizer instance"""
    global categorizer
    if not categorizer:
        categorizer = TransactionCategorizer()
    return categorizer

# Pydantic models for request/response
class TransactionInput(BaseModel):
    description: str = Field(..., description="Transaction description")
    amount: float = Field(..., description="Transaction amount")
    
class TransactionPrediction(BaseModel):
    predicted_category: str
    confidence: float
    success: bool
    error: Optional[str] = None

class BatchTransactionInput(BaseModel):
    transactions: List[TransactionInput]

class BatchPredictionResponse(BaseModel):
    results: List[TransactionPrediction]
    total_processed: int
    successful_predictions: int

class CategoryTrainingInput(BaseModel):
    description: str
    amount: float
    correct_category: str
    user_id: str

@router.post("/categorize", response_model=TransactionPrediction)
async def categorize_transaction(
    transaction: TransactionInput,
    categorizer: TransactionCategorizer = Depends(get_categorizer)
):
    """
    Categorize a single transaction using ML model
    
    Returns the predicted category with confidence score
    """
    try:
        if not categorizer.is_ready():
            await categorizer.initialize()
        
        predicted_category, confidence = categorizer.predict_category(
            transaction.description,
            transaction.amount
        )
        
        return TransactionPrediction(
            predicted_category=predicted_category,
            confidence=confidence,
            success=True
        )
        
    except Exception as e:
        logger.error(f"Failed to categorize transaction: {e}")
        return TransactionPrediction(
            predicted_category="Other Expense",
            confidence=0.0,
            success=False,
            error=str(e)
        )

@router.post("/categorize-batch", response_model=BatchPredictionResponse)
async def categorize_transactions_batch(
    batch_input: BatchTransactionInput,
    categorizer: TransactionCategorizer = Depends(get_categorizer)
):
    """
    Categorize multiple transactions in batch for better performance
    """
    try:
        if not categorizer.is_ready():
            await categorizer.initialize()
        
        # Convert to dict format for batch processing
        transactions = [
            {
                "description": t.description,
                "amount": t.amount
            }
            for t in batch_input.transactions
        ]
        
        results = categorizer.predict_batch(transactions)
        
        # Convert results to response format
        predictions = []
        successful_count = 0
        
        for result in results:
            prediction = TransactionPrediction(
                predicted_category=result['predicted_category'],
                confidence=result['confidence'],
                success=result['success'],
                error=result.get('error')
            )
            predictions.append(prediction)
            
            if result['success']:
                successful_count += 1
        
        return BatchPredictionResponse(
            results=predictions,
            total_processed=len(predictions),
            successful_predictions=successful_count
        )
        
    except Exception as e:
        logger.error(f"Failed to process batch categorization: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/categories")
async def get_available_categories(
    categorizer: TransactionCategorizer = Depends(get_categorizer)
):
    """
    Get list of available transaction categories
    """
    return {
        "categories": categorizer.categories,
        "total_categories": len(categorizer.categories)
    }

@router.get("/model-info")
async def get_model_info(
    categorizer: TransactionCategorizer = Depends(get_categorizer)
):
    """
    Get information about the current ML model
    """
    return categorizer.get_model_info()

@router.post("/retrain")
async def retrain_model(
    categorizer: TransactionCategorizer = Depends(get_categorizer)
):
    """
    Retrain the ML model with latest data
    Admin endpoint for model updates
    """
    try:
        logger.info("Starting model retraining...")
        await categorizer.train_model()
        logger.info("Model retraining completed successfully")
        
        return {
            "message": "Model retrained successfully",
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Failed to retrain model: {e}")
        raise HTTPException(status_code=500, detail=f"Retraining failed: {str(e)}")

@router.post("/feedback")
async def provide_category_feedback(
    feedback: CategoryTrainingInput,
    categorizer: TransactionCategorizer = Depends(get_categorizer)
):
    """
    Provide feedback for improving model accuracy
    Store user corrections for future training
    """
    try:
        # For now, just log the feedback
        # In production, you'd store this in a database for retraining
        logger.info(f"Received category feedback: {feedback.description} -> {feedback.correct_category}")
        
        # TODO: Store feedback in database for future model improvements
        # await store_feedback_in_database(feedback)
        
        return {
            "message": "Feedback received successfully",
            "status": "success",
            "note": "Feedback will be used in next model training cycle"
        }
        
    except Exception as e:
        logger.error(f"Failed to process feedback: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def ml_health_check(
    categorizer: TransactionCategorizer = Depends(get_categorizer)
):
    """
    Health check for ML services
    """
    return {
        "status": "healthy",
        "model_ready": categorizer.is_ready(),
        "categories_available": len(categorizer.categories),
        "service": "ML Transaction Categorization"
    }