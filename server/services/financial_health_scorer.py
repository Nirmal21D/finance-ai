"""
Financial Health Scoring Service
Comprehensive analysis of user's financial wellness with actionable insights
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Tuple, Any
from enum import Enum
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HealthGrade(Enum):
    """Financial health grade categories"""
    EXCELLENT = "A+"  # 90-100
    VERY_GOOD = "A"   # 80-89
    GOOD = "B"        # 70-79
    FAIR = "C"        # 60-69
    POOR = "D"        # 50-59
    CRITICAL = "F"    # 0-49

@dataclass
class HealthMetric:
    """Individual health metric with score and details"""
    name: str
    score: float  # 0-100
    weight: float  # Weight in overall score
    status: str   # "excellent", "good", "fair", "poor", "critical"
    description: str
    recommendation: str
    current_value: Optional[float] = None
    target_value: Optional[float] = None
    trend: Optional[str] = None  # "improving", "stable", "declining"

@dataclass
class FinancialHealthScore:
    """Comprehensive financial health assessment"""
    overall_score: float  # 0-100
    grade: str           # A+, A, B, C, D, F
    last_calculated: str
    
    # Individual metric scores
    emergency_fund_score: HealthMetric
    debt_to_income_score: HealthMetric
    savings_rate_score: HealthMetric
    spending_stability_score: HealthMetric
    budget_adherence_score: HealthMetric
    investment_diversification_score: HealthMetric
    
    # Summary insights
    strengths: List[str]
    weaknesses: List[str]
    priority_actions: List[str]
    risk_factors: List[str]
    
    # Trends and predictions
    score_trend: str  # "improving", "stable", "declining"
    predicted_3_month_score: Optional[float]
    financial_goals_on_track: int
    
    # Benchmarks
    peer_percentile: Optional[int]  # How user compares to others (anonymized)

class FinancialHealthScorer:
    """Advanced financial health scoring system"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Scoring weights for each metric (should sum to 1.0)
        self.weights = {
            'emergency_fund': 0.25,      # 25% - Most critical
            'debt_to_income': 0.20,      # 20% - Debt management
            'savings_rate': 0.20,        # 20% - Future financial security
            'spending_stability': 0.15,   # 15% - Financial discipline
            'budget_adherence': 0.10,     # 10% - Planning ability
            'investment_diversification': 0.10  # 10% - Growth potential
        }
        
        # Benchmark thresholds
        self.benchmarks = {
            'emergency_fund_months': {
                'excellent': 6.0,    # 6+ months of expenses
                'good': 4.0,         # 4-6 months
                'fair': 2.0,         # 2-4 months
                'poor': 1.0,         # 1-2 months
                'critical': 0.0      # <1 month
            },
            'debt_to_income_ratio': {
                'excellent': 0.10,   # <10% (excluding mortgage)
                'good': 0.20,        # 10-20%
                'fair': 0.30,        # 20-30%
                'poor': 0.40,        # 30-40%
                'critical': 1.0      # >40%
            },
            'savings_rate': {
                'excellent': 0.25,   # >25% of income
                'good': 0.20,        # 15-25%
                'fair': 0.15,        # 10-15%
                'poor': 0.10,        # 5-10%
                'critical': 0.0      # <5%
            },
            'spending_variance': {
                'excellent': 0.10,   # <10% month-to-month variance
                'good': 0.15,        # 10-15%
                'fair': 0.25,        # 15-25%
                'poor': 0.35,        # 25-35%
                'critical': 1.0      # >35%
            },
            'budget_adherence': {
                'excellent': 0.95,   # >95% adherence
                'good': 0.85,        # 85-95%
                'fair': 0.75,        # 75-85%
                'poor': 0.65,        # 65-75%
                'critical': 0.0      # <65%
            }
        }

    def calculate_health_score(self, transactions: List[Dict], budgets: List[Dict] = None, goals: List[Dict] = None) -> FinancialHealthScore:
        """
        Calculate comprehensive financial health score
        """
        try:
            self.logger.info(f"Calculating health score for {len(transactions)} transactions")
            
            # Convert to DataFrame for easier analysis
            df = self._prepare_transaction_data(transactions)
            
            if df.empty:
                return self._create_default_score("Insufficient transaction data")
            
            # Calculate individual metrics
            emergency_fund_metric = self._calculate_emergency_fund_score(df)
            debt_to_income_metric = self._calculate_debt_to_income_score(df)
            savings_rate_metric = self._calculate_savings_rate_score(df)
            spending_stability_metric = self._calculate_spending_stability_score(df)
            budget_adherence_metric = self._calculate_budget_adherence_score(df, budgets or [])
            investment_metric = self._calculate_investment_diversification_score(df)
            
            # Calculate weighted overall score
            overall_score = (
                emergency_fund_metric.score * self.weights['emergency_fund'] +
                debt_to_income_metric.score * self.weights['debt_to_income'] +
                savings_rate_metric.score * self.weights['savings_rate'] +
                spending_stability_metric.score * self.weights['spending_stability'] +
                budget_adherence_metric.score * self.weights['budget_adherence'] +
                investment_metric.score * self.weights['investment_diversification']
            )
            
            # Determine grade
            grade = self._score_to_grade(overall_score)
            
            # Generate insights
            strengths, weaknesses = self._analyze_strengths_weaknesses([
                emergency_fund_metric, debt_to_income_metric, savings_rate_metric,
                spending_stability_metric, budget_adherence_metric, investment_metric
            ])
            
            priority_actions = self._generate_priority_actions(weaknesses, [
                emergency_fund_metric, debt_to_income_metric, savings_rate_metric,
                spending_stability_metric, budget_adherence_metric, investment_metric
            ])
            
            risk_factors = self._identify_risk_factors(df, [
                emergency_fund_metric, debt_to_income_metric, savings_rate_metric
            ])
            
            # Calculate trends
            score_trend = self._calculate_score_trend(df)
            predicted_score = self._predict_future_score(overall_score, score_trend)
            
            # Goals tracking
            goals_on_track = self._analyze_goals_progress(df, goals or [])
            
            return FinancialHealthScore(
                overall_score=round(overall_score, 1),
                grade=grade.value,
                last_calculated=datetime.now().isoformat(),
                emergency_fund_score=emergency_fund_metric,
                debt_to_income_score=debt_to_income_metric,
                savings_rate_score=savings_rate_metric,
                spending_stability_score=spending_stability_metric,
                budget_adherence_score=budget_adherence_metric,
                investment_diversification_score=investment_metric,
                strengths=strengths,
                weaknesses=weaknesses,
                priority_actions=priority_actions,
                risk_factors=risk_factors,
                score_trend=score_trend,
                predicted_3_month_score=predicted_score,
                financial_goals_on_track=goals_on_track,
                peer_percentile=self._calculate_peer_percentile(overall_score)
            )
            
        except Exception as e:
            self.logger.error(f"Error calculating health score: {e}")
            return self._create_default_score(f"Calculation error: {str(e)}")

    def _prepare_transaction_data(self, transactions: List[Dict]) -> pd.DataFrame:
        """Convert transaction list to analyzed DataFrame"""
        if not transactions:
            return pd.DataFrame()
        
        df = pd.DataFrame(transactions)
        
        # Ensure required columns
        required_cols = ['date', 'amount', 'category']
        if not all(col in df.columns for col in required_cols):
            self.logger.error("Missing required transaction columns")
            return pd.DataFrame()
        
        # Convert date column
        df['date'] = pd.to_datetime(df['date'])
        df['amount'] = pd.to_numeric(df['amount'], errors='coerce')
        
        # Separate income and expenses
        df['is_income'] = df['amount'] > 0
        df['expense_amount'] = df['amount'].where(df['amount'] < 0, 0).abs()
        df['income_amount'] = df['amount'].where(df['amount'] > 0, 0)
        
        # Add time-based features
        df['year_month'] = df['date'].dt.to_period('M')
        df['day_of_week'] = df['date'].dt.dayofweek
        
        return df.sort_values('date')

    def _calculate_emergency_fund_score(self, df: pd.DataFrame) -> HealthMetric:
        """Calculate emergency fund adequacy score"""
        try:
            # Calculate monthly expenses (last 6 months)
            recent_months = df[df['date'] >= df['date'].max() - timedelta(days=180)]
            monthly_expenses = recent_months.groupby('year_month')['expense_amount'].sum()
            avg_monthly_expenses = monthly_expenses.mean() if len(monthly_expenses) > 0 else 0
            
            if avg_monthly_expenses == 0:
                return HealthMetric(
                    name="Emergency Fund",
                    score=50.0,
                    weight=self.weights['emergency_fund'],
                    status="unknown",
                    description="Unable to calculate due to insufficient expense data",
                    recommendation="Start tracking expenses to assess emergency fund needs"
                )
            
            # Estimate current savings (positive balance trend)
            total_income = df['income_amount'].sum()
            total_expenses = df['expense_amount'].sum()
            estimated_savings = max(0, total_income - total_expenses)
            
            # Calculate months of expenses covered
            months_covered = estimated_savings / avg_monthly_expenses if avg_monthly_expenses > 0 else 0
            
            # Score based on months covered
            if months_covered >= self.benchmarks['emergency_fund_months']['excellent']:
                score = 100
                status = "excellent"
            elif months_covered >= self.benchmarks['emergency_fund_months']['good']:
                score = 85
                status = "good"
            elif months_covered >= self.benchmarks['emergency_fund_months']['fair']:
                score = 70
                status = "fair"
            elif months_covered >= self.benchmarks['emergency_fund_months']['poor']:
                score = 50
                status = "poor"
            else:
                score = 25
                status = "critical"
            
            # Generate recommendation
            target_months = 6
            needed_amount = max(0, (target_months - months_covered) * avg_monthly_expenses)
            
            if months_covered < target_months:
                recommendation = f"Build emergency fund: save ₹{needed_amount:,.0f} more (currently {months_covered:.1f} months covered, target: {target_months} months)"
            else:
                recommendation = "Emergency fund is adequate. Consider high-yield savings account for better returns."
            
            return HealthMetric(
                name="Emergency Fund",
                score=score,
                weight=self.weights['emergency_fund'],
                status=status,
                description=f"Covers {months_covered:.1f} months of expenses",
                recommendation=recommendation,
                current_value=months_covered,
                target_value=6.0,
                trend="stable"
            )
            
        except Exception as e:
            self.logger.error(f"Error calculating emergency fund score: {e}")
            return self._create_default_metric("Emergency Fund", "emergency_fund")

    def _calculate_debt_to_income_score(self, df: pd.DataFrame) -> HealthMetric:
        """Calculate debt-to-income ratio score"""
        try:
            # Identify debt payments (recurring payments to financial institutions)
            debt_categories = ['Bills & Utilities', 'Insurance', 'Investment']  # Proxy for debt payments
            monthly_data = df.groupby('year_month').agg({
                'income_amount': 'sum',
                'expense_amount': 'sum'
            }).reset_index()
            
            if len(monthly_data) == 0:
                return self._create_default_metric("Debt-to-Income Ratio", "debt_to_income")
            
            avg_monthly_income = monthly_data['income_amount'].mean()
            avg_monthly_expenses = monthly_data['expense_amount'].mean()
            
            if avg_monthly_income == 0:
                return self._create_default_metric("Debt-to-Income Ratio", "debt_to_income")
            
            # Estimate debt payments (conservative: 30% of total expenses)
            estimated_debt_payments = avg_monthly_expenses * 0.30
            debt_to_income_ratio = estimated_debt_payments / avg_monthly_income
            
            # Score based on ratio
            if debt_to_income_ratio <= self.benchmarks['debt_to_income_ratio']['excellent']:
                score = 100
                status = "excellent"
            elif debt_to_income_ratio <= self.benchmarks['debt_to_income_ratio']['good']:
                score = 85
                status = "good"
            elif debt_to_income_ratio <= self.benchmarks['debt_to_income_ratio']['fair']:
                score = 70
                status = "fair"
            elif debt_to_income_ratio <= self.benchmarks['debt_to_income_ratio']['poor']:
                score = 50
                status = "poor"
            else:
                score = 25
                status = "critical"
            
            # Generate recommendation
            if debt_to_income_ratio > 0.20:
                recommendation = f"Reduce debt burden: aim for <20% debt-to-income ratio (currently {debt_to_income_ratio:.1%})"
            else:
                recommendation = "Debt-to-income ratio is healthy. Maintain current debt management."
            
            return HealthMetric(
                name="Debt-to-Income Ratio",
                score=score,
                weight=self.weights['debt_to_income'],
                status=status,
                description=f"Estimated {debt_to_income_ratio:.1%} of income goes to debt payments",
                recommendation=recommendation,
                current_value=debt_to_income_ratio * 100,
                target_value=20.0,
                trend="stable"
            )
            
        except Exception as e:
            self.logger.error(f"Error calculating debt-to-income score: {e}")
            return self._create_default_metric("Debt-to-Income Ratio", "debt_to_income")

    def _calculate_savings_rate_score(self, df: pd.DataFrame) -> HealthMetric:
        """Calculate savings rate score"""
        try:
            monthly_data = df.groupby('year_month').agg({
                'income_amount': 'sum',
                'expense_amount': 'sum'
            }).reset_index()
            
            if len(monthly_data) == 0:
                return self._create_default_metric("Savings Rate", "savings_rate")
            
            monthly_data['net_savings'] = monthly_data['income_amount'] - monthly_data['expense_amount']
            monthly_data['savings_rate'] = monthly_data['net_savings'] / monthly_data['income_amount']
            
            avg_savings_rate = monthly_data['savings_rate'].mean()
            
            if pd.isna(avg_savings_rate) or avg_savings_rate < 0:
                avg_savings_rate = 0
            
            # Score based on savings rate
            if avg_savings_rate >= self.benchmarks['savings_rate']['excellent']:
                score = 100
                status = "excellent"
            elif avg_savings_rate >= self.benchmarks['savings_rate']['good']:
                score = 85
                status = "good"
            elif avg_savings_rate >= self.benchmarks['savings_rate']['fair']:
                score = 70
                status = "fair"
            elif avg_savings_rate >= self.benchmarks['savings_rate']['poor']:
                score = 50
                status = "poor"
            else:
                score = 25
                status = "critical"
            
            # Generate recommendation
            target_rate = 0.20  # 20%
            if avg_savings_rate < target_rate:
                improvement_needed = (target_rate - avg_savings_rate) * 100
                recommendation = f"Increase savings rate by {improvement_needed:.1f}% (currently {avg_savings_rate:.1%}, target: 20%)"
            else:
                recommendation = "Excellent savings rate! Consider investing excess savings for growth."
            
            return HealthMetric(
                name="Savings Rate",
                score=score,
                weight=self.weights['savings_rate'],
                status=status,
                description=f"Saving {avg_savings_rate:.1%} of income monthly",
                recommendation=recommendation,
                current_value=avg_savings_rate * 100,
                target_value=20.0,
                trend="stable"
            )
            
        except Exception as e:
            self.logger.error(f"Error calculating savings rate score: {e}")
            return self._create_default_metric("Savings Rate", "savings_rate")

    def _calculate_spending_stability_score(self, df: pd.DataFrame) -> HealthMetric:
        """Calculate spending consistency/stability score"""
        try:
            monthly_expenses = df.groupby('year_month')['expense_amount'].sum()
            
            if len(monthly_expenses) < 2:
                return self._create_default_metric("Spending Stability", "spending_stability")
            
            # Calculate coefficient of variation (std dev / mean)
            expense_mean = monthly_expenses.mean()
            expense_std = monthly_expenses.std()
            
            if expense_mean == 0:
                return self._create_default_metric("Spending Stability", "spending_stability")
            
            coefficient_of_variation = expense_std / expense_mean
            
            # Score based on spending variance
            if coefficient_of_variation <= self.benchmarks['spending_variance']['excellent']:
                score = 100
                status = "excellent"
            elif coefficient_of_variation <= self.benchmarks['spending_variance']['good']:
                score = 85
                status = "good"
            elif coefficient_of_variation <= self.benchmarks['spending_variance']['fair']:
                score = 70
                status = "fair"
            elif coefficient_of_variation <= self.benchmarks['spending_variance']['poor']:
                score = 50
                status = "poor"
            else:
                score = 25
                status = "critical"
            
            # Generate recommendation
            if coefficient_of_variation > 0.20:
                recommendation = f"Stabilize spending: {coefficient_of_variation:.1%} month-to-month variance (target: <15%)"
            else:
                recommendation = "Spending is stable and predictable. Good financial discipline!"
            
            return HealthMetric(
                name="Spending Stability",
                score=score,
                weight=self.weights['spending_stability'],
                status=status,
                description=f"{coefficient_of_variation:.1%} spending variance between months",
                recommendation=recommendation,
                current_value=coefficient_of_variation * 100,
                target_value=15.0,
                trend="stable"
            )
            
        except Exception as e:
            self.logger.error(f"Error calculating spending stability score: {e}")
            return self._create_default_metric("Spending Stability", "spending_stability")

    def _calculate_budget_adherence_score(self, df: pd.DataFrame, budgets: List[Dict]) -> HealthMetric:
        """Calculate budget adherence score"""
        try:
            if not budgets:
                return HealthMetric(
                    name="Budget Adherence",
                    score=50.0,
                    weight=self.weights['budget_adherence'],
                    status="unknown",
                    description="No budgets set",
                    recommendation="Create monthly budgets to track spending discipline"
                )
            
            # Analyze budget performance
            total_adherence = 0
            budget_count = 0
            
            for budget in budgets:
                category = budget.get('category', '')
                monthly_limit = budget.get('monthlyLimit', 0)
                current_spent = budget.get('currentSpent', 0)
                
                if monthly_limit > 0:
                    adherence_ratio = min(1.0, (monthly_limit - current_spent) / monthly_limit)
                    total_adherence += max(0, adherence_ratio)
                    budget_count += 1
            
            if budget_count == 0:
                avg_adherence = 0.5
            else:
                avg_adherence = total_adherence / budget_count
            
            # Score based on adherence
            if avg_adherence >= self.benchmarks['budget_adherence']['excellent']:
                score = 100
                status = "excellent"
            elif avg_adherence >= self.benchmarks['budget_adherence']['good']:
                score = 85
                status = "good"
            elif avg_adherence >= self.benchmarks['budget_adherence']['fair']:
                score = 70
                status = "fair"
            elif avg_adherence >= self.benchmarks['budget_adherence']['poor']:
                score = 50
                status = "poor"
            else:
                score = 25
                status = "critical"
            
            # Generate recommendation
            if avg_adherence < 0.80:
                recommendation = f"Improve budget discipline: {avg_adherence:.1%} adherence rate (target: >85%)"
            else:
                recommendation = "Excellent budget adherence! Consider setting more ambitious financial goals."
            
            return HealthMetric(
                name="Budget Adherence",
                score=score,
                weight=self.weights['budget_adherence'],
                status=status,
                description=f"{avg_adherence:.1%} average budget adherence across {budget_count} budgets",
                recommendation=recommendation,
                current_value=avg_adherence * 100,
                target_value=85.0,
                trend="stable"
            )
            
        except Exception as e:
            self.logger.error(f"Error calculating budget adherence score: {e}")
            return self._create_default_metric("Budget Adherence", "budget_adherence")

    def _calculate_investment_diversification_score(self, df: pd.DataFrame) -> HealthMetric:
        """Calculate investment diversification score"""
        try:
            # Look for investment-related transactions
            investment_categories = ['Investment', 'Crypto', 'Stocks']
            investment_txns = df[df['category'].isin(investment_categories)]
            
            total_income = df['income_amount'].sum()
            total_investments = investment_txns['expense_amount'].sum()
            
            if total_income == 0:
                investment_rate = 0
            else:
                investment_rate = total_investments / total_income
            
            # Score based on investment rate
            if investment_rate >= 0.15:  # >15% of income invested
                score = 100
                status = "excellent"
            elif investment_rate >= 0.10:  # 10-15%
                score = 85
                status = "good"
            elif investment_rate >= 0.05:  # 5-10%
                score = 70
                status = "fair"
            elif investment_rate >= 0.02:  # 2-5%
                score = 50
                status = "poor"
            else:
                score = 25
                status = "critical"
            
            # Generate recommendation
            if investment_rate < 0.10:
                target_investment = 0.15 * total_income
                additional_needed = target_investment - total_investments
                recommendation = f"Increase investments: invest ₹{additional_needed:,.0f} more (currently {investment_rate:.1%} of income, target: 15%)"
            else:
                recommendation = "Good investment rate! Consider diversifying across different asset classes."
            
            return HealthMetric(
                name="Investment Diversification",
                score=score,
                weight=self.weights['investment_diversification'],
                status=status,
                description=f"Investing {investment_rate:.1%} of income",
                recommendation=recommendation,
                current_value=investment_rate * 100,
                target_value=15.0,
                trend="stable"
            )
            
        except Exception as e:
            self.logger.error(f"Error calculating investment score: {e}")
            return self._create_default_metric("Investment Diversification", "investment_diversification")

    def _score_to_grade(self, score: float) -> HealthGrade:
        """Convert numeric score to letter grade"""
        if score >= 90:
            return HealthGrade.EXCELLENT
        elif score >= 80:
            return HealthGrade.VERY_GOOD
        elif score >= 70:
            return HealthGrade.GOOD
        elif score >= 60:
            return HealthGrade.FAIR
        elif score >= 50:
            return HealthGrade.POOR
        else:
            return HealthGrade.CRITICAL

    def _analyze_strengths_weaknesses(self, metrics: List[HealthMetric]) -> Tuple[List[str], List[str]]:
        """Identify financial strengths and weaknesses"""
        strengths = []
        weaknesses = []
        
        for metric in metrics:
            if metric.score >= 85:
                strengths.append(f"Strong {metric.name.lower()}: {metric.description}")
            elif metric.score < 60:
                weaknesses.append(f"Weak {metric.name.lower()}: {metric.description}")
        
        if not strengths:
            strengths.append("Working on building financial foundation")
        if not weaknesses:
            weaknesses.append("Overall strong financial health")
            
        return strengths[:3], weaknesses[:3]  # Top 3 each

    def _generate_priority_actions(self, weaknesses: List[str], metrics: List[HealthMetric]) -> List[str]:
        """Generate prioritized action items"""
        actions = []
        
        # Sort metrics by score (lowest first) and weight (highest first)
        sorted_metrics = sorted(metrics, key=lambda m: (m.score, -m.weight))
        
        for metric in sorted_metrics[:3]:  # Top 3 priorities
            if metric.score < 70:  # Needs improvement
                actions.append(f"Priority: {metric.recommendation}")
        
        if not actions:
            actions.append("Maintain current financial practices")
            actions.append("Consider setting more ambitious financial goals")
            
        return actions[:3]

    def _identify_risk_factors(self, df: pd.DataFrame, metrics: List[HealthMetric]) -> List[str]:
        """Identify potential financial risks"""
        risks = []
        
        # Check emergency fund
        emergency_metric = next((m for m in metrics if "Emergency" in m.name), None)
        if emergency_metric and emergency_metric.score < 50:
            risks.append("Insufficient emergency fund for unexpected expenses")
        
        # Check income stability
        monthly_income = df.groupby('year_month')['income_amount'].sum()
        if len(monthly_income) > 1:
            income_variance = monthly_income.std() / monthly_income.mean() if monthly_income.mean() > 0 else 0
            if income_variance > 0.30:
                risks.append("High income volatility may impact financial stability")
        
        # Check spending trends
        monthly_expenses = df.groupby('year_month')['expense_amount'].sum()
        if len(monthly_expenses) > 2:
            recent_trend = monthly_expenses.iloc[-3:].mean() / monthly_expenses.iloc[:-3].mean() if len(monthly_expenses.iloc[:-3]) > 0 else 1
            if recent_trend > 1.20:
                risks.append("Spending has increased significantly in recent months")
        
        if not risks:
            risks.append("No major financial risks identified")
            
        return risks[:3]

    def _calculate_score_trend(self, df: pd.DataFrame) -> str:
        """Calculate if financial health is improving, stable, or declining"""
        # Simple trend analysis based on savings rate over time
        monthly_data = df.groupby('year_month').agg({
            'income_amount': 'sum',
            'expense_amount': 'sum'
        }).reset_index()
        
        if len(monthly_data) < 3:
            return "stable"
        
        monthly_data['savings_rate'] = (monthly_data['income_amount'] - monthly_data['expense_amount']) / monthly_data['income_amount']
        
        # Compare recent 3 months to previous periods
        recent_avg = monthly_data['savings_rate'].iloc[-3:].mean()
        previous_avg = monthly_data['savings_rate'].iloc[:-3].mean() if len(monthly_data) > 3 else recent_avg
        
        if recent_avg > previous_avg * 1.10:
            return "improving"
        elif recent_avg < previous_avg * 0.90:
            return "declining"
        else:
            return "stable"

    def _predict_future_score(self, current_score: float, trend: str) -> float:
        """Predict score in 3 months based on current trend"""
        if trend == "improving":
            return min(100, current_score * 1.05)
        elif trend == "declining":
            return max(0, current_score * 0.95)
        else:
            return current_score

    def _analyze_goals_progress(self, df: pd.DataFrame, goals: List[Dict]) -> int:
        """Count how many financial goals are on track"""
        if not goals:
            return 0
        
        on_track_count = 0
        total_savings = df['income_amount'].sum() - df['expense_amount'].sum()
        
        for goal in goals:
            target_amount = goal.get('targetAmount', 0)
            current_amount = goal.get('currentAmount', 0)
            
            if target_amount > 0:
                progress_rate = current_amount / target_amount
                if progress_rate >= 0.25:  # At least 25% progress
                    on_track_count += 1
        
        return on_track_count

    def _calculate_peer_percentile(self, score: float) -> int:
        """Calculate where user ranks compared to peers (mock data)"""
        # Mock percentile based on score
        if score >= 85:
            return 90
        elif score >= 75:
            return 75
        elif score >= 65:
            return 60
        elif score >= 55:
            return 45
        else:
            return 25

    def _create_default_metric(self, name: str, weight_key: str) -> HealthMetric:
        """Create default metric when calculation fails"""
        return HealthMetric(
            name=name,
            score=50.0,
            weight=self.weights.get(weight_key, 0.1),
            status="unknown",
            description="Insufficient data for analysis",
            recommendation="Provide more transaction data for accurate assessment"
        )

    def _create_default_score(self, reason: str) -> FinancialHealthScore:
        """Create default score when calculation fails completely"""
        default_metric = HealthMetric(
            name="Default",
            score=50.0,
            weight=0.0,
            status="unknown",
            description=reason,
            recommendation="Provide transaction data for accurate assessment"
        )
        
        return FinancialHealthScore(
            overall_score=50.0,
            grade="C",
            last_calculated=datetime.now().isoformat(),
            emergency_fund_score=default_metric,
            debt_to_income_score=default_metric,
            savings_rate_score=default_metric,
            spending_stability_score=default_metric,
            budget_adherence_score=default_metric,
            investment_diversification_score=default_metric,
            strengths=["Getting started with financial tracking"],
            weaknesses=["Need more data for comprehensive analysis"],
            priority_actions=["Add more transaction data", "Set up budgets", "Define financial goals"],
            risk_factors=["Insufficient data for risk assessment"],
            score_trend="stable",
            predicted_3_month_score=50.0,
            financial_goals_on_track=0,
            peer_percentile=50
        )

    def get_health_insights(self, score: FinancialHealthScore) -> Dict[str, Any]:
        """Get additional insights and recommendations"""
        return {
            "score_breakdown": {
                "emergency_fund": score.emergency_fund_score.score,
                "debt_management": score.debt_to_income_score.score,
                "savings_discipline": score.savings_rate_score.score,
                "spending_control": score.spending_stability_score.score,
                "budget_planning": score.budget_adherence_score.score,
                "investment_growth": score.investment_diversification_score.score
            },
            "improvement_potential": max(0, 100 - score.overall_score),
            "next_grade_threshold": self._next_grade_threshold(score.overall_score),
            "financial_wellness_tips": self._generate_wellness_tips(score),
            "recommended_tools": self._recommend_tools(score)
        }

    def _next_grade_threshold(self, current_score: float) -> Dict[str, Any]:
        """Calculate points needed for next grade level"""
        thresholds = [90, 80, 70, 60, 50]
        for threshold in thresholds:
            if current_score < threshold:
                return {
                    "next_grade": self._score_to_grade(threshold).value,
                    "points_needed": threshold - current_score,
                    "percentage_improvement": ((threshold - current_score) / current_score) * 100
                }
        return {"message": "You're at the highest grade level!"}

    def _generate_wellness_tips(self, score: FinancialHealthScore) -> List[str]:
        """Generate personalized financial wellness tips"""
        tips = []
        
        if score.emergency_fund_score.score < 70:
            tips.append("💰 Automate emergency fund savings: Set up automatic transfers to build your safety net")
        
        if score.savings_rate_score.score < 70:
            tips.append("🎯 Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings and debt payments")
        
        if score.spending_stability_score.score < 70:
            tips.append("📊 Track spending patterns: Use categories to identify where money goes each month")
        
        if score.budget_adherence_score.score < 70:
            tips.append("📝 Start with micro-budgets: Set small, achievable limits for discretionary categories")
        
        tips.append("🎨 Review your financial health monthly to track progress and celebrate wins!")
        
        return tips[:4]

    def _recommend_tools(self, score: FinancialHealthScore) -> List[Dict[str, str]]:
        """Recommend financial tools based on health score"""
        tools = []
        
        if score.emergency_fund_score.score < 70:
            tools.append({
                "name": "High-Yield Savings Account",
                "purpose": "Emergency fund with better interest rates",
                "priority": "high"
            })
        
        if score.investment_diversification_score.score < 70:
            tools.append({
                "name": "Index Fund Investment",
                "purpose": "Low-cost diversified investing for beginners",
                "priority": "medium"
            })
        
        if score.budget_adherence_score.score < 70:
            tools.append({
                "name": "Automated Budgeting",
                "purpose": "Set up automatic budget categories and alerts",
                "priority": "high"
            })
        
        return tools[:3]