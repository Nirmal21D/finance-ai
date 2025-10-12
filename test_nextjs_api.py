#!/usr/bin/env python3
"""
Test the Next.js AI categorization API
"""
import requests
import json

def test_nextjs_api():
    """Test the Next.js AI categorization endpoint"""
    nextjs_url = "http://localhost:3000/api/ai/categorize"
    
    # Test data
    test_transactions = [
        {"note": "Swiggy food delivery", "amount": 450},
        {"note": "Uber ride to office", "amount": 120},
        {"note": "Amazon purchase", "amount": 1500},
        {"note": "Electricity bill payment", "amount": 800},
        {"note": "Netflix subscription", "amount": 199}
    ]
    
    print("🧪 Testing Next.js AI Categorization API...")
    print("=" * 50)
    
    for i, transaction in enumerate(test_transactions, 1):
        try:
            response = requests.post(
                nextjs_url,
                json=transaction,
                timeout=15
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Test {i}: '{transaction['note']}'")
                print(f"   Amount: ₹{transaction['amount']}")
                print(f"   Category: {result.get('data', {}).get('category', 'Unknown')}")
                print(f"   Confidence: {result.get('data', {}).get('confidence', 0):.2f}")
                print(f"   Source: {result.get('data', {}).get('source', 'Unknown')}")
                print(f"   Success: {result.get('ok', False)}")
                print()
            else:
                print(f"❌ Test {i} failed: HTTP {response.status_code}")
                print(f"   Response: {response.text}")
                print()
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Test {i} failed: {str(e)}")
            print()

if __name__ == "__main__":
    print("⚠️  Make sure Next.js server is running on http://localhost:3000")
    print("⚠️  Make sure ML server is running on http://localhost:8000")
    print()
    test_nextjs_api()