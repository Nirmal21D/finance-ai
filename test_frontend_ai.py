#!/usr/bin/env python3
"""
Test the Next.js AI categorization API directly
"""
import requests
import json

def test_nextjs_ai_categorization():
    """Test the Next.js AI categorization endpoint with realistic data"""
    
    # Test with typical frontend transaction data
    test_transactions = [
        # Food transactions (negative amounts like expenses)
        {"note": "Swiggy food delivery", "amount": -450},
        {"note": "McDonald's lunch", "amount": -250},
        {"note": "Restaurant bill", "amount": -800},
        
        # Transportation
        {"note": "Uber ride", "amount": -120},
        {"note": "Petrol", "amount": -2000},
        {"note": "Metro recharge", "amount": -500},
        
        # Shopping
        {"note": "Amazon order", "amount": -1500},
        {"note": "Mall shopping", "amount": -3200},
        
        # Bills
        {"note": "Electricity bill", "amount": -1200},
        {"note": "Internet bill", "amount": -800},
        
        # Entertainment
        {"note": "Netflix", "amount": -199},
        {"note": "Movie tickets", "amount": -300},
        
        # Income (positive amounts)
        {"note": "Salary", "amount": 50000},
        {"note": "Freelance work", "amount": 15000},
        
        # Edge cases
        {"note": "test", "amount": -100},
        {"note": "", "amount": -50},
    ]
    
    print("🧪 Testing Next.js AI Categorization API...")
    print("=" * 60)
    print("⚠️  Make sure Next.js server is running on http://localhost:3000")
    print("=" * 60)
    
    api_url = "http://localhost:3000/api/ai/categorize"
    
    successful_tests = 0
    total_tests = len(test_transactions)
    
    for i, transaction in enumerate(test_transactions, 1):
        try:
            print(f"\n📋 Test {i}: '{transaction['note']}' (₹{transaction['amount']})")
            
            response = requests.post(
                api_url,
                json=transaction,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get('ok'):
                    data = result.get('data', {})
                    category = data.get('category', 'Unknown')
                    confidence = data.get('confidence', 0)
                    source = data.get('source', 'Unknown')
                    
                    print(f"   ✅ Category: {category}")
                    print(f"   📊 Confidence: {confidence:.2f}")
                    print(f"   🔍 Source: {source}")
                    
                    successful_tests += 1
                else:
                    print(f"   ❌ API returned ok=false: {result}")
            else:
                print(f"   ❌ HTTP {response.status_code}: {response.text}")
                
        except requests.exceptions.ConnectionError:
            print(f"   💥 Connection failed - Is Next.js server running?")
        except Exception as e:
            print(f"   💥 Error: {str(e)}")
    
    print(f"\n📊 Summary:")
    print(f"   Successful tests: {successful_tests}/{total_tests}")
    if successful_tests == total_tests:
        print("   🎉 All tests passed!")
    else:
        print("   ⚠️  Some tests failed - check Next.js server")

if __name__ == "__main__":
    test_nextjs_ai_categorization()