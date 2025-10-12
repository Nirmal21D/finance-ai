#!/usr/bin/env python3
"""
Direct test of ML service functionality
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'lib'))

import requests
import json

def test_ml_service_directly():
    """Test ML service like the frontend MLService class does"""
    base_url = "http://localhost:8000"
    
    print("🔍 Testing ML Service Connection...")
    print("=" * 50)
    
    # Test transactions that might be causing issues
    problematic_transactions = [
        {"description": "test transaction", "amount": 100},
        {"description": "uber", "amount": 50},
        {"description": "food", "amount": 200},
        {"description": "", "amount": 0}  # edge case
    ]
    
    for i, transaction in enumerate(problematic_transactions, 1):
        print(f"\n📋 Test {i}: Description='{transaction['description']}', Amount={transaction['amount']}")
        
        try:
            # Exactly like MLService.categorizeTransaction does
            response = requests.post(
                f"{base_url}/api/ml/categorize",
                headers={'Content-Type': 'application/json'},
                json=transaction,
                timeout=10
            )
            
            print(f"   Status Code: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"   ✅ Success: {result.get('success', False)}")
                print(f"   Category: {result.get('predicted_category', 'Unknown')}")
                print(f"   Confidence: {result.get('confidence', 0):.3f}")
                
                # Simulate the frontend logic
                if result.get('success', False) and result.get('confidence', 0) > 0.1:
                    print(f"   🎯 Would use ML prediction: {result.get('predicted_category')}")
                else:
                    print(f"   ⚠️  Would fall back to rule-based")
            else:
                print(f"   ❌ HTTP Error: {response.text}")
                
        except Exception as e:
            print(f"   💥 Connection Error: {str(e)}")
    
    # Test the health endpoint
    print(f"\n🏥 Health Check...")
    try:
        response = requests.get(f"{base_url}/api/ml/health", timeout=5)
        if response.status_code == 200:
            print(f"   ✅ ML Server is healthy")
        else:
            print(f"   ❌ Health check failed: {response.status_code}")
    except Exception as e:
        print(f"   💥 Health check error: {str(e)}")

if __name__ == "__main__":
    test_ml_service_directly()