"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { MessageCircle, X, Send, Mic, MicOff, Loader2, Bot, User } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import useSWRMutation from "swr/mutation"

interface Message {
  id: string
  role: "user" | "ai"
  content: string
  timestamp: Date
  suggestions?: string[]
  financialScore?: number
  tips?: string[]
}

interface QuickAction {
  id: string
  label: string
  icon: string
  prompt: string
  analysisType?: string
}

interface ChatResponse {
  ok: boolean
  data?: {
    text: string
    suggestions?: string[]
    financialScore?: number
    contextualTips?: string[]
  }
  error?: string
}

const quickActions: QuickAction[] = [
  {
    id: "spending",
    label: "Spending Analysis",
    icon: "📊",
    prompt: "Analyze my spending patterns and give me insights",
    analysisType: "spending-analysis"
  },
  {
    id: "goals",
    label: "Goal Ideas",
    icon: "🎯", 
    prompt: "Suggest some financial goals based on my profile",
    analysisType: "goal-recommendations"
  },
  {
    id: "budget",
    label: "Budget Help",
    icon: "💰",
    prompt: "Help me optimize my budget and spending",
    analysisType: "budget-help"
  },
  {
    id: "savings",
    label: "Savings Tips",
    icon: "🏦",
    prompt: "Give me personalized savings strategies and tips",
    analysisType: "savings-tips"
  },
  {
    id: "insights",
    label: "Financial Health",
    icon: "💡",
    prompt: "Give me personalized financial insights and tips",
    analysisType: "insights"
  },
  {
    id: "investment",
    label: "Investment Ideas",
    icon: "�",
    prompt: "Suggest investment strategies based on my financial situation"
  }
]

async function sendMessage(url: string, { arg }: { 
  arg: { 
    message: string; 
    userId?: string; 
    analysisType?: string;
    conversationHistory?: Array<{role: 'user' | 'assistant', content: string, timestamp: string}>;
    context?: {
      currentPage?: string;
      userPreferences?: Record<string, any>;
    }
  } 
}) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(arg),
    })
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    }
    
    const data = await res.json()
    return data as ChatResponse
  } catch (error) {
    console.error("Fetch error in sendMessage:", error)
    // Return a structured error response
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Network error occurred"
    } as ChatResponse
  }
}

export function PopupChatbot() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [currentSuggestions, setCurrentSuggestions] = useState<string[]>([])
  const [financialScore, setFinancialScore] = useState<number | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'checking'>('checking')
  
  const { trigger, isMutating } = useSWRMutation("/api/ai/chat", sendMessage)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
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
        setTimeout(() => setError(null), 3000)
      }
      
      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }
  }, [])

  // Check connection status - simplified version
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Simple health check instead of full chat API test
        const response = await fetch('/api/ai/chat', {
          method: 'HEAD' // Just check if endpoint exists
        })
        setConnectionStatus('online')
      } catch {
        setConnectionStatus('offline')
      }
    }

    if (isOpen) {
      // Add a small delay to avoid immediate checking
      const timer = setTimeout(checkConnection, 500)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Add welcome message when chat opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: `welcome-${Date.now()}`,
        role: "ai",
        content: user 
          ? `Hi ${user.displayName || 'there'}! 👋 I'm your AI financial assistant. I can analyze your spending, suggest goals, and provide personalized financial insights. How can I help you today?`
          : "Hello! 👋 I'm your AI financial assistant. Sign in to get personalized insights, or ask me general financial questions!",
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
    }
  }, [isOpen, user, messages.length])

  const sendChatMessage = async (messageContent: string, analysisType?: string) => {
    if (!messageContent.trim()) return

    setError(null)
    setIsTyping(true)
    
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageContent.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")

    // Start with offline mode by default due to API issues
    let useOfflineMode = true

    // Build conversation history for context
    const conversationHistory = messages.slice(-10).map(msg => ({
      role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.content,
      timestamp: msg.timestamp.toISOString()
    }))

    // Only try API if connection status is explicitly online
    if (connectionStatus === 'online') {
      try {
        const response = await trigger({
          message: messageContent.trim(),
          userId: user?.uid,
          analysisType,
          conversationHistory,
          context: {
            currentPage: window.location.pathname,
            userPreferences: {}
          }
        })

        setIsTyping(false)

        // Handle different response formats
        if (response && typeof response === 'object') {
          if (response.ok === true && response.data) {
            setConnectionStatus('online')
            
            const aiMessage: Message = {
              id: `ai-${Date.now()}`,
              role: "ai",
              content: response.data.text || "I apologize, but I couldn't generate a response. Please try again.",
              timestamp: new Date(),
              suggestions: response.data.suggestions || [],
              tips: response.data.contextualTips || []
            }

            setMessages(prev => [...prev, aiMessage])
            setCurrentSuggestions(response.data.suggestions || [])
            
            if (response.data.financialScore) {
              setFinancialScore(response.data.financialScore)
            }
            
            useOfflineMode = false // Success, don't use offline mode
            return // Success, exit function
          } else if (response.error) {
            // API returned an error response
            console.warn('API Error Response:', response.error)
            setConnectionStatus('offline')
          } else {
            // Unexpected response format
            console.warn('Unexpected response format:', response)
            setConnectionStatus('offline')
          }
        } else {
          // Invalid response
          console.warn('Invalid response received:', response)
          setConnectionStatus('offline')
        }
      } catch (error) {
        setIsTyping(false)
        setConnectionStatus('offline')
        console.error("Chat API Error:", error)
        
        // Log detailed error info for debugging
        if (error instanceof Error) {
          console.error("Error details:", {
            message: error.message,
            stack: error.stack,
            name: error.name
          })
        }
      }
    } else {
      // Connection is offline, skip API call
      setIsTyping(false)
      console.log("Using offline mode - connection status:", connectionStatus)
    }

    // Offline mode fallback
    if (useOfflineMode) {
      setIsTyping(false)
      setConnectionStatus('offline')
      
      try {
        const offlineResponse = generateOfflineResponse(messageContent.trim(), analysisType)
        
        const aiMessage: Message = {
          id: `ai-${Date.now()}`,
          role: "ai",
          content: offlineResponse.content,
          timestamp: new Date(),
          suggestions: offlineResponse.suggestions,
          tips: offlineResponse.tips
        }

        setMessages(prev => [...prev, aiMessage])
        setCurrentSuggestions(offlineResponse.suggestions)
      } catch (offlineError) {
        console.error("Offline response generation failed:", offlineError)
        
        // Ultimate fallback message
        const fallbackMessage: Message = {
          id: `fallback-${Date.now()}`,
          role: "ai",
          content: "I'm currently in offline mode and having trouble generating a response. Please make sure both the frontend (`npm run dev`) and backend servers are running for full functionality.",
          timestamp: new Date(),
          tips: ["🔧 Run `npm run dev` in the project root", "⚡ Check if all servers are running properly"]
        }
        
        setMessages(prev => [...prev, fallbackMessage])
      }
    }
  }

  const handleQuickAction = (action: QuickAction) => {
    sendChatMessage(action.prompt, action.analysisType)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendChatMessage(input)
  }

  const toggleListening = () => {
    if (recognitionRef.current && !isMutating) {
      if (isListening) {
        recognitionRef.current.stop()
        setIsListening(false)
      } else {
        setError(null)
        setIsListening(true)
        recognitionRef.current.start()
      }
    }
  }

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const generateOfflineResponse = (message: string, analysisType?: string) => {
    const messageLower = message.toLowerCase()
    
    // Add a conversational greeting for first messages
    const isFirstMessage = messages.length <= 1
    let greeting = isFirstMessage ? "Hi there! 👋 " : ""
    
    // Offline responses based on message content
    if (analysisType === 'spending-analysis' || messageLower.includes('spending') || messageLower.includes('expense')) {
      return {
        content: `${greeting}📊 **Spending Analysis**\n\nI'm currently working in offline mode, but I can still help with spending analysis!\n\nHere's what I recommend for analyzing your spending:\n\n• **Track Everything**: Record every expense for at least a week\n• **Categorize Wisely**: Food, transport, entertainment, bills, etc.\n• **Find Patterns**: Look for trends in your spending habits\n• **Set Limits**: Create budgets for each category\n• **Follow 50/30/20**: 50% needs, 30% wants, 20% savings\n\n💡 **Pro Tip**: Start with your biggest expense categories first - that's where you'll see the most impact!`,
        suggestions: ["📱 Ask about budgeting apps", "📋 Learn about the envelope method", "💰 Get savings tips"],
        tips: ["💡 Track expenses for 30 days to see real patterns", "🎯 Focus on variable expenses - they're easier to control"]
      }
    }
    
    if (analysisType === 'goal-recommendations' || messageLower.includes('goal') || messageLower.includes('save')) {
      return {
        content: "🎯 **Financial Goals (Offline Mode)**\n\nHere are some common financial goals to consider:\n\n• **Emergency Fund**: Save 3-6 months of expenses\n• **Short-term Goals**: Vacation, gadgets (6 months - 2 years)\n• **Medium-term Goals**: Car, home down payment (2-5 years)\n• **Long-term Goals**: Retirement, children's education (5+ years)\n\nStart with small, achievable goals and gradually increase them!",
        suggestions: ["🏦 Build emergency fund", "📈 Start investing", "💰 Automate savings"],
        tips: ["💡 Use the SMART goals framework: Specific, Measurable, Achievable, Relevant, Time-bound"]
      }
    }
    
    if (analysisType === 'budget-help' || messageLower.includes('budget')) {
      return {
        content: "💰 **Budget Help (Offline Mode)**\n\nBudgeting fundamentals:\n\n• **Calculate Income**: Add all sources of income\n• **Track Expenses**: List all monthly expenses\n• **Categorize**: Fixed vs. variable expenses\n• **Apply 50/30/20 Rule**: 50% needs, 30% wants, 20% savings\n• **Review Monthly**: Adjust as needed\n\nPopular budgeting methods:\n- Zero-based budgeting\n- Envelope method\n- Pay yourself first",
        suggestions: ["📊 Try budgeting apps", "📝 Create expense categories", "⚡ Set up automatic transfers"],
        tips: ["💡 Start with tracking for one month before setting strict budgets"]
      }
    }
    
    if (messageLower.includes('invest') || messageLower.includes('investment')) {
      return {
        content: "📈 **Investment Basics (Offline Mode)**\n\nInvestment fundamentals for beginners:\n\n• **Start Early**: Time is your biggest advantage\n• **Diversify**: Don't put all eggs in one basket\n• **Low-Cost Index Funds**: Great for beginners\n• **SIP (Systematic Investment Plan)**: Invest regularly\n• **Emergency Fund First**: Invest only after securing 3-6 months expenses\n\nCommon investment options:\n- Mutual funds\n- ETFs\n- Fixed deposits\n- PPF/ELSS (tax-saving)",
        suggestions: ["🏦 Research index funds", "📚 Learn investment basics", "💼 Consider SIP investing"],
        tips: ["💡 Never invest money you can't afford to lose", "🎯 Start with small amounts and increase gradually"]
      }
    }
    
    // Smart response based on keywords
    if (messageLower.includes('help') || messageLower.includes('how') || messageLower.includes('what')) {
      return {
        content: `${greeting}💡 **I'm here to help!**\n\nI can assist you with various financial topics even in offline mode:\n\n• **Budgeting & Spending**: Learn how to track and manage expenses\n• **Saving Strategies**: Tips for building emergency funds and saving more\n• **Goal Setting**: How to set and achieve financial goals\n• **Investment Basics**: Introduction to investing concepts\n• **Debt Management**: Strategies for paying off debt\n\n🤖 **Try asking me about**: "How to create a budget", "Investment tips for beginners", or "Ways to save money"`,
        suggestions: ["💰 Budgeting tips", "🎯 Setting financial goals", "📈 Investment basics"],
        tips: ["💡 Be specific with your questions for better advice!", "🔧 For personalized insights, connect to the full AI service"]
      }
    }

    // General financial advice with smart categorization
    let specificAdvice = ""
    if (messageLower.includes('money') || messageLower.includes('finance')) {
      specificAdvice = "\n\n💰 **Money Management Fundamentals**:\n• Pay yourself first - save before spending\n• Automate your finances where possible\n• Review and adjust monthly"
    } else if (messageLower.includes('save') || messageLower.includes('saving')) {
      specificAdvice = "\n\n🏦 **Smart Saving Strategies**:\n• Start with just 1% of income if needed\n• Use separate savings accounts for different goals\n• Take advantage of high-yield savings accounts"
    } else if (messageLower.includes('budget')) {
      specificAdvice = "\n\n📊 **Budgeting Success Tips**:\n• Use the zero-based budgeting method\n• Include a 'miscellaneous' category for unexpected expenses\n• Review and adjust monthly based on actual spending"
    }
    
    return {
      content: `${greeting}💡 **Financial Assistant**\n\nI'm working in offline mode but happy to help with your question: "${message}"\n\n**Here are some relevant tips**:\n\n• **Track Your Money**: Monitor income and expenses regularly\n• **Build Good Habits**: Save consistently, even small amounts\n• **Educate Yourself**: Learn about personal finance basics\n• **Plan Ahead**: Set short and long-term financial goals\n• **Stay Disciplined**: Avoid unnecessary high-interest debt${specificAdvice}\n\n🚀 **Remember**: Small, consistent actions lead to big financial wins over time!`,
      suggestions: ["📊 Spending analysis tips", "🎯 Goal setting help", "💰 Budgeting strategies"],
      tips: ["� Ask me about specific topics like 'budgeting' or 'investing'", "🔧 Connect to full service for personalized advice with your data"]
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      {/* Chat Toggle Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setIsOpen(!isOpen)}
              data-chat-button
              className={`rounded-full w-14 h-14 shadow-lg transition-all duration-300 ${
                isOpen 
                  ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90' 
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 animate-pulse'
              }`}
            >
              {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{isOpen ? 'Close chat' : 'Open AI Assistant'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Chat Window */}
      {isOpen && (
        <Card className="absolute bottom-16 right-0 w-[480px] h-[650px] shadow-2xl border-2 animate-in slide-in-from-bottom-5 duration-200 max-w-[95vw] max-h-[85vh] sm:w-[480px] sm:h-[650px] md:w-[520px] md:h-[700px]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="h-5 w-5 text-primary" />
              AI Financial Assistant
              <div className="flex-1" />
              
              {/* Connection Status */}
              <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                connectionStatus === 'online' ? 'bg-green-100 text-green-700' :
                connectionStatus === 'offline' ? 'bg-orange-100 text-orange-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'online' ? 'bg-green-500' :
                  connectionStatus === 'offline' ? 'bg-orange-500' :
                  'bg-gray-500'
                }`} />
                <span className="capitalize">{connectionStatus}</span>
              </div>

              {financialScore && (
                <div className="flex items-center gap-1 text-xs bg-primary/10 px-2 py-1 rounded-full">
                  <span>Score:</span>
                  <span className="font-bold text-primary">{financialScore}</span>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col h-[calc(100%-80px)] min-h-[570px] p-4 pt-0">
            {/* Messages Area */}
            <ScrollArea className="flex-1 pr-4 min-h-0 overflow-y-auto">
              <div className="space-y-4 pb-4 min-h-[200px]">
                {messages.map((message) => (
                  <div key={message.id} className="space-y-2">
                    <div
                      className={`flex items-start gap-3 ${
                        message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        {message.role === 'user' ? (
                          <>
                            <AvatarImage src={user?.photoURL || undefined} />
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </>
                        ) : (
                          <AvatarFallback className="bg-primary/10">
                            <Bot className="h-4 w-4 text-primary" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                      
                      <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'} max-w-[75%]`}>
                        <div
                          className={`rounded-lg px-3 py-2 text-sm ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {message.content}
                        </div>
                        <span className="text-xs text-muted-foreground mt-1">
                          {formatTimestamp(message.timestamp)}
                        </span>
                      </div>
                    </div>

                    {/* Show AI message tips */}
                    {message.role === 'ai' && message.tips && message.tips.length > 0 && (
                      <div className="ml-11 space-y-1 mt-2">
                        {message.tips.map((tip, index) => (
                          <div key={index} className="text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded-lg border border-blue-200 shadow-sm">
                            {tip}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Show suggestions */}
                    {message.role === 'ai' && message.suggestions && message.suggestions.length > 0 && (
                      <div className="ml-11 flex flex-wrap gap-2 mt-2">
                        {message.suggestions.map((suggestion, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => sendChatMessage(suggestion.replace(/^[🎯📊💡💰⚡🔄✂️📈📋🏦]+\s*/, ''))}
                            className="text-xs h-7 px-3 hover:bg-primary/10 transition-colors"
                            disabled={isMutating || isTyping}
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                
                {(isMutating || isTyping) && (
                  <div className="flex items-start gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary/10">
                        <Bot className="h-4 w-4 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-xs text-muted-foreground">
                        {isTyping ? 'Analyzing your finances...' : 'Thinking...'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Quick Actions */}
            {messages.length <= 1 && user && (
              <div className="my-4 p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <p className="text-sm font-medium text-blue-900 mb-3">✨ Quick Financial Analysis:</p>
                <div className="grid grid-cols-2 gap-2">
                  {quickActions.slice(0, 6).map((action) => (
                    <Button
                      key={action.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleQuickAction(action)}
                      disabled={isMutating || isTyping}
                      className="justify-start text-xs h-9 hover:bg-white/70 border border-transparent hover:border-blue-200 transition-all"
                    >
                      <span className="mr-2 text-sm">{action.icon}</span>
                      <span className="truncate">{action.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Contextual Suggestions */}
            {currentSuggestions.length > 0 && messages.length > 1 && (
              <div className="my-3 p-3 border rounded-lg bg-green-50 border-green-200">
                <p className="text-sm font-medium text-green-900 mb-2">💡 You might also want to:</p>
                <div className="flex flex-wrap gap-2">
                  {currentSuggestions.slice(0, 3).map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => sendChatMessage(suggestion.replace(/^[🎯📊💡💰⚡🔄✂️📈📋🏦]+\s*/, ''))}
                      className="text-xs h-7 px-3 border-green-300 text-green-700 hover:bg-green-100 transition-colors"
                      disabled={isMutating || isTyping}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-2 p-2 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded">
                {error}
              </div>
            )}

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="flex gap-2 mt-4 pt-2 border-t bg-background">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? "🎤 Listening..." : "Ask about your finances..."}
                disabled={isMutating || isTyping}
                className="flex-1 h-10"
              />
              
              {recognitionRef.current && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={toggleListening}
                        disabled={isMutating || isTyping}
                        className={`px-3 ${isListening ? 'bg-red-100 border-red-300' : ''}`}
                      >
                        {isListening ? <MicOff className="h-4 w-4 text-red-600" /> : <Mic className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isListening ? 'Stop recording' : 'Voice input'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              <Button 
                type="submit" 
                disabled={isMutating || isTyping || !input.trim()} 
                size="sm"
                className="relative"
              >
                {(isMutating || isTyping) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
            
            {/* Smart Input Hints */}
            {input.length === 0 && messages.length > 0 && (
              <div className="mt-1 text-xs text-muted-foreground text-center">
                💡 Try: "How can I save more?" or "Analyze my budget"
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}