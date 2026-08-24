"""
Financial Health Scoring API Endpoints
RESTful APIs for financial health assessment and recommendations
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
import logging
import asyncio
from services.financial_health_scorer import FinancialHealthScorer, FinancialHealthScore

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Global health scorer instance
health_scorer = FinancialHealthScorer()

# Pydantic models for API
class TransactionInput(BaseModel):
    """Input model for transaction data"""
    date: str = Field(..., description="Transaction date (YYYY-MM-DD format)")
    amount: float = Field(..., description="Transaction amount (positive for income, negative for expenses)")
    category: str = Field(..., description="Transaction category")
    description: Optional[str] = Field("", description="Transaction description")

class BudgetInput(BaseModel):
    """Input model for budget data"""
    category: str = Field(..., description="Budget category")
    monthlyLimit: float = Field(..., description="Monthly budget limit")
    currentSpent: float = Field(0, description="Current amount spent in this category")
    alertThreshold: float = Field(80, description="Alert threshold percentage")

class GoalInput(BaseModel):
    """Input model for financial goals"""
    title: str = Field(..., description="Goal title")
    targetAmount: float = Field(..., description="Target amount for the goal")
    currentAmount: float = Field(0, description="Current progress amount")
    deadline: Optional[str] = Field(None, description="Goal deadline (YYYY-MM-DD format)")

class HealthScoreRequest(BaseModel):
    """Request model for health score calculation"""
    transactions: List[TransactionInput] = Field(..., description="List of user transactions")
    budgets: Optional[List[BudgetInput]] = Field([], description="List of user budgets")
    goals: Optional[List[GoalInput]] = Field([], description="List of user financial goals")

class HealthMetricResponse(BaseModel):
    """Response model for individual health metrics"""
    name: str
    score: float
    weight: float
    status: str
    description: str
    recommendation: str
    current_value: Optional[float] = None
    target_value: Optional[float] = None
    trend: Optional[str] = None

class HealthScoreResponse(BaseModel):
    """Response model for complete health score"""
    overall_score: float
    grade: str
    last_calculated: str
    
    # Individual metrics
    emergency_fund_score: HealthMetricResponse
    debt_to_income_score: HealthMetricResponse
    savings_rate_score: HealthMetricResponse
    spending_stability_score: HealthMetricResponse
    budget_adherence_score: HealthMetricResponse
    investment_diversification_score: HealthMetricResponse
    
    # Insights
    strengths: List[str]
    weaknesses: List[str]
    priority_actions: List[str]
    risk_factors: List[str]
    
    # Trends
    score_trend: str
    predicted_3_month_score: Optional[float]
    financial_goals_on_track: int
    peer_percentile: Optional[int]

class HealthInsightsResponse(BaseModel):
    """Response model for detailed health insights"""
    score_breakdown: Dict[str, float]
    improvement_potential: float
    next_grade_threshold: Dict[str, Any]
    financial_wellness_tips: List[str]
    recommended_tools: List[Dict[str, str]]

class QuickHealthCheckResponse(BaseModel):
    """Response model for quick health assessment"""
    overall_score: float
    grade: str
    status_color: str
    summary_message: str
    top_priority: str
    score_change: Optional[float] = None

class HealthComparisonResponse(BaseModel):
    """Response model for peer comparison"""
    user_score: float
    peer_percentile: int
    score_distribution: Dict[str, int]
    improvement_suggestions: List[str]

@router.get("/health", tags=["Health Check"])
async def health_check():
    """Health check endpoint for the financial health scoring service"""
    return {
        "status": "healthy",
        "message": "Financial Health Scoring service is operational",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@router.post("/calculate-score", response_model=HealthScoreResponse, tags=["Health Score"])
async def calculate_health_score(request: HealthScoreRequest):
    """
    Calculate comprehensive financial health score based on user data
    
    This endpoint analyzes:
    - Emergency fund adequacy (25% weight)
    - Debt-to-income ratio (20% weight) 
    - Savings rate (20% weight)
    - Spending stability (15% weight)
    - Budget adherence (10% weight)
    - Investment diversification (10% weight)
    """
    try:
        logger.info(f"Calculating health score for {len(request.transactions)} transactions")
        
        # Convert Pydantic models to dictionaries
        transactions = [txn.dict() for txn in request.transactions]
        budgets = [budget.dict() for budget in (request.budgets or [])]
        goals = [goal.dict() for goal in (request.goals or [])]
        
        if not transactions:
            raise HTTPException(
                status_code=400, 
                detail="At least one transaction is required for health score calculation"
            )
        
        # Calculate health score
        health_score = health_scorer.calculate_health_score(
            transactions=transactions,
            budgets=budgets,
            goals=goals
        )
        
        # Convert to response format
        response = _convert_health_score_to_response(health_score)
        
        logger.info(f"Health score calculated: {health_score.overall_score:.1f} ({health_score.grade})")
        return response
        
    except ValueError as e:
        logger.error(f"Invalid request data: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid request data: {str(e)}")
    except Exception as e:
        logger.error(f"Error calculating health score: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to calculate health score: {str(e)}")

@router.post("/quick-check", response_model=QuickHealthCheckResponse, tags=["Health Score"])
async def quick_health_check(request: HealthScoreRequest):
    """
    Get a quick financial health assessment with key highlights
    """
    try:
        logger.info(f"Quick health check for {len(request.transactions)} transactions")
        
        # Convert to dictionaries
        transactions = [txn.dict() for txn in request.transactions]
        budgets = [budget.dict() for budget in (request.budgets or [])]
        
        if not transactions:
            raise HTTPException(status_code=400, detail="Transactions required for health check")
        
        # Calculate health score
        health_score = health_scorer.calculate_health_score(
            transactions=transactions,
            budgets=budgets,
            goals=[]
        )
        
        # Generate quick summary
        status_color = _get_status_color(health_score.overall_score)
        summary_message = _generate_summary_message(health_score)
        top_priority = health_score.priority_actions[0] if health_score.priority_actions else "Maintain current practices"
        
        return QuickHealthCheckResponse(
            overall_score=health_score.overall_score,
            grade=health_score.grade,
            status_color=status_color,
            summary_message=summary_message,
            top_priority=top_priority
        )
        
    except Exception as e:
        logger.error(f"Error in quick health check: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/insights", response_model=HealthInsightsResponse, tags=["Health Insights"])
async def get_health_insights(request: HealthScoreRequest):
    """
    Get detailed insights and recommendations based on financial health score
    """
    try:
        logger.info("Generating detailed health insights")
        
        # Convert to dictionaries
        transactions = [txn.dict() for txn in request.transactions]
        budgets = [budget.dict() for budget in (request.budgets or [])]
        goals = [goal.dict() for goal in (request.goals or [])]
        
        # Calculate health score
        health_score = health_scorer.calculate_health_score(
            transactions=transactions,
            budgets=budgets,
            goals=goals
        )
        
        # Get detailed insights
        insights = health_scorer.get_health_insights(health_score)
        
        return HealthInsightsResponse(
            score_breakdown=insights["score_breakdown"],
            improvement_potential=insights["improvement_potential"],
            next_grade_threshold=insights["next_grade_threshold"],
            financial_wellness_tips=insights["financial_wellness_tips"],
            recommended_tools=insights["recommended_tools"]
        )
        
    except Exception as e:
        logger.error(f"Error generating health insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/compare", response_model=HealthComparisonResponse, tags=["Health Comparison"])
async def compare_health_score(request: HealthScoreRequest):
    """
    Compare user's financial health score with anonymized peer data
    """
    try:
        logger.info("Generating health score comparison")
        
        # Convert to dictionaries
        transactions = [txn.dict() for txn in request.transactions]
        budgets = [budget.dict() for budget in (request.budgets or [])]
        
        # Calculate health score
        health_score = health_scorer.calculate_health_score(
            transactions=transactions,
            budgets=budgets,
            goals=[]
        )
        
        # Generate comparison data (mock peer data for now)
        score_distribution = {
            "90-100": 10,
            "80-89": 20,
            "70-79": 30,
            "60-69": 25,
            "50-59": 10,
            "0-49": 5
        }
        
        improvement_suggestions = _generate_comparison_suggestions(health_score)
        
        return HealthComparisonResponse(
            user_score=health_score.overall_score,
            peer_percentile=health_score.peer_percentile or 50,
            score_distribution=score_distribution,
            improvement_suggestions=improvement_suggestions
        )
        
    except Exception as e:
        logger.error(f"Error in health score comparison: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/benchmark/{category}", tags=["Benchmarks"])
async def get_category_benchmark(category: str):
    """
    Get benchmark thresholds for specific financial health categories
    """
    try:
        benchmarks = {
            "emergency_fund": {
                "excellent": "6+ months of expenses",
                "good": "4-6 months of expenses", 
                "fair": "2-4 months of expenses",
                "poor": "1-2 months of expenses",
                "critical": "<1 month of expenses"
            },
            "debt_to_income": {
                "excellent": "<10% of income",
                "good": "10-20% of income",
                "fair": "20-30% of income", 
                "poor": "30-40% of income",
                "critical": ">40% of income"
            },
            "savings_rate": {
                "excellent": ">25% of income",
                "good": "15-25% of income",
                "fair": "10-15% of income",
                "poor": "5-10% of income",
                "critical": "<5% of income"
            },
            "spending_stability": {
                "excellent": "<10% monthly variance",
                "good": "10-15% monthly variance",
                "fair": "15-25% monthly variance",
                "poor": "25-35% monthly variance", 
                "critical": ">35% monthly variance"
            },
            "budget_adherence": {
                "excellent": ">95% adherence",
                "good": "85-95% adherence",
                "fair": "75-85% adherence",
                "poor": "65-75% adherence",
                "critical": "<65% adherence"
            }
        }
        
        if category not in benchmarks:
            raise HTTPException(
                status_code=404,
                detail=f"Benchmark category '{category}' not found. Available: {list(benchmarks.keys())}"
            )
        
        return {
            "category": category,
            "benchmarks": benchmarks[category],
            "description": f"Performance thresholds for {category.replace('_', ' ').title()}"
        }
        
    except Exception as e:
        logger.error(f"Error getting benchmark for {category}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/demo-score", response_model=HealthScoreResponse, tags=["Demo"])
async def get_demo_health_score():
    """
    Get a demo health score with sample data for testing purposes
    """
    try:
        # Sample transaction data
        demo_transactions = [
            {"date": "2024-10-01", "amount": 5000, "category": "Income", "description": "Salary"},
            {"date": "2024-10-02", "amount": -1200, "category": "Rent", "description": "Monthly rent"},
            {"date": "2024-10-03", "amount": -300, "category": "Groceries", "description": "Weekly groceries"},
            {"date": "2024-10-05", "amount": -150, "category": "Transport", "description": "Gas and transport"},
            {"date": "2024-10-07", "amount": -100, "category": "Entertainment", "description": "Movies and dining"},
            {"date": "2024-10-10", "amount": -800, "category": "Investment", "description": "Mutual fund SIP"},
            {"date": "2024-10-15", "amount": -200, "category": "Shopping", "description": "Clothing"},
            {"date": "2024-10-20", "amount": -250, "category": "Bills & Utilities", "description": "Electricity bill"}
        ]
        
        demo_budgets = [
            {"category": "Groceries", "monthlyLimit": 400, "currentSpent": 300},
            {"category": "Entertainment", "monthlyLimit": 200, "currentSpent": 100},
            {"category": "Transport", "monthlyLimit": 300, "currentSpent": 150}
        ]
        
        demo_goals = [
            {"title": "Emergency Fund", "targetAmount": 30000, "currentAmount": 15000},
            {"title": "New Laptop", "targetAmount": 80000, "currentAmount": 25000}
        ]
        
        # Calculate health score
        health_score = health_scorer.calculate_health_score(
            transactions=demo_transactions,
            budgets=demo_budgets,
            goals=demo_goals
        )
        
        response = _convert_health_score_to_response(health_score)
        
        logger.info(f"Demo health score generated: {health_score.overall_score:.1f}")
        return response
        
    except Exception as e:
        logger.error(f"Error generating demo health score: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Helper functions
def _convert_health_score_to_response(health_score: FinancialHealthScore) -> HealthScoreResponse:
    """Convert FinancialHealthScore to API response format"""
    def metric_to_response(metric):
        return HealthMetricResponse(
            name=metric.name,
            score=metric.score,
            weight=metric.weight,
            status=metric.status,
            description=metric.description,
            recommendation=metric.recommendation,
            current_value=metric.current_value,
            target_value=metric.target_value,
            trend=metric.trend
        )
    
    return HealthScoreResponse(
        overall_score=health_score.overall_score,
        grade=health_score.grade,
        last_calculated=health_score.last_calculated,
        emergency_fund_score=metric_to_response(health_score.emergency_fund_score),
        debt_to_income_score=metric_to_response(health_score.debt_to_income_score),
        savings_rate_score=metric_to_response(health_score.savings_rate_score),
        spending_stability_score=metric_to_response(health_score.spending_stability_score),
        budget_adherence_score=metric_to_response(health_score.budget_adherence_score),
        investment_diversification_score=metric_to_response(health_score.investment_diversification_score),
        strengths=health_score.strengths,
        weaknesses=health_score.weaknesses,
        priority_actions=health_score.priority_actions,
        risk_factors=health_score.risk_factors,
        score_trend=health_score.score_trend,
        predicted_3_month_score=health_score.predicted_3_month_score,
        financial_goals_on_track=health_score.financial_goals_on_track,
        peer_percentile=health_score.peer_percentile
    )

def _get_status_color(score: float) -> str:
    """Get color code for health score status"""
    if score >= 80:
        return "green"
    elif score >= 65:
        return "yellow"
    elif score >= 50:
        return "orange"
    else:
        return "red"

def _generate_summary_message(health_score: FinancialHealthScore) -> str:
    """Generate summary message based on health score"""
    if health_score.overall_score >= 85:
        return f"Excellent financial health! You're in the top tier with a {health_score.grade} grade."
    elif health_score.overall_score >= 70:
        return f"Good financial foundation with room for improvement. Grade: {health_score.grade}."
    elif health_score.overall_score >= 55:
        return f"Fair financial health. Focus on key areas for significant improvement."
    else:
        return f"Financial health needs attention. Start with emergency fund and debt management."

def _generate_comparison_suggestions(health_score: FinancialHealthScore) -> List[str]:
    """Generate suggestions based on peer comparison"""
    suggestions = []
    
    percentile = health_score.peer_percentile or 50
    
    if percentile < 25:
        suggestions.extend([
            "Focus on building emergency fund to reach 3-6 months of expenses",
            "Reduce debt-to-income ratio below 30%",
            "Increase savings rate to at least 15% of income"
        ])
    elif percentile < 50:
        suggestions.extend([
            "Improve budget adherence to increase financial discipline", 
            "Consider starting systematic investment planning",
            "Work on spending consistency to reduce monthly variance"
        ])
    elif percentile < 75:
        suggestions.extend([
            "Optimize investment diversification across asset classes",
            "Set more ambitious savings targets",
            "Consider advanced financial planning strategies"
        ])
    else:
        suggestions.extend([
            "You're performing excellently! Consider mentoring others",
            "Explore advanced investment strategies for wealth building",
            "Focus on tax optimization and estate planning"
        ])
    
    return suggestions[:3]

# Background task for processing
async def process_health_score_async(transactions: List[Dict], budgets: List[Dict], goals: List[Dict]):
    """Process health score calculation asynchronously"""
    try:
        await asyncio.sleep(0.1)  # Simulate async processing
        return health_scorer.calculate_health_score(transactions, budgets, goals)
    except Exception as e:
        logger.error(f"Async health score processing failed: {e}")
        raise

# Cleanup function
async def cleanup_health_scorer():
    """Cleanup resources when shutting down"""
    logger.info("Cleaning up Financial Health Scorer service...")
    # Add any necessary cleanup logic here