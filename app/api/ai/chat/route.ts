import { generatePersonalizedInsights, generateSpendingAnalysis, generateGoalRecommendations, type FinancialData } from "@/lib/ai"
import { TransactionService, type FinancialSummary } from "@/lib/transaction-service"

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface ChatRequest {
  message: string
  userId?: string
  analysisType?: string
  conversationHistory?: ChatMessage[]
  context?: {
    currentPage?: string
    userPreferences?: Record<string, any>
  }
}

export async function POST(req: Request) {
  try {
    // Enhanced input validation
    const body = await req.json().catch(() => ({}))
    const { 
      message, 
      userId, 
      analysisType, 
      conversationHistory = [],
      context = {} 
    }: ChatRequest = body
    
    // Enhanced validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return Response.json(
        { ok: false, error: "Message is required and must be a non-empty string" },
        { status: 400 }
      )
    }
    
    if (message.length > 2000) {
      return Response.json(
        { ok: false, error: "Message too long. Please keep it under 2000 characters." },
        { status: 400 }
      )
    }

    // Rate limiting check (simple implementation)
    const now = Date.now()
    const requestCount = 1 // In production, implement proper rate limiting
    
    if (requestCount > 30) {
      return Response.json(
        { ok: false, error: "Too many requests. Please wait a moment before sending another message." },
        { status: 429 }
      )
    }

    // Enhanced personalized response generation
    if (userId) {
      try {
        const transactionService = TransactionService.getInstance()
        const financialSummary = await transactionService.getFinancialSummary(userId)

        // Transform FinancialSummary to FinancialData format
        const categoryBreakdownRecord = financialSummary.categoryBreakdown.reduce((acc, cat) => {
          acc[cat.category] = cat.amount
          return acc
        }, {} as Record<string, number>)

        const financialData: FinancialData = {
          totalIncome: financialSummary.totalIncome,
          totalExpenses: financialSummary.totalExpenses,
          netIncome: financialSummary.totalBalance,
          monthlyData: financialSummary.monthlyData.map(m => ({
            month: m.month,
            income: m.income,
            spent: m.spent,
            net: m.income - m.spent
          })),
          categoryBreakdown: categoryBreakdownRecord,
          transactionCount: financialSummary.recentTransactions.length,
          averageTransaction: financialSummary.totalExpenses / (financialSummary.recentTransactions.length || 1),
          topCategories: financialSummary.categoryBreakdown.slice(0, 5)
        }

        // Build conversation context
        const conversationContext = conversationHistory.length > 0 
          ? `\n\nPrevious conversation:\n${conversationHistory.slice(-6).map(msg => 
              `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
            ).join('\n')}`
          : ''

        // Add contextual information
        const pageContext = context.currentPage ? `\nUser is currently on: ${context.currentPage}` : ''

        let response: string

        // Enhanced analysis with conversation context
        switch (analysisType) {
          case 'spending-analysis':
            response = await generateSpendingAnalysis(
              categoryBreakdownRecord,
              financialSummary.monthlyData
            )
            break
          case 'goal-recommendations':
            response = await generateGoalRecommendations(financialData)
            break
          case 'budget-help':
            response = await generateBudgetOptimization(financialData, message.trim())
            break
          case 'savings-tips':
            response = await generateSavingsTips(financialData, message.trim())
            break
          default:
            // Enhanced personalized insights with conversation context
            const enhancedMessage = `${message.trim()}${conversationContext}${pageContext}`
            response = await generatePersonalizedInsights(financialData, enhancedMessage)
        }

        // Add contextual suggestions
        const suggestions = await generateFollowUpSuggestions(analysisType, financialData)
        const responseWithSuggestions = suggestions.length > 0 
          ? `${response}\n\n💡 **Quick actions you might want to try:**\n${suggestions.join('\n')}`
          : response

        return Response.json({ 
          ok: true, 
          data: { 
            text: responseWithSuggestions,
            suggestions: suggestions,
            financialScore: calculateQuickFinancialScore(financialData),
            contextualTips: await generateContextualTips(financialData, message.trim())
          }
        })
      } catch (error) {
        console.error("Personalized AI Error:", error)
        // Fall back to generic response if personalized fails
      }
    }
    
    // Enhanced generic response with conversation context
    const conversationContext = conversationHistory.length > 0 
      ? `\n\nPrevious conversation context:\n${conversationHistory.slice(-4).map(msg => 
          `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
        ).join('\n')}`
      : ''

    const enhancedPrompt = `You are an intelligent personal finance assistant with deep knowledge of financial planning, budgeting, investing, and money management. 
    
    You provide:
    - Practical, actionable financial advice
    - Specific tips and strategies
    - Educational insights about financial concepts
    - Encouragement and motivation for financial goals
    
    Be conversational, helpful, and concise. Use emojis sparingly but appropriately. 
    If the user asks about complex topics, break them down into simple steps.
    ${conversationContext}
    
    Current user message: ${message.trim()}
    
    Provide a helpful response:`
    
    const { GoogleGenerativeAI } = await import("@google/generative-ai")
    
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
    
    const result = await model.generateContent(enhancedPrompt)
    const text = result.response.text()

    // Add generic financial tips for non-authenticated users
    const genericTips = [
      "💰 Track your expenses daily for better financial awareness",
      "🎯 Set specific, measurable financial goals", 
      "📊 Create a budget using the 50/30/20 rule",
      "🏦 Build an emergency fund of 3-6 months expenses"
    ]
    
    return Response.json({ 
      ok: true, 
      data: { 
        text: text || "I'm sorry, I couldn't generate a response. Please try again.",
        suggestions: [],
        tips: genericTips.slice(0, 2) // Show 2 random tips
      }
    })
    
  } catch (error) {
    console.error("AI Chat Error:", error)
    return Response.json(
      { ok: false, error: "Failed to process your request. Please try again later." },
      { status: 500 }
    )
  }
}

// Helper functions for enhanced chatbot features

async function generateBudgetOptimization(financialData: FinancialData, message: string): Promise<string> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai")
  
  const context = `
Budget Analysis:
- Total Income: ₹${financialData.totalIncome.toLocaleString()}
- Total Expenses: ₹${financialData.totalExpenses.toLocaleString()}
- Savings Rate: ${((financialData.netIncome / financialData.totalIncome) * 100).toFixed(1)}%
- Top Spending: ${financialData.topCategories.slice(0, 3).map(c => `${c.category} (₹${c.amount.toLocaleString()})`).join(', ')}
  `

  const prompt = `${context}\n\nUser query: ${message}\n\nProvide specific budget optimization advice with actionable steps:`

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
  
  const result = await model.generateContent(prompt)
  return result.response.text() || "I couldn't provide budget advice right now. Please try again."
}

async function generateSavingsTips(financialData: FinancialData, message: string): Promise<string> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai")
  
  const savingsRate = (financialData.netIncome / financialData.totalIncome) * 100
  const topExpenseCategory = financialData.topCategories[0]?.category || 'Unknown'

  const context = `
Current Financial Situation:
- Savings Rate: ${savingsRate.toFixed(1)}%
- Top Expense Category: ${topExpenseCategory}
- Monthly Net: ₹${(financialData.netIncome / (financialData.monthlyData.length || 1)).toLocaleString()}
  `

  const prompt = `${context}\n\nUser message: ${message}\n\nProvide personalized savings tips and strategies:`

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" })
  
  const result = await model.generateContent(prompt)
  return result.response.text() || "I couldn't provide savings tips right now. Please try again."
}

async function generateFollowUpSuggestions(analysisType: string | undefined, financialData: FinancialData): Promise<string[]> {
  const suggestions: string[] = []
  
  switch (analysisType) {
    case 'spending-analysis':
      suggestions.push(
        "🎯 Set spending limits for your top categories",
        "📊 View your monthly spending trends",
        "💡 Get personalized savings recommendations"
      )
      break
    case 'goal-recommendations':
      suggestions.push(
        "📈 Create a new financial goal",
        "💰 Set up automatic savings",
        "🏦 Explore investment options"
      )
      break
    case 'budget-help':
      suggestions.push(
        "📋 Review your current budget",
        "⚡ Set spending alerts",
        "🔄 Automate your finances"
      )
      break
    default:
      // Smart suggestions based on financial data
      const savingsRate = (financialData.netIncome / financialData.totalIncome) * 100
      if (savingsRate < 20) {
        suggestions.push("💰 Learn ways to increase your savings rate")
      }
      if (financialData.topCategories[0]?.amount > financialData.totalIncome * 0.4) {
        suggestions.push("✂️ Get tips to reduce your top spending category")
      }
      suggestions.push("📊 Analyze your spending patterns")
  }
  
  return suggestions.slice(0, 3) // Return max 3 suggestions
}

function calculateQuickFinancialScore(financialData: FinancialData): number {
  let score = 50 // Base score
  
  // Savings rate factor
  const savingsRate = (financialData.netIncome / financialData.totalIncome) * 100
  if (savingsRate > 20) score += 20
  else if (savingsRate > 10) score += 10
  else if (savingsRate < 0) score -= 20
  
  // Expense diversity (not spending too much in one category)
  const topCategoryPercentage = (financialData.topCategories[0]?.amount || 0) / financialData.totalExpenses * 100
  if (topCategoryPercentage < 40) score += 15
  else if (topCategoryPercentage > 60) score -= 15
  
  // Transaction consistency
  if (financialData.transactionCount > 20) score += 10
  
  return Math.min(100, Math.max(0, score))
}

async function generateContextualTips(financialData: FinancialData, userMessage: string): Promise<string[]> {
  const tips: string[] = []
  
  // Analyze message for keywords and provide relevant tips
  const message = userMessage.toLowerCase()
  
  if (message.includes('save') || message.includes('saving')) {
    tips.push("💰 Try the 52-week savings challenge - save ₹1 in week 1, ₹2 in week 2, and so on!")
  }
  
  if (message.includes('budget') || message.includes('spending')) {
    tips.push("📊 Use the envelope method - allocate cash for each spending category")
  }
  
  if (message.includes('invest') || message.includes('investment')) {
    tips.push("📈 Start with index funds - they offer diversification with low fees")
  }
  
  if (message.includes('debt') || message.includes('loan')) {
    tips.push("🎯 Pay off high-interest debt first using the avalanche method")
  }
  
  // Add contextual tip based on financial data
  const savingsRate = (financialData.netIncome / financialData.totalIncome) * 100
  if (savingsRate < 15) {
    tips.push("💡 Aim to save at least 20% of your income for financial security")
  }
  
  return tips.slice(0, 2) // Return max 2 contextual tips
}
