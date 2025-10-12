"""
Expense Prediction Engine
Advanced ML system for predicting future spending patterns based on historical transaction data
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Any
import logging
from dataclasses import dataclass
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import pickle
import json
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class PredictionResult:
    """Structure for prediction results"""
    predicted_amount: float
    confidence: float
    trend: str  # 'increasing', 'decreasing', 'stable'
    seasonal_factor: float
    historical_average: float
    prediction_range: Tuple[float, float]  # (min, max)

@dataclass
class CategoryPrediction:
    """Category-specific prediction"""
    category: str
    predicted_amount: float
    confidence: float
    trend: str
    percentage_of_total: float

class ExpensePredictor:
    """Advanced expense prediction system using multiple ML models"""
    
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.historical_data = pd.DataFrame()
        self.category_models = {}
        self.seasonal_patterns = {}
        self.model_path = os.path.join(os.path.dirname(__file__), "../data/prediction_models")
        
        # Ensure model directory exists
        os.makedirs(self.model_path, exist_ok=True)
        
        logger.info("ExpensePredictor initialized")
    
    def load_transaction_data(self, transactions: List[Dict]) -> pd.DataFrame:
        """Convert transaction data to pandas DataFrame with proper formatting"""
        if not transactions:
            logger.warning("No transaction data provided")
            return pd.DataFrame()
        
        # Convert to DataFrame
        df = pd.DataFrame(transactions)
        
        # Ensure required columns exist
        required_columns = ['date', 'amount', 'category', 'description']
        for col in required_columns:
            if col not in df.columns:
                df[col] = 'Unknown' if col in ['category', 'description'] else 0
        
        # Convert date column
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'])
        else:
            # If no date, use current date for demo
            df['date'] = datetime.now()
        
        # Convert amount to numeric
        df['amount'] = pd.to_numeric(df['amount'], errors='coerce').fillna(0)
        
        # Separate income and expenses
        df['is_income'] = df['amount'] > 0
        df['expense_amount'] = df['amount'].apply(lambda x: abs(x) if x < 0 else 0)
        df['income_amount'] = df['amount'].apply(lambda x: x if x > 0 else 0)
        
        # Add time features
        df['year'] = df['date'].dt.year
        df['month'] = df['date'].dt.month
        df['day'] = df['date'].dt.day
        df['day_of_week'] = df['date'].dt.dayofweek
        df['week_of_year'] = df['date'].dt.isocalendar().week
        df['is_weekend'] = df['day_of_week'].isin([5, 6])
        
        logger.info(f"Loaded {len(df)} transactions from {df['date'].min()} to {df['date'].max()}")
        return df
    
    def generate_synthetic_data(self, months: int = 12) -> pd.DataFrame:
        """Generate synthetic transaction data for testing"""
        logger.info(f"Generating {months} months of synthetic transaction data")
        
        # Base categories with typical spending patterns
        categories = {
            'Food & Dining': {'base': 8000, 'variation': 0.3, 'seasonal': 1.2},
            'Transportation': {'base': 3000, 'variation': 0.4, 'seasonal': 1.0},
            'Shopping': {'base': 5000, 'variation': 0.6, 'seasonal': 1.5},  # Higher during festivals
            'Bills & Utilities': {'base': 2500, 'variation': 0.1, 'seasonal': 1.1},  # Stable
            'Entertainment': {'base': 2000, 'variation': 0.5, 'seasonal': 1.3},
            'Healthcare': {'base': 1500, 'variation': 0.8, 'seasonal': 1.1},
            'Groceries': {'base': 4000, 'variation': 0.2, 'seasonal': 1.0},
            'Education': {'base': 1000, 'variation': 0.3, 'seasonal': 1.0},
        }
        
        transactions = []
        start_date = datetime.now() - timedelta(days=months * 30)
        used_dates = set()  # Track used dates to avoid duplicates
        
        for month_offset in range(months):
            current_date = start_date + timedelta(days=month_offset * 30)
            
            # Seasonal factor (higher spending in Dec, Oct due to festivals)
            seasonal_multiplier = 1.0
            if current_date.month in [10, 11, 12]:  # Festival season
                seasonal_multiplier = 1.4
            elif current_date.month in [6, 7, 8]:  # Monsoon/summer - lower spending
                seasonal_multiplier = 0.9
            
            # Generate transactions for each category
            for category, params in categories.items():
                # Monthly base amount with variation
                base_amount = params['base']
                variation = params['variation']
                seasonal_factor = params['seasonal'] * seasonal_multiplier
                
                # Random variation around base amount
                monthly_amount = base_amount * seasonal_factor * (1 + np.random.normal(0, variation))
                monthly_amount = max(monthly_amount, base_amount * 0.3)  # Minimum spending
                
                # Create multiple transactions throughout the month
                num_transactions = np.random.randint(8, 20)  # 8-20 transactions per category per month
                
                for i in range(num_transactions):
                    # Generate unique date within the month
                    attempts = 0
                    while attempts < 50:  # Prevent infinite loop
                        day_offset = np.random.randint(0, 28)
                        hour = np.random.randint(8, 22)  # Random hour between 8 AM and 10 PM
                        minute = np.random.randint(0, 60)
                        transaction_date = current_date + timedelta(days=day_offset, hours=hour, minutes=minute)
                        
                        # Use datetime string as key to avoid duplicates
                        date_key = transaction_date.strftime('%Y-%m-%d %H:%M:%S')
                        if date_key not in used_dates:
                            used_dates.add(date_key)
                            break
                        attempts += 1
                    
                    # Random amount distribution
                    transaction_amount = monthly_amount / num_transactions
                    transaction_amount *= (1 + np.random.normal(0, 0.3))  # Add noise
                    transaction_amount = max(transaction_amount, 10)  # Minimum transaction
                    
                    # Weekend spending tends to be higher for some categories
                    if transaction_date.weekday() in [5, 6] and category in ['Food & Dining', 'Entertainment', 'Shopping']:
                        transaction_amount *= 1.3
                    
                    transactions.append({
                        'date': transaction_date,
                        'amount': -abs(transaction_amount),  # Expenses are negative
                        'category': category,
                        'description': f"{category} transaction"
                    })
        
        # Add some income transactions
        for month_offset in range(months):
            current_date = start_date + timedelta(days=month_offset * 30)
            # Salary (monthly)
            transactions.append({
                'date': current_date + timedelta(days=1),  # First of month
                'amount': np.random.normal(50000, 5000),  # Salary with variation
                'category': 'Income',
                'description': 'Monthly salary'
            })
            
            # Occasional freelance income
            if np.random.random() < 0.3:  # 30% chance
                transactions.append({
                    'date': current_date + timedelta(days=np.random.randint(5, 25)),
                    'amount': np.random.normal(15000, 5000),
                    'category': 'Income',
                    'description': 'Freelance work'
                })
        
        # Create DataFrame directly
        try:
            df = pd.DataFrame(transactions)
            
            if df.empty:
                logger.warning("No transactions generated")
                return df
            
            # Process the data similar to load_transaction_data but without external dependencies
            df['date'] = pd.to_datetime(df['date'], errors='coerce')
            df['amount'] = pd.to_numeric(df['amount'], errors='coerce').fillna(0)
            
            # Remove any rows with invalid dates
            df = df.dropna(subset=['date'])
            
            # Separate income and expenses
            df['is_income'] = df['amount'] > 0
            df['expense_amount'] = df['amount'].apply(lambda x: abs(x) if x < 0 else 0)
            df['income_amount'] = df['amount'].apply(lambda x: x if x > 0 else 0)
            
            # Add time features
            df['year'] = df['date'].dt.year
            df['month'] = df['date'].dt.month
            df['day'] = df['date'].dt.day
            df['day_of_week'] = df['date'].dt.dayofweek
            df['week_of_year'] = df['date'].dt.isocalendar().week
            df['is_weekend'] = df['day_of_week'].isin([5, 6])
            
            # Remove any duplicate rows but keep the data structure loose
            df = df.drop_duplicates(subset=['date', 'amount', 'category'], keep='first')
            
            # Reset index to avoid any index conflicts
            df = df.reset_index(drop=True)
            
            logger.info(f"Generated {len(df)} synthetic transactions from {df['date'].min()} to {df['date'].max()}")
            return df
            
        except Exception as e:
            logger.error(f"Error generating synthetic data: {str(e)}")
            # Return empty DataFrame with required columns
            return pd.DataFrame(columns=['date', 'amount', 'category', 'description', 'is_income', 'expense_amount', 'income_amount'])

    def _train_statistical_model(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Train a simple statistical model for limited data"""
        logger.info("Training statistical prediction model for limited data")
        
        # Calculate basic statistics from real data
        expenses = df[df['expense_amount'] > 0]
        if len(expenses) == 0:
            logger.warning("No expense data found")
            return {'success': False, 'message': 'No expense data available'}
        
        # Calculate time period for proper averaging
        date_range_days = max(1, (expenses['date'].max() - expenses['date'].min()).days + 1)
        
        # Store statistical model
        self.models['statistical'] = {
            'daily_average': expenses['expense_amount'].sum() / date_range_days,
            'monthly_average': expenses['expense_amount'].sum() * 30 / date_range_days,
            'category_averages': expenses.groupby('category')['expense_amount'].mean().to_dict(),
            'total_expenses': expenses['expense_amount'].sum(),
            'transaction_count': len(expenses),
            'date_range_days': date_range_days
        }
        
        logger.info(f"Statistical model trained with {len(expenses)} transactions")
        return {
            'success': True, 
            'message': f'Statistical model trained with {len(expenses)} real transactions',
            'model_type': 'statistical'
        }

    def _predict_statistical(self, target_date: datetime) -> PredictionResult:
        """Make prediction using statistical model (for limited data)"""
        if 'statistical' not in self.models:
            return PredictionResult(0, 0.1, 'unknown', 1.0, 0, (0, 0))
        
        stats = self.models['statistical']
        
        # Simple prediction based on daily average * days in month
        days_in_month = 30  # Simplified
        predicted_amount = stats['daily_average'] * days_in_month
        
        # Conservative confidence for limited data
        confidence = min(0.6, 0.3 + (stats['transaction_count'] / 30) * 0.3)
        
        # Simple trend analysis
        trend = 'stable'  # Conservative default for limited data
        
        # Seasonal factor (minimal for limited data)
        seasonal_factor = 1.0
        
        # Prediction range (wider for uncertainty)
        uncertainty = predicted_amount * 0.4  # 40% uncertainty
        prediction_range = (
            max(0, predicted_amount - uncertainty),
            predicted_amount + uncertainty
        )
        
        logger.info(f"Statistical prediction: ₹{predicted_amount:.2f} (confidence: {confidence:.2f})")
        
        return PredictionResult(
            predicted_amount=predicted_amount,
            confidence=confidence,
            trend=trend,
            seasonal_factor=seasonal_factor,
            historical_average=stats['daily_average'],
            prediction_range=prediction_range
        )

    def analyze_patterns(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze spending patterns and trends"""
        logger.info("Analyzing spending patterns...")
        
        if df.empty:
            return {
                'overall_trend': {'slope': 0, 'direction': 'stable', 'monthly_average': 0, 'monthly_std': 0},
                'category_patterns': {},
                'seasonal_patterns': {},
                'weekly_patterns': {}
            }
        
        patterns = {}
        
        try:
            # Overall monthly spending trend
            expenses_df = df[df['expense_amount'] > 0].copy()
            if len(expenses_df) > 0:
                expenses_df['year_month'] = expenses_df['date'].dt.to_period('M')
                monthly_expenses = expenses_df.groupby('year_month')['expense_amount'].sum().reset_index()
                
                if len(monthly_expenses) > 1:
                    # Calculate trend
                    x = np.arange(len(monthly_expenses))
                    y = monthly_expenses['expense_amount'].values
                    slope, intercept = np.polyfit(x, y, 1)
                    
                    patterns['overall_trend'] = {
                        'slope': float(slope),
                        'direction': 'increasing' if slope > 100 else 'decreasing' if slope < -100 else 'stable',
                        'monthly_average': float(np.mean(y)),
                        'monthly_std': float(np.std(y))
                    }
                else:
                    patterns['overall_trend'] = {
                        'slope': 0,
                        'direction': 'stable',
                        'monthly_average': float(expenses_df['expense_amount'].mean()),
                        'monthly_std': 0
                    }
            else:
                patterns['overall_trend'] = {'slope': 0, 'direction': 'stable', 'monthly_average': 0, 'monthly_std': 0}
            
            # Category-wise patterns
            category_patterns = {}
            for category in df['category'].unique():
                if category == 'Income':
                    continue
                    
                cat_data = df[(df['category'] == category) & (df['expense_amount'] > 0)]
                if len(cat_data) > 0:
                    # Use period-based grouping to avoid date index conflicts
                    cat_data_copy = cat_data.copy()
                    cat_data_copy['year_month'] = cat_data_copy['date'].dt.to_period('M')
                    monthly_cat = cat_data_copy.groupby('year_month')['expense_amount'].sum().reset_index()
                    
                    category_patterns[category] = {
                        'monthly_average': float(monthly_cat['expense_amount'].mean()),
                        'monthly_std': float(monthly_cat['expense_amount'].std() if len(monthly_cat) > 1 else 0),
                        'total_transactions': len(cat_data),
                        'percentage_of_total': float(cat_data['expense_amount'].sum() / df['expense_amount'].sum() * 100)
                    }
            
            patterns['category_patterns'] = category_patterns
            
            # Seasonal patterns
            expenses_for_seasonal = df[df['expense_amount'] > 0].copy()
            if len(expenses_for_seasonal) > 0:
                seasonal_data = expenses_for_seasonal.groupby(expenses_for_seasonal['date'].dt.month)['expense_amount'].mean()
                patterns['seasonal_patterns'] = {
                    int(month): float(amount) for month, amount in seasonal_data.items()
                }
            else:
                patterns['seasonal_patterns'] = {}
            
            # Weekly patterns
            if len(expenses_for_seasonal) > 0:
                weekly_data = expenses_for_seasonal.groupby(expenses_for_seasonal['date'].dt.dayofweek)['expense_amount'].mean()
                patterns['weekly_patterns'] = {
                    int(day): float(amount) for day, amount in weekly_data.items()
                }
            else:
                patterns['weekly_patterns'] = {}
            
            logger.info("Pattern analysis completed")
            
        except Exception as e:
            logger.error(f"Error in pattern analysis: {str(e)}")
            patterns = {
                'overall_trend': {'slope': 0, 'direction': 'stable', 'monthly_average': 0, 'monthly_std': 0},
                'category_patterns': {},
                'seasonal_patterns': {},
                'weekly_patterns': {}
            }
        return patterns
    
    def prepare_features(self, df: pd.DataFrame, target_month: datetime) -> np.ndarray:
        """Prepare features for ML model"""
        # Features based on historical patterns
        features = []
        
        # Previous months' spending (last 6 months)
        for i in range(1, 7):
            prev_month = target_month.replace(day=1) - timedelta(days=32*i)
            prev_month = prev_month.replace(day=1)
            
            month_data = df[
                (df['date'].dt.year == prev_month.year) & 
                (df['date'].dt.month == prev_month.month) &
                (df['expense_amount'] > 0)
            ]
            
            monthly_total = month_data['expense_amount'].sum() if len(month_data) > 0 else 0
            features.append(monthly_total)
        
        # Seasonal features
        features.extend([
            target_month.month,  # Month of year
            target_month.weekday(),  # Day of week for 1st of month
            1 if target_month.month in [10, 11, 12] else 0,  # Festival season
            1 if target_month.month in [6, 7, 8] else 0,  # Monsoon season
        ])
        
        # Trend features (if we have enough data)
        if len(df) > 30:
            recent_data = df[df['date'] >= (target_month - timedelta(days=90))]
            trend_slope = 0
            if len(recent_data) > 1:
                monthly_totals = recent_data[recent_data['expense_amount'] > 0].groupby(
                    [recent_data['date'].dt.year, recent_data['date'].dt.month]
                )['expense_amount'].sum()
                
                if len(monthly_totals) > 1:
                    x = np.arange(len(monthly_totals))
                    y = monthly_totals.values
                    trend_slope = np.polyfit(x, y, 1)[0]
            
            features.append(trend_slope)
        else:
            features.append(0)
        
        return np.array(features).reshape(1, -1)
    
    def train_prediction_models(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Train ML models for expense prediction"""
        logger.info("Training expense prediction models...")
        
        if df.empty:
            logger.warning("No transaction data provided. Using synthetic data for demo.")
            df = self.generate_synthetic_data(12)
        elif len(df) < 30:
            logger.warning(f"Limited data: {len(df)} transactions. Predictions may be less accurate but using real data.")
            # Continue with real data instead of replacing with synthetic
        
        # Analyze patterns first
        patterns = self.analyze_patterns(df)
        self.seasonal_patterns = patterns.get('seasonal_patterns', {})
        
        # Prepare training data for overall expense prediction
        X_train = []
        y_train = []
        
        # Get unique months in the data
        df['year_month'] = df['date'].dt.to_period('M')
        unique_months = sorted(df['year_month'].unique())
        
        # Handle limited data with statistical approach instead of ML
        if len(unique_months) < 3:
            logger.warning(f"Very limited data ({len(unique_months)} months). Using statistical prediction instead of ML.")
            self._use_statistical_prediction = True
            return self._train_statistical_model(df)
        elif len(unique_months) < 7:
            logger.warning(f"Limited historical months ({len(unique_months)}). Using simplified ML approach.")
            self._use_statistical_prediction = False
        
        # Create training examples
        for i in range(6, len(unique_months)):  # Start from 7th month
            target_month_period = unique_months[i]
            target_month = target_month_period.to_timestamp()
            
            # Get actual spending for this month
            month_data = df[
                (df['year_month'] == target_month_period) & 
                (df['expense_amount'] > 0)
            ]
            actual_spending = month_data['expense_amount'].sum()
            
            if actual_spending > 0:  # Only include months with spending
                features = self.prepare_features(df, target_month)
                X_train.append(features[0])
                y_train.append(actual_spending)
        
        if len(X_train) == 0:
            logger.error("No valid training data created")
            return {}
        
        X_train = np.array(X_train)
        y_train = np.array(y_train)
        
        logger.info(f"Training with {len(X_train)} samples")
        
        # Train multiple models
        models = {}
        
        # Random Forest Regressor
        rf_model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            min_samples_split=2,
            random_state=42
        )
        rf_model.fit(X_train, y_train)
        models['random_forest'] = rf_model
        
        # Linear Regression with scaling
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        
        lr_model = LinearRegression()
        lr_model.fit(X_train_scaled, y_train)
        models['linear_regression'] = lr_model
        self.scalers['linear_regression'] = scaler
        
        # Evaluate models
        model_scores = {}
        for name, model in models.items():
            if name == 'linear_regression':
                y_pred = model.predict(X_train_scaled)
            else:
                y_pred = model.predict(X_train)
            
            mae = mean_absolute_error(y_train, y_pred)
            rmse = np.sqrt(mean_squared_error(y_train, y_pred))
            r2 = r2_score(y_train, y_pred)
            
            model_scores[name] = {
                'mae': mae,
                'rmse': rmse,
                'r2': r2
            }
            
            logger.info(f"{name}: MAE={mae:.2f}, RMSE={rmse:.2f}, R2={r2:.3f}")
        
        # Select best model based on R2 score
        best_model_name = max(model_scores.keys(), key=lambda x: model_scores[x]['r2'])
        self.models['main'] = models[best_model_name]
        
        logger.info(f"Best model: {best_model_name}")
        
        # Train category-specific models
        self.train_category_models(df)
        
        # Save models
        self.save_models()
        
        return {
            'model_scores': model_scores,
            'best_model': best_model_name,
            'patterns': patterns,
            'training_samples': len(X_train)
        }
    
    def train_category_models(self, df: pd.DataFrame):
        """Train separate models for each spending category"""
        logger.info("Training category-specific models...")
        
        categories = df[df['expense_amount'] > 0]['category'].unique()
        
        for category in categories:
            if category == 'Income':
                continue
            
            cat_data = df[(df['category'] == category) & (df['expense_amount'] > 0)]
            
            if len(cat_data) < 10:  # Need minimum data
                continue
            
            # Group by month
            monthly_cat = cat_data.groupby(cat_data['date'].dt.to_period('M')).agg({
                'expense_amount': 'sum'
            }).reset_index()
            
            if len(monthly_cat) < 4:  # Need at least 4 months
                continue
            
            # Simple trend-based model for categories
            x = np.arange(len(monthly_cat))
            y = monthly_cat['expense_amount'].values
            
            if len(y) > 1:
                # Fit linear trend
                slope, intercept = np.polyfit(x, y, 1)
                
                self.category_models[category] = {
                    'type': 'linear_trend',
                    'slope': slope,
                    'intercept': intercept,
                    'average': np.mean(y),
                    'std': np.std(y),
                    'last_value': y[-1],
                    'months_trained': len(y)
                }
        
        logger.info(f"Trained models for {len(self.category_models)} categories")
    
    def predict_next_month(self, df: pd.DataFrame, target_date: Optional[datetime] = None) -> PredictionResult:
        """Predict expenses for the next month"""
        if not target_date:
            target_date = datetime.now().replace(day=1) + timedelta(days=32)
            target_date = target_date.replace(day=1)
        
        logger.info(f"Predicting expenses for {target_date.strftime('%Y-%m')}")
        
        if 'main' not in self.models and 'statistical' not in self.models:
            logger.warning("Model not trained. Training now...")
            self.train_prediction_models(df)
        
        # Use statistical prediction for limited data
        if self._use_statistical_prediction and 'statistical' in self.models:
            return self._predict_statistical(target_date)
        
        if 'main' not in self.models:
            logger.error("Failed to train model")
            return PredictionResult(0, 0, 'unknown', 1.0, 0, (0, 0))
        
        # Prepare features
        features = self.prepare_features(df, target_date)
        
        # Make prediction
        model = self.models['main']
        if hasattr(model, 'predict'):
            if 'linear_regression' in str(type(model)) and 'linear_regression' in self.scalers:
                features_scaled = self.scalers['linear_regression'].transform(features)
                predicted_amount = model.predict(features_scaled)[0]
            else:
                predicted_amount = model.predict(features)[0]
        else:
            # Fallback to simple average
            historical_avg = df[df['expense_amount'] > 0]['expense_amount'].sum() / max(1, len(df['date'].dt.to_period('M').unique()))
            predicted_amount = historical_avg
        
        # Apply seasonal adjustment
        seasonal_factor = self.seasonal_patterns.get(target_date.month, 1.0)
        if seasonal_factor > 0:
            seasonal_avg = np.mean(list(self.seasonal_patterns.values())) if self.seasonal_patterns else predicted_amount
            seasonal_factor = seasonal_factor / seasonal_avg if seasonal_avg > 0 else 1.0
        else:
            seasonal_factor = 1.0
        
        predicted_amount *= seasonal_factor
        
        # Calculate confidence based on historical variance
        historical_monthly = df[df['expense_amount'] > 0].groupby(df['date'].dt.to_period('M'))['expense_amount'].sum()
        if len(historical_monthly) > 1:
            variance = np.var(historical_monthly.values)
            confidence = max(0.1, min(0.9, 1.0 - (variance / (predicted_amount ** 2))))
        else:
            confidence = 0.5
        
        # Determine trend
        if len(historical_monthly) >= 3:
            recent_trend = np.polyfit(range(len(historical_monthly)), historical_monthly.values, 1)[0]
            if recent_trend > 500:
                trend = 'increasing'
            elif recent_trend < -500:
                trend = 'decreasing'
            else:
                trend = 'stable'
        else:
            trend = 'stable'
        
        # Calculate prediction range
        historical_avg = np.mean(historical_monthly.values) if len(historical_monthly) > 0 else predicted_amount
        std_dev = np.std(historical_monthly.values) if len(historical_monthly) > 1 else predicted_amount * 0.2
        
        prediction_range = (
            max(0, predicted_amount - 1.96 * std_dev),  # 95% confidence interval
            predicted_amount + 1.96 * std_dev
        )
        
        return PredictionResult(
            predicted_amount=float(predicted_amount),
            confidence=float(confidence),
            trend=trend,
            seasonal_factor=float(seasonal_factor),
            historical_average=float(historical_avg),
            prediction_range=prediction_range
        )
    
    def predict_by_category(self, df: pd.DataFrame, target_date: Optional[datetime] = None) -> List[CategoryPrediction]:
        """Predict expenses by category for the target month"""
        if not target_date:
            target_date = datetime.now().replace(day=1) + timedelta(days=32)
            target_date = target_date.replace(day=1)
        
        logger.info(f"Predicting category expenses for {target_date.strftime('%Y-%m')}")
        
        predictions = []
        
        # Get overall prediction first
        overall_prediction = self.predict_next_month(df, target_date)
        total_predicted = overall_prediction.predicted_amount
        
        category_totals = {}
        
        for category, model_info in self.category_models.items():
            if model_info['type'] == 'linear_trend':
                # Predict next value using trend
                next_months = model_info['months_trained']
                predicted_value = model_info['intercept'] + model_info['slope'] * next_months
                
                # Apply seasonal adjustment
                seasonal_factor = self.seasonal_patterns.get(target_date.month, 1.0)
                if seasonal_factor > 0 and self.seasonal_patterns:
                    seasonal_avg = np.mean(list(self.seasonal_patterns.values()))
                    seasonal_factor = seasonal_factor / seasonal_avg if seasonal_avg > 0 else 1.0
                    predicted_value *= seasonal_factor
                
                # Ensure positive prediction
                predicted_value = max(0, predicted_value)
                
                # Calculate confidence based on historical variance
                confidence = max(0.3, min(0.9, 1.0 - (model_info['std'] / model_info['average']) if model_info['average'] > 0 else 0.5))
                
                # Determine trend
                if model_info['slope'] > 100:
                    trend = 'increasing'
                elif model_info['slope'] < -100:
                    trend = 'decreasing'
                else:
                    trend = 'stable'
                
                category_totals[category] = predicted_value
                
                predictions.append(CategoryPrediction(
                    category=category,
                    predicted_amount=float(predicted_value),
                    confidence=float(confidence),
                    trend=trend,
                    percentage_of_total=0.0  # Will be calculated later
                ))
        
        # Handle categories without models (use historical average)
        historical_categories = df[df['expense_amount'] > 0]['category'].unique()
        for category in historical_categories:
            if category == 'Income' or category in self.category_models:
                continue
            
            # Use historical average for this category
            cat_data = df[(df['category'] == category) & (df['expense_amount'] > 0)]
            monthly_avg = cat_data.groupby(cat_data['date'].dt.to_period('M'))['expense_amount'].sum().mean()
            
            if monthly_avg > 0:
                category_totals[category] = monthly_avg
                
                predictions.append(CategoryPrediction(
                    category=category,
                    predicted_amount=float(monthly_avg),
                    confidence=0.6,
                    trend='stable',
                    percentage_of_total=0.0
                ))
        
        # Normalize predictions to match total prediction
        actual_total = sum(category_totals.values())
        if actual_total > 0 and total_predicted > 0:
            normalization_factor = total_predicted / actual_total
            
            for prediction in predictions:
                prediction.predicted_amount *= normalization_factor
                prediction.percentage_of_total = (prediction.predicted_amount / total_predicted) * 100
        
        # Sort by predicted amount (descending)
        predictions.sort(key=lambda x: x.predicted_amount, reverse=True)
        
        logger.info(f"Generated predictions for {len(predictions)} categories")
        return predictions
    
    def save_models(self):
        """Save trained models to disk"""
        try:
            model_file = os.path.join(self.model_path, "expense_prediction_models.pkl")
            
            model_data = {
                'models': self.models,
                'scalers': self.scalers,
                'category_models': self.category_models,
                'seasonal_patterns': self.seasonal_patterns,
                'timestamp': datetime.now().isoformat()
            }
            
            with open(model_file, 'wb') as f:
                pickle.dump(model_data, f)
            
            logger.info(f"Models saved to {model_file}")
            
        except Exception as e:
            logger.error(f"Failed to save models: {str(e)}")
    
    def load_models(self) -> bool:
        """Load trained models from disk"""
        try:
            model_file = os.path.join(self.model_path, "expense_prediction_models.pkl")
            
            if not os.path.exists(model_file):
                logger.info("No saved models found")
                return False
            
            with open(model_file, 'rb') as f:
                model_data = pickle.load(f)
            
            self.models = model_data.get('models', {})
            self.scalers = model_data.get('scalers', {})
            self.category_models = model_data.get('category_models', {})
            self.seasonal_patterns = model_data.get('seasonal_patterns', {})
            
            logger.info(f"Models loaded from {model_file}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load models: {str(e)}")
            return False
    
    async def initialize(self):
        """Initialize the predictor (load models if available)"""
        logger.info("Initializing ExpensePredictor...")
        
        if not self.load_models():
            logger.info("No pre-trained models found. Will train on first prediction request.")
        
        self._use_statistical_prediction = False
        logger.info(f"ExpensePredictor initialization complete")