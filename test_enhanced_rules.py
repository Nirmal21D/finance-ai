#!/usr/bin/env python3
"""
Test the enhanced categorization system
"""
import requests
import json

def test_enhanced_categorization():
    """Test the enhanced rule-based categorization"""
    
    # Test transactions with various patterns
    test_cases = [
        # Food & Dining (expenses are negative)
        {"note": "Swiggy food delivery", "amount": -450, "expected": "Food & Dining"},
        {"note": "McDonald's lunch", "amount": -250, "expected": "Food & Dining"},
        {"note": "Restaurant dinner", "amount": -800, "expected": "Food & Dining"},
        {"note": "Starbucks coffee", "amount": -180, "expected": "Food & Dining"},
        
        # Transportation
        {"note": "Uber ride to office", "amount": -120, "expected": "Transportation"},
        {"note": "Petrol pump fuel", "amount": -2000, "expected": "Transportation"},
        {"note": "Metro card recharge", "amount": -500, "expected": "Transportation"},
        {"note": "Parking charges", "amount": -50, "expected": "Transportation"},
        
        # Shopping
        {"note": "Amazon purchase", "amount": -1500, "expected": "Shopping"},
        {"note": "Flipkart electronics", "amount": -25000, "expected": "Shopping"},
        {"note": "Mall shopping", "amount": -3200, "expected": "Shopping"},
        
        # Bills & Utilities
        {"note": "Electricity bill payment", "amount": -800, "expected": "Bills & Utilities"},
        {"note": "Internet broadband bill", "amount": -600, "expected": "Bills & Utilities"},
        {"note": "Airtel mobile bill", "amount": -299, "expected": "Bills & Utilities"},
        
        # Entertainment
        {"note": "Netflix subscription", "amount": -199, "expected": "Entertainment"},
        {"note": "Movie ticket booking", "amount": -300, "expected": "Entertainment"},
        {"note": "Spotify premium", "amount": -119, "expected": "Entertainment"},
        
        # Healthcare
        {"note": "Doctor consultation", "amount": -500, "expected": "Healthcare"},
        {"note": "Pharmacy medicine", "amount": -320, "expected": "Healthcare"},
        
        # Income (positive amounts)
        {"note": "Salary credit", "amount": 50000, "expected": "Income"},
        {"note": "Freelance payment", "amount": 15000, "expected": "Income"},
        
        # Groceries
        {"note": "BigBasket grocery order", "amount": -2500, "expected": "Groceries"},
        {"note": "Supermarket vegetables", "amount": -400, "expected": "Groceries"},
        
        # Edge cases
        {"note": "", "amount": -100, "expected": "Other Expense"},
        {"note": "random transaction", "amount": -100, "expected": "Other Expense"},
    ]
    
    print("🧪 Testing Enhanced Rule-Based Categorization...")
    print("=" * 60)
    
    correct_predictions = 0
    total_tests = len(test_cases)
    
    for i, test_case in enumerate(test_cases, 1):
        # Simulate the enhanced categorization logic
        predicted_category = get_enhanced_category(test_case["note"], test_case["amount"])
        expected_category = test_case["expected"]
        
        is_correct = predicted_category == expected_category
        if is_correct:
            correct_predictions += 1
            
        status = "✅" if is_correct else "❌"
        print(f"{status} Test {i:2d}: '{test_case['note'][:30]:<30}' → {predicted_category:<15} (Expected: {expected_category})")
    
    accuracy = (correct_predictions / total_tests) * 100
    print(f"\n📊 Results:")
    print(f"   Correct: {correct_predictions}/{total_tests}")
    print(f"   Accuracy: {accuracy:.1f}%")
    
    if accuracy >= 90:
        print("   🎉 Excellent accuracy!")
    elif accuracy >= 80:
        print("   👍 Good accuracy!")
    elif accuracy >= 70:
        print("   👌 Acceptable accuracy!")
    else:
        print("   ⚠️  Needs improvement!")

def get_enhanced_category(description: str, amount: float) -> str:
    """Python implementation of the enhanced categorization logic"""
    if not description:
        return "Other Expense"
    
    desc = description.lower().strip()
    
    # Income detection
    if (amount > 0 or "salary" in desc or "income" in desc or "bonus" in desc or 
        "freelance" in desc or "dividend" in desc or "refund" in desc or 
        "credit" in desc or "deposit" in desc or "payment received" in desc):
        return "Income"

    # Food & Dining
    food_keywords = ["swiggy", "zomato", "uber eats", "food", "restaurant", "dining",
                     "pizza", "burger", "coffee", "starbucks", "mcdonald", "kfc",
                     "domino", "cafe", "lunch", "dinner", "breakfast", "meal"]
    if any(keyword in desc for keyword in food_keywords):
        return "Food & Dining"

    # Transportation
    transport_keywords = ["uber", "ola", "lyft", "metro", "bus", "taxi", "petrol", 
                         "diesel", "fuel", "gas station", "parking", "toll", 
                         "auto", "rickshaw", "transport"]
    if any(keyword in desc for keyword in transport_keywords):
        return "Transportation"

    # Shopping
    shopping_keywords = ["amazon", "flipkart", "ebay", "shopping", "mall", "store",
                        "walmart", "target", "costco", "purchase", "buy", "order",
                        "clothes", "electronics", "books"]
    if any(keyword in desc for keyword in shopping_keywords):
        return "Shopping"

    # Bills & Utilities
    bills_keywords = ["electricity", "water", "gas", "internet", "wifi", "broadband",
                     "phone", "mobile", "telecom", "bill", "utility", "power",
                     "cable", "dth", "airtel", "jio", "vodafone"]
    if any(keyword in desc for keyword in bills_keywords):
        return "Bills & Utilities"

    # Groceries
    grocery_keywords = ["grocery", "supermarket", "vegetables", "fruits", "market", 
                       "dmart", "bigbasket", "grofers", "fresh", "organic", "dairy", "meat"]
    if any(keyword in desc for keyword in grocery_keywords):
        return "Groceries"

    # Healthcare
    health_keywords = ["doctor", "hospital", "medical", "pharmacy", "medicine", "clinic",
                      "dentist", "health", "checkup", "treatment", "surgery", "test"]
    if any(keyword in desc for keyword in health_keywords):
        return "Healthcare"

    # Entertainment
    entertainment_keywords = ["netflix", "spotify", "amazon prime", "movie", "cinema", "theater",
                             "entertainment", "game", "gaming", "subscription", "music", 
                             "concert", "youtube", "disney"]
    if any(keyword in desc for keyword in entertainment_keywords):
        return "Entertainment"

    # Education
    education_keywords = ["education", "course", "school", "college", "university", "tuition",
                         "book", "learning", "training", "certification", "udemy", "coursera"]
    if any(keyword in desc for keyword in education_keywords):
        return "Education"

    # Travel
    travel_keywords = ["flight", "hotel", "booking", "travel", "trip", "vacation",
                      "airline", "makemytrip", "oyo", "airbnb", "resort", "tour"]
    if any(keyword in desc for keyword in travel_keywords):
        return "Travel"

    # Insurance
    insurance_keywords = ["insurance", "premium", "policy", "lic", "sbi life", "hdfc life",
                         "bajaj", "health insurance", "car insurance"]
    if any(keyword in desc for keyword in insurance_keywords):
        return "Insurance"

    # Investment
    investment_keywords = ["investment", "mutual fund", "sip", "stock", "zerodha", "groww",
                          "paytm money", "kuvera", "fund", "equity", "bond", "portfolio"]
    if any(keyword in desc for keyword in investment_keywords):
        return "Investment"

    # Rent
    rent_keywords = ["rent", "rental", "lease", "house rent", "apartment", "flat"]
    if any(keyword in desc for keyword in rent_keywords):
        return "Rent"

    return "Other Expense"

if __name__ == "__main__":
    test_enhanced_categorization()