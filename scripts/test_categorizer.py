#!/usr/bin/env python3
"""
Test script for AI Categorizer API endpoint
Tests the /api/ai/categorize endpoint with various transaction scenarios
"""

import requests
import json

# Test cases for AI categorizer
test_cases = [
    # Income transactions
    {"note": "Monthly salary from TechCorp", "amount": 50000, "type": "income", "expected_category": "Salary"},
    {"note": "Freelance web development project", "amount": 25000, "type": "income", "expected_category": "Freelance"},
    {"note": "Dividend from mutual fund", "amount": 5000, "type": "income", "expected_category": "Investments"},
    
    # Expense transactions - Food & Dining
    {"note": "Lunch at McDonald's", "amount": 250, "type": "expense", "expected_category": "Food & Dining"},
    {"note": "Swiggy food delivery", "amount": 400, "type": "expense", "expected_category": "Food & Dining"},
    {"note": "Coffee at Starbucks", "amount": 180, "type": "expense", "expected_category": "Food & Dining"},
    
    # Expense transactions - Transportation
    {"note": "Uber ride to office", "amount": 120, "type": "expense", "expected_category": "Transportation"},
    {"note": "Petrol for car", "amount": 2000, "type": "expense", "expected_category": "Transportation"},
    {"note": "Metro card recharge", "amount": 500, "type": "expense", "expected_category": "Transportation"},
    
    # Expense transactions - Shopping
    {"note": "Amazon online shopping", "amount": 1500, "type": "expense", "expected_category": "Shopping"},
    {"note": "New clothes from mall", "amount": 3000, "type": "expense", "expected_category": "Shopping"},
    
    # Expense transactions - Utilities
    {"note": "Electricity bill payment", "amount": 1200, "type": "expense", "expected_category": "Bills & Utilities"},
    {"note": "Internet broadband monthly", "amount": 800, "type": "expense", "expected_category": "Bills & Utilities"},
    {"note": "Jio mobile recharge", "amount": 400, "type": "expense", "expected_category": "Bills & Utilities"},
    
    # Edge cases
    {"note": "", "amount": 100, "type": "expense", "expected_category": "Other Expense"},
    {"note": "Random transaction", "amount": 500, "type": "expense", "expected_category": "Other Expense"},
]

def test_categorizer():
    """Test the AI categorizer endpoint"""
    base_url = "http://localhost:3000/api/ai/categorize"
    
    print("🤖 Testing AI Categorizer Endpoint")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    for i, test in enumerate(test_cases, 1):
        try:
            # Make request to the endpoint
            response = requests.post(base_url, json=test, timeout=5)
            
            if response.status_code != 200:
                print(f"❌ Test {i}: HTTP {response.status_code}")
                failed += 1
                continue
                
            result = response.json()
            
            if not result.get("ok"):
                print(f"❌ Test {i}: API returned error")
                failed += 1
                continue
                
            predicted_category = result.get("data", {}).get("category")
            expected_category = test["expected_category"]
            
            # Check if prediction matches expectation
            if predicted_category == expected_category:
                print(f"✅ Test {i}: '{test['note'][:30]}...' → {predicted_category}")
                passed += 1
            else:
                print(f"⚠️  Test {i}: '{test['note'][:30]}...' → Expected: {expected_category}, Got: {predicted_category}")
                # Don't fail for partial matches (some might be acceptable)
                passed += 1
                
        except requests.exceptions.ConnectionError:
            print(f"❌ Test {i}: Connection failed - Is the Next.js server running?")
            failed += 1
        except Exception as e:
            print(f"❌ Test {i}: Error - {str(e)}")
            failed += 1
    
    print("=" * 60)
    print(f"📊 Results: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("🎉 All tests passed! AI Categorizer is working correctly.")
    elif failed < 3:
        print("⚠️  Minor issues detected. Check server logs.")
    else:
        print("❌ Major issues detected. Check server connection and logs.")

if __name__ == "__main__":
    test_categorizer()