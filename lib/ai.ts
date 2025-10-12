import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)

export async function askGemini(prompt: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
  const result = await model.generateContent(prompt)
  return result.response.text()
}

export async function categorizeExpense(input: { note: string; amount: number }) {
  const system =
    "You are a finance assistant. Categorize the expense into one of: Food, Travel, Shopping, Bills, Health, Entertainment, Transport, Other. Return only the category word."
  const prompt = `${system}\nNote: ${input.note}\nAmount: ${input.amount}`
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
  const result = await model.generateContent(prompt)
  return (result.response.text() || "Other").trim()
}

export interface FinancialData {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  monthlyData: Array<{
    month: string;
    income: number;
    spent: number;
    net: number;
  }>;
  categoryBreakdown: Record<string, number>;
  transactionCount: number;
  averageTransaction: number;
  topCategories: Array<{ category: string; amount: number; percentage: number }>;
}

export async function generatePersonalizedInsights(
  financialData: FinancialData,
  userMessage?: string
): Promise<string> {
  const context = `
Financial Summary:
- Total Income: ₹${financialData.totalIncome.toLocaleString()}
- Total Expenses: ₹${financialData.totalExpenses.toLocaleString()}
- Net Income: ₹${financialData.netIncome.toLocaleString()}
- Transaction Count: ${financialData.transactionCount}
- Average Transaction: ₹${financialData.averageTransaction.toLocaleString()}

Top Spending Categories:
${financialData.topCategories.map(cat => 
  `- ${cat.category}: ₹${cat.amount.toLocaleString()} (${cat.percentage.toFixed(1)}%)`
).join('\n')}

Monthly Trend (last 6 months):
${financialData.monthlyData.slice(-6).map(month => 
  `- ${month.month}: Income ₹${month.income.toLocaleString()}, Spent ₹${month.spent.toLocaleString()}, Net ₹${month.net.toLocaleString()}`
).join('\n')}
  `.trim()

  const systemPrompt = `You are a personal finance advisor with access to the user's financial data. 
  Provide helpful, actionable, and personalized advice based on their spending patterns and financial situation.
  Be encouraging, specific, and practical. Keep responses concise but insightful.
  Focus on trends, potential savings, budget optimization, and financial goals.`

  const userPrompt = userMessage 
    ? `${context}\n\nUser Question: ${userMessage}\n\nProvide personalized financial advice:`
    : `${context}\n\nProvide 2-3 key personalized financial insights based on this data:`

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
  const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`)

  return result.response.text() || "I couldn't generate insights at the moment. Please try again."
}

export async function generateSpendingAnalysis(
  categoryBreakdown: Record<string, number>,
  monthlyTrend: Array<{ month: string; spent: number }>
): Promise<string> {
  const totalSpent = Object.values(categoryBreakdown).reduce((sum, amount) => sum + amount, 0)
  const topCategories = Object.entries(categoryBreakdown)
    .map(([category, amount]) => ({ 
      category, 
      amount, 
      percentage: (amount / totalSpent) * 100 
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)

  const recentTrend = monthlyTrend.slice(-3)
  const trendDirection = recentTrend.length >= 2 
    ? recentTrend[recentTrend.length - 1].spent > recentTrend[0].spent ? 'increasing' : 'decreasing'
    : 'stable'

  const context = `
Spending Analysis:
- Total Spending: ₹${totalSpent.toLocaleString()}
- Top Categories: ${topCategories.map(c => `${c.category} (${c.percentage.toFixed(1)}%)`).join(', ')}
- Recent Trend: ${trendDirection}
- Last 3 Months: ${recentTrend.map(m => `${m.month}: ₹${m.spent.toLocaleString()}`).join(', ')}
  `.trim()

  const prompt = `${context}\n\nAnalyze this spending data and provide specific recommendations for budget optimization and expense reduction. Be practical and actionable.`

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
  const result = await model.generateContent(prompt)

  return result.response.text() || "Analysis unavailable. Please try again."
}

export async function generateGoalRecommendations(
  financialData: FinancialData
): Promise<string> {
  const savingsRate = financialData.netIncome / financialData.totalIncome * 100
  const monthlyNet = financialData.netIncome / (financialData.monthlyData.length || 1)

  const context = `
Financial Profile:
- Monthly Net Income: ₹${monthlyNet.toLocaleString()}
- Current Savings Rate: ${savingsRate.toFixed(1)}%
- Total Net Income: ₹${financialData.netIncome.toLocaleString()}
- Spending Pattern: ${financialData.topCategories.slice(0, 2).map(c => c.category).join(', ')} are top categories
  `.trim()

  const prompt = `${context}\n\nSuggest 3 specific, achievable financial goals based on this profile. Include target amounts and timeframes. Consider emergency fund, investments, and specific savings goals.`

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
  const result = await model.generateContent(prompt)

  return result.response.text() || "Goal recommendations unavailable. Please try again."
}
