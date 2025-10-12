import { generatePersonalizedInsights, generateSpendingAnalysis, generateGoalRecommendations, type FinancialData } from "@/lib/ai"
import { TransactionService, type FinancialSummary } from "@/lib/transaction-service"

export async function POST(req: Request) {
  try {
    // Input validation
    const body = await req.json().catch(() => ({}))
    const { message, userId, analysisType } = body
    
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return Response.json(
        { ok: false, error: "Message is required and must be a non-empty string" },
        { status: 400 }
      )
    }
    
    if (message.length > 1000) {
      return Response.json(
        { ok: false, error: "Message too long. Please keep it under 1000 characters." },
        { status: 400 }
      )
    }

    // If userId is provided, generate personalized insights
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

        let response: string

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
          default:
            response = await generatePersonalizedInsights(financialData, message.trim())
        }

        return Response.json({ 
          ok: true, 
          data: { text: response }
        })
      } catch (error) {
        console.error("Personalized AI Error:", error)
        // Fall back to generic response if personalized fails
      }
    }
    
    // Generic response for users without transaction data or when personalized fails
    const prompt = `You are a helpful personal finance assistant. Respond concisely with a practical tip or analysis.\nUser: ${message.trim()}`
    
    const { generateText } = await import("ai")
    const { text } = await generateText({
      model: "google-vertex/gemini-1.5-flash",
      prompt,
    })
    
    return Response.json({ 
      ok: true, 
      data: { text: text || "I'm sorry, I couldn't generate a response. Please try again." }
    })
    
  } catch (error) {
    console.error("AI Chat Error:", error)
    return Response.json(
      { ok: false, error: "Failed to process your request. Please try again later." },
      { status: 500 }
    )
  }
}
