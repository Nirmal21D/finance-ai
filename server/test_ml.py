#!/usr/bin/env python3
"""
Test script for Finance AI ML Server
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_health():
    """Test server health"""
    print("🔍 Testing server health...")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Server is healthy!")
            return True
        else:
            print(f"❌ Server health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to server: {e}")
        return False

def test_categorization():
    """Test transaction categorization"""
    print("\n🧠 Testing ML categorization...")
    
    test_transactions = [
        {"description": "Swiggy food delivery", "amount": -450},
        {"description": "Uber ride to office", "amount": -120},
        {"description": "Amazon shopping", "amount": -2500},
        {"description": "Salary credit", "amount": 50000},
        {"description": "Electricity bill payment", "amount": -800},
    ]
    
    for transaction in test_transactions:
        try:
            response = requests.post(
                f"{BASE_URL}/api/ml/categorize",
                json=transaction,
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ '{transaction['description']}' → {result['predicted_category']} (confidence: {result['confidence']:.2f})")
            else:
                print(f"❌ Failed to categorize '{transaction['description']}': {response.status_code}")
                
        except Exception as e:
            print(f"❌ Error categorizing '{transaction['description']}': {e}")

def test_batch_categorization():
    """Test batch categorization"""
    print("\n📦 Testing batch categorization...")
    
    transactions = [
        {"description": "Netflix subscription", "amount": -199},
        {"description": "Grocery shopping at DMart", "amount": -1200},
        {"description": "Doctor consultation", "amount": -500},
        {"description": "Rent payment", "amount": -15000},
    ]
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/ml/categorize-batch",
            json={"transactions": transactions},
            timeout=15
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Batch processed: {result['successful_predictions']}/{result['total_processed']} successful")
            
            for i, prediction in enumerate(result['results']):
                desc = transactions[i]['description']
                category = prediction['predicted_category']
                confidence = prediction['confidence']
                print(f"   '{desc}' → {category} (confidence: {confidence:.2f})")
        else:
            print(f"❌ Batch categorization failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Batch categorization error: {e}")

def test_model_info():
    """Test model information endpoint"""
    print("\n📊 Testing model info...")
    
    try:
        response = requests.get(f"{BASE_URL}/api/ml/model-info", timeout=5)
        
        if response.status_code == 200:
            info = response.json()
            print(f"✅ Model Status: {info.get('status', 'unknown')}")
            print(f"   Model Type: {info.get('model_type', 'unknown')}")
            print(f"   Categories: {len(info.get('categories', []))}")
        else:
            print(f"❌ Model info failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Model info error: {e}")

def main():
    """Main test function"""
    print("🚀 Finance AI ML Server Test Suite")
    print("=" * 50)
    
    # Test server health first
    if not test_health():
        print("\n❌ Server is not running. Please start the server first:")
        print("   cd server && python start_server.py")
        return
    
    # Wait a moment for server to be fully ready
    print("⏳ Waiting for server to be ready...")
    time.sleep(2)
    
    # Run all tests
    test_categorization()
    test_batch_categorization()
    test_model_info()
    
    print("\n" + "=" * 50)
    print("🎉 Test suite completed!")
    print("\n💡 Next steps:")
    print("   1. Start your Next.js app: npm run dev")
    print("   2. Create transactions to test ML categorization")
    print("   3. Check confidence scores in the UI")

if __name__ == "__main__":
    main()