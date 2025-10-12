"use client"
import { useState, useRef, useEffect } from "react"
import useSWRMutation from "swr/mutation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"

async function sendChat(url: string, { arg }: { arg: { message: string; userId?: string; analysisType?: string } }) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  })
  const data = await res.json()
  return data
}

export function ChatWidget() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([])
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { trigger, isMutating } = useSWRMutation("/api/ai/chat", sendChat)
  const endRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, open])

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'en-US'
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setInput(transcript)
        setIsListening(false)
      }
      
      recognitionRef.current.onerror = () => {
        setIsListening(false)
        setError("Voice recognition failed. Please try again.")
      }
      
      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }
  }, [])

  const onSend = async (analysisType?: string) => {
    if (!input.trim()) return
    setError(null)
    const userMsg = { role: "user" as const, text: input.trim() }
    setMessages((m) => [...m, userMsg])
    setInput("")
    
    try {
      const res = await trigger({ 
        message: userMsg.text, 
        userId: user?.uid,
        analysisType 
      })
      if (res.ok) {
        setMessages((m) => [...m, { role: "ai", text: res.data?.text || "Sorry, I couldn't generate a response." }])
      } else {
        setMessages((m) => [...m, { role: "ai", text: res.error || "Something went wrong. Please try again." }])
      }
    } catch (error) {
      setMessages((m) => [...m, { role: "ai", text: "Network error. Please check your connection and try again." }])
    }
  }

  const sendQuickAnalysis = async (type: string, message: string) => {
    setInput(message)
    setTimeout(() => onSend(type), 100)
  }

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setError(null)
      setIsListening(true)
      recognitionRef.current.start()
    }
  }

  return (
    <>
      <button
        aria-label="Open AI Assistant"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-50 brut-border brut-shadow brut-hover bg-primary text-primary-foreground rounded-full px-4 py-3 font-bold"
      >
        AI
      </button>

      {open && (
        <div className="brut-border brut-shadow bg-card rounded-md p-3">
          <div className="heading text-lg mb-2">AI Co‑pilot</div>
          
          {/* Quick Analysis Buttons */}
          {user && messages.length === 0 && (
            <div className="mb-3 space-y-2">
              <div className="text-sm text-muted-foreground mb-2">Quick Analysis:</div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => sendQuickAnalysis('spending-analysis', 'Analyze my spending patterns')}
                  disabled={isMutating}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  📊 Spending Analysis
                </Button>
                <Button
                  onClick={() => sendQuickAnalysis('goal-recommendations', 'Suggest financial goals for me')}
                  disabled={isMutating}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  🎯 Goal Ideas
                </Button>
                <Button
                  onClick={() => sendQuickAnalysis('insights', 'Give me personalized financial insights')}
                  disabled={isMutating}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  💡 Insights
                </Button>
              </div>
            </div>
          )}
          
          <div className="h-56 overflow-y-auto bg-accent p-2 rounded mb-2">
            {messages.length === 0 && user && (
              <div className="text-center text-muted-foreground text-sm py-8">
                <p>👋 Hi {user.displayName || 'there'}!</p>
                <p className="mt-1">I can provide personalized financial insights based on your transaction data.</p>
                <p className="mt-2 text-xs">Try the quick analysis buttons above or ask me anything!</p>
              </div>
            )}
            {messages.length === 0 && !user && (
              <div className="text-center text-muted-foreground text-sm py-8">
                <p>Sign in to get personalized financial insights!</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                <div
                  className={
                    "inline-block brut-border rounded px-2 py-1 my-1 " +
                    (m.role === "user" ? "bg-secondary text-white" : "bg-background")
                  }
                >
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          {error && (
            <div className="text-xs text-red-600 mb-2 p-2 bg-red-50 brut-border rounded">
              {error}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              className="brut-border px-2 py-2 rounded flex-1 bg-background"
              placeholder="Ask about your finances..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isMutating && onSend()}
              disabled={isMutating}
            />
            {recognitionRef.current && (
              <Button
                onClick={startListening}
                disabled={isMutating || isListening}
                variant="outline"
                className="brut-border px-3"
                title="Voice input"
              >
                {isListening ? "🔴" : "🎤"}
              </Button>
            )}
            <Button
              onClick={() => onSend()}
              disabled={isMutating || !input.trim()}
              className="brut-border brut-shadow bg-primary text-primary-foreground hover:bg-foreground hover:text-background"
            >
              {isMutating ? "..." : "Send"}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
