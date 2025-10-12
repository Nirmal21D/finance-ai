import { MLService } from "@/lib/ml-service"

const mlService = MLService.getInstance()

export async function POST(req: Request) {
  try {
    // Input validation
    const body = await req.json().catch(() => ({}))
    const { note, amount } = body
    
    if (!note || typeof note !== 'string' || note.trim().length === 0) {
      return Response.json({ 
        ok: true, 
        data: { category: "Other Expense" }
      })
    }
    
    if (typeof amount !== 'number' || isNaN(amount)) {
      return Response.json({ 
        ok: true, 
        data: { category: "Other Expense" }
      })
    }

    // Use enhanced rule-based categorization for reliable results
    console.log(`Categorizing transaction: "${note.trim()}" with amount: ${amount}`)
    
    const category = getEnhancedCategory(note.trim(), amount)
    console.log(`Using enhanced rule-based category: ${category}`)
    
    return Response.json({ 
      ok: true,
      data: { 
        category,
        confidence: 0.9, // High confidence for rule-based system
        source: 'enhanced_rules'
      }
    })
    
  } catch (error) {
    console.error("AI Categorize Error:", error)
    return Response.json({ 
      ok: true, 
      data: { category: "Other Expense" }
    })
  }
}

function getEnhancedCategory(description: string, amount: number): string {
  if (!description) return "Other Expense"
  
  const desc = description.toLowerCase().trim()
  
  // Income detection (positive amounts or salary-related keywords)
  if (amount > 0 || desc.includes("salary") || desc.includes("income") || desc.includes("bonus") || 
      desc.includes("freelance") || desc.includes("dividend") || desc.includes("refund") || 
      desc.includes("credit") || desc.includes("deposit") || desc.includes("payment received")) {
    return "Income"
  }

  // Food & Dining (comprehensive food keywords)
  if (desc.includes("swiggy") || desc.includes("zomato") || desc.includes("uber eats") || 
      desc.includes("food") || desc.includes("restaurant") || desc.includes("dining") ||
      desc.includes("pizza") || desc.includes("burger") || desc.includes("coffee") ||
      desc.includes("starbucks") || desc.includes("mcdonald") || desc.includes("kfc") ||
      desc.includes("domino") || desc.includes("cafe") || desc.includes("lunch") ||
      desc.includes("dinner") || desc.includes("breakfast") || desc.includes("meal")) {
    return "Food & Dining"
  }

  // Transportation (ride-sharing, fuel, public transport)
  if (desc.includes("uber") || desc.includes("ola") || desc.includes("lyft") ||
      desc.includes("metro") || desc.includes("bus") || desc.includes("taxi") ||
      desc.includes("petrol") || desc.includes("diesel") || desc.includes("fuel") ||
      desc.includes("gas station") || desc.includes("parking") || desc.includes("toll") ||
      desc.includes("auto") || desc.includes("rickshaw") || desc.includes("transport")) {
    return "Transportation"
  }

  // Shopping (e-commerce and retail)
  if (desc.includes("amazon") || desc.includes("flipkart") || desc.includes("ebay") ||
      desc.includes("shopping") || desc.includes("mall") || desc.includes("store") ||
      desc.includes("walmart") || desc.includes("target") || desc.includes("costco") ||
      desc.includes("purchase") || desc.includes("buy") || desc.includes("order") ||
      desc.includes("clothes") || desc.includes("electronics") || desc.includes("books")) {
    return "Shopping"
  }

  // Bills & Utilities (comprehensive utility bills)
  if (desc.includes("electricity") || desc.includes("water") || desc.includes("gas") ||
      desc.includes("internet") || desc.includes("wifi") || desc.includes("broadband") ||
      desc.includes("phone") || desc.includes("mobile") || desc.includes("telecom") ||
      desc.includes("bill") || desc.includes("utility") || desc.includes("power") ||
      desc.includes("cable") || desc.includes("dth") || desc.includes("airtel") ||
      desc.includes("jio") || desc.includes("vodafone")) {
    return "Bills & Utilities"
  }

  // Groceries (food shopping)
  if (desc.includes("grocery") || desc.includes("supermarket") || desc.includes("vegetables") ||
      desc.includes("fruits") || desc.includes("market") || desc.includes("dmart") ||
      desc.includes("bigbasket") || desc.includes("grofers") || desc.includes("fresh") ||
      desc.includes("organic") || desc.includes("dairy") || desc.includes("meat")) {
    return "Groceries"
  }

  // Healthcare (medical expenses)
  if (desc.includes("doctor") || desc.includes("hospital") || desc.includes("medical") ||
      desc.includes("pharmacy") || desc.includes("medicine") || desc.includes("clinic") ||
      desc.includes("dentist") || desc.includes("health") || desc.includes("checkup") ||
      desc.includes("treatment") || desc.includes("surgery") || desc.includes("test")) {
    return "Healthcare"
  }

  // Entertainment (streaming, movies, games)
  if (desc.includes("netflix") || desc.includes("spotify") || desc.includes("amazon prime") ||
      desc.includes("movie") || desc.includes("cinema") || desc.includes("theater") ||
      desc.includes("entertainment") || desc.includes("game") || desc.includes("gaming") ||
      desc.includes("subscription") || desc.includes("music") || desc.includes("concert") ||
      desc.includes("youtube") || desc.includes("disney")) {
    return "Entertainment"
  }

  // Education (courses, books, tuition)
  if (desc.includes("education") || desc.includes("course") || desc.includes("school") ||
      desc.includes("college") || desc.includes("university") || desc.includes("tuition") ||
      desc.includes("book") || desc.includes("learning") || desc.includes("training") ||
      desc.includes("certification") || desc.includes("udemy") || desc.includes("coursera")) {
    return "Education"
  }

  // Travel (flights, hotels, trips)
  if (desc.includes("flight") || desc.includes("hotel") || desc.includes("booking") ||
      desc.includes("travel") || desc.includes("trip") || desc.includes("vacation") ||
      desc.includes("airline") || desc.includes("makemytrip") || desc.includes("oyo") ||
      desc.includes("airbnb") || desc.includes("resort") || desc.includes("tour")) {
    return "Travel"
  }

  // Insurance (all types of insurance)
  if (desc.includes("insurance") || desc.includes("premium") || desc.includes("policy") ||
      desc.includes("lic") || desc.includes("sbi life") || desc.includes("hdfc life") ||
      desc.includes("bajaj") || desc.includes("health insurance") || desc.includes("car insurance")) {
    return "Insurance"
  }

  // Investment (mutual funds, stocks, SIP)
  if (desc.includes("investment") || desc.includes("mutual fund") || desc.includes("sip") ||
      desc.includes("stock") || desc.includes("zerodha") || desc.includes("groww") ||
      desc.includes("paytm money") || desc.includes("kuvera") || desc.includes("fund") ||
      desc.includes("equity") || desc.includes("bond") || desc.includes("portfolio")) {
    return "Investment"
  }

  // Rent (housing rent)
  if (desc.includes("rent") || desc.includes("rental") || desc.includes("lease") ||
      desc.includes("house rent") || desc.includes("apartment") || desc.includes("flat")) {
    return "Rent"
  }

  // Default fallback
  return "Other Expense"
}
