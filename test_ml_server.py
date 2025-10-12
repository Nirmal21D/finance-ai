#!/usr/bin/env python3
"""
Test script for ML server
"""
import requests
import json

def test_ml_server():
    """Test the ML categorization endpoint"""
    base_url = "http://localhost:8000"
    
    # Test data
    test_transactions = [
        {"description": "Swiggy food delivery", "amount": 450},
        {"description": "Uber ride to office", "amount": 120},
        {"description": "Amazon purchase", "amount": 1500},
        {"description": "Electricity bill payment", "amount": 800},
        {"description": "Salary credit", "amount": 50000},
        {"description": "Netflix subscription", "amount": 199}
    ]
    
    print("🚀 Testing ML Server Categorization...")
    print("=" * 50)
    
    # Test individual categorization
    for i, transaction in enumerate(test_transactions, 1):
        try:
            response = requests.post(
                f"{base_url}/api/ml/categorize",
                json=transaction,
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Test {i}: '{transaction['description']}'")
                print(f"   Amount: ₹{transaction['amount']}")
                print(f"   Category: {result.get('predicted_category', 'Unknown')}")
                print(f"   Confidence: {result.get('confidence', 0):.2f}")
                print(f"   Success: {result.get('success', False)}")
                print()
            else:
                print(f"❌ Test {i} failed: HTTP {response.status_code}")
                print(f"   Response: {response.text}")
                print()
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Test {i} failed: {str(e)}")
            print()
    
    # Test batch categorization
    print("\n🔄 Testing Batch Categorization...")
    print("=" * 50)
    
    try:
        response = requests.post(
            f"{base_url}/api/ml/categorize-batch",
            json={"transactions": test_transactions},
            timeout=15
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Batch test successful!")
            print(f"   Total processed: {result.get('total_processed', 0)}")
            print(f"   Successful predictions: {result.get('successful_predictions', 0)}")
            
            for i, prediction in enumerate(result.get('results', []), 1):
                print(f"   {i}. {prediction.get('predicted_category', 'Unknown')} "
                      f"(confidence: {prediction.get('confidence', 0):.2f})")
        else:
            print(f"❌ Batch test failed: HTTP {response.status_code}")
            print(f"   Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Batch test failed: {str(e)}")
    
    # Test health check
    print("\n🏥 Testing Health Check...")
    print("=" * 50)
    
    try:
        response = requests.get(f"{base_url}/api/ml/health", timeout=5)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Health check passed!")
            print(f"   Status: {result.get('status', 'Unknown')}")
            print(f"   Model type: {result.get('model_type', 'Unknown')}")
        else:
            print(f"❌ Health check failed: HTTP {response.status_code}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Health check failed: {str(e)}")
    
    # Test model info
    print("\n📊 Testing Model Info...")
    print("=" * 50)
    
    try:
        response = requests.get(f"{base_url}/api/ml/model-info", timeout=5)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Model info retrieved!")
            print(f"   Model type: {result.get('model_type', 'Unknown')}")
            print(f"   Training samples: {result.get('training_samples', 'Unknown')}")
            print(f"   Accuracy: {result.get('accuracy', 'Unknown')}")
            print(f"   Categories: {len(result.get('categories', []))}")
        else:
            print(f"❌ Model info failed: HTTP {response.status_code}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Model info failed: {str(e)}")

if __name__ == "__main__":
    test_ml_server()