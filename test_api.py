import requests
import json

def test_prediction_api():
    """Test the expense prediction API"""
    url = "http://localhost:8000/api/predictions/predict-month"
    
    # Sample transaction data
    test_data = {
        "transactions": [
            {
                "id": "1",
                "amount": 500,
                "category": "Food",
                "description": "Grocery shopping",
                "date": "2024-01-15T10:00:00Z",
                "is_income": False
            },
            {
                "id": "2", 
                "amount": 50,
                "category": "Transport",
                "description": "Bus fare",
                "date": "2024-01-10T08:00:00Z",
                "is_income": False
            },
            {
                "id": "3",
                "amount": 200,
                "category": "Entertainment", 
                "description": "Movie tickets",
                "date": "2024-01-20T19:00:00Z",
                "is_income": False
            }
        ]
    }
    
    try:
        print("Testing expense prediction API...")
        response = requests.post(url, json=test_data, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ API Response Success!")
            print(f"Predicted Amount: ₹{result.get('predicted_amount', 0):.2f}")
            print(f"Confidence: {result.get('confidence', 0):.2f}")
            print(f"Trend: {result.get('trend', 'unknown')}")
            
            if result.get('predicted_amount', 0) < 5000:
                print("✅ Using real data (not demo data)")
            else:
                print("⚠️  Might still be using demo data")
                
        else:
            print(f"❌ API Error: {response.status_code}")
            print(response.text)
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Connection Error: {e}")
        print("Make sure the ML server is running on port ")

if __name__ == "__main__":
    test_prediction_api()