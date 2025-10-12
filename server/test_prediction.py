#!/usr/bin/env python3
"""Test script to verify expense prediction with real user data"""

import json
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models.expense_predictor import ExpensePredictor

def test_prediction():
    # Sample transaction data (mimicking limited real user data)
    sample_transactions = [
        {'id': '1', 'amount': 500, 'category': 'Food', 'description': 'Grocery shopping', 'date': '2024-01-15T10:00:00Z', 'is_income': False},
        {'id': '2', 'amount': 50, 'category': 'Transport', 'description': 'Bus fare', 'date': '2024-01-10T08:00:00Z', 'is_income': False},
        {'id': '3', 'amount': 200, 'category': 'Entertainment', 'description': 'Movie tickets', 'date': '2024-01-20T19:00:00Z', 'is_income': False},
        {'id': '4', 'amount': 300, 'category': 'Food', 'description': 'Restaurant', 'date': '2024-01-25T20:00:00Z', 'is_income': False},
        {'id': '5', 'amount': 75, 'category': 'Transport', 'description': 'Taxi', 'date': '2024-01-28T15:00:00Z', 'is_income': False}
    ]

    print("=== TESTING EXPENSE PREDICTION WITH LIMITED REAL DATA ===")
    print(f"Input: {len(sample_transactions)} transactions")
    print(f"Total Input Amount: ₹{sum(t['amount'] for t in sample_transactions if not t['is_income'])}")
    
    try:
        predictor = ExpensePredictor()
        result = predictor.predict_next_month(sample_transactions)
        
        print("\n=== PREDICTION RESULT ===")
        print(f"Total Predicted Amount: ₹{result.total_amount:.2f}")
        print(f"Confidence: {result.confidence:.2f}")
        print(f"Number of Category Predictions: {len(result.category_predictions)}")
        
        print("\n=== CATEGORY BREAKDOWN ===")
        for cat in result.category_predictions:
            print(f"  {cat.category}: ₹{cat.amount:.2f} (confidence: {cat.confidence:.2f})")
        
        # Check if this looks like demo data
        if result.total_amount > 20000:  # Demo data was around ₹25,280
            print("\n⚠️  WARNING: Total amount seems high - might still be using demo data")
        else:
            print("\n✅ SUCCESS: Prediction uses reasonable amounts based on input data")
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_prediction()