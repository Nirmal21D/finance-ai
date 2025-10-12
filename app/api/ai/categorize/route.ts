import { categorizeExpense } from "@/lib/ai"

export async function POST(req: Request) {
  try {
    // Input validation
    const body = await req.json().catch(() => ({}))
    const { note, amount } = body
    
    if (!note || typeof note !== 'string' || note.trim().length === 0) {
      return Response.json({ 
        ok: true, 
        data: { category: "Other" }
      })
    }
    
    if (typeof amount !== 'number' || isNaN(amount)) {
      return Response.json({ 
        ok: true, 
        data: { category: "Other" }
      })
    }
    
    const category = await categorizeExpense({ note: note.trim(), amount: Math.abs(amount) })
    
    return Response.json({ 
      ok: true, 
      data: { category }
    })
    
  } catch (error) {
    console.error("AI Categorize Error:", error)
    return Response.json({ 
      ok: true, 
      data: { category: "Other" }
    })
  }
}
