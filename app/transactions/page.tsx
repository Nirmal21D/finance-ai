"use client"

import { useEffect, useMemo, useState } from "react"
import { getFirebase } from "@/lib/firebase"
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  where,
  Timestamp,
} from "firebase/firestore"
import useSWRMutation from "swr/mutation"
import { Sidebar } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"

type Tx = {
  id: string
  category: string
  amount: number
  date: string
  note: string
  type: 'income' | 'expense'
}

const CATEGORIES = {
  income: [
    'Salary',
    'Freelance',
    'Business',
    'Investments',
    'Rental',
    'Gifts',
    'Other Income'
  ],
  expense: [
    'Food & Dining',
    'Shopping',
    'Transportation',
    'Bills & Utilities',
    'Healthcare',
    'Entertainment',
    'Education',
    'Travel',
    'Insurance',
    'Groceries',
    'Rent',
    'Other Expense'
  ]
}

async function categorize(url: string, { arg }: { arg: { note: string; amount: number } }) {
  const res = await fetch(url, { 
    method: "POST", 
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg) 
  })
  return res.json()
}

function TransactionsContent() {
  const [loading, setLoading] = useState(true)
  const [txs, setTxs] = useState<Tx[]>([])
  const [form, setForm] = useState({ 
    category: "", 
    amount: "", 
    date: new Date().toISOString().slice(0, 10), 
    note: "",
    type: "expense" as 'income' | 'expense'
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Tx>>({})
  const { db } = getFirebase()
  const { user } = useAuth()
  const { trigger, isMutating } = useSWRMutation("/api/ai/categorize", categorize)

  useEffect(() => {
    if (!db || !user) return
    
    const ref = collection(db, "transactions")
    // Temporary fix: Query without orderBy to avoid index requirement
    // TODO: Re-enable orderBy after creating composite index in Firebase Console
    const q = query(
      ref, 
      where("userId", "==", user.uid)
    )
    
    const unsub = onSnapshot(q, (snap) => {
        const data = snap.docs.map((d) => {
        const v = d.data() as any
        return {
          id: d.id,
          category: v.category || "Other",
          amount: v.amount || 0,
          date: v.date || "",
          note: v.note || "",
          type: v.type || "expense",
          createdAt: v.createdAt, // Include createdAt for sorting
        } as Tx & { createdAt?: any }
      })      // Sort in memory as temporary workaround for missing index
      const sortedData = data.sort((a, b) => {
        const aTime = a.createdAt?.toMillis() || 0
        const bTime = b.createdAt?.toMillis() || 0
        return bTime - aTime // Descending order (newest first)
      })
      
      setTxs(sortedData)
      setLoading(false)
    })
    return () => unsub()
  }, [db, user])

  const onAdd = async () => {
    if (!db || !user) return alert("Please sign in to add transactions.")
    
    if (!form.category || !form.amount) {
      alert("Please fill in category and amount.")
      return
    }
    
    const payload = {
      userId: user.uid,
      category: form.category,
      amount: Number(form.amount),
      date: form.date,
      note: form.note,
      type: form.type,
      createdAt: Timestamp.now(),
    }
    
    await addDoc(collection(db, "transactions"), payload)
    setForm({ 
      category: "", 
      amount: "", 
      date: new Date().toISOString().slice(0, 10), 
      note: "",
      type: "expense"
    })
  }

  const onDelete = async (id: string) => {
    if (!db) return
    await deleteDoc(doc(db, "transactions", id))
  }

  const onUpdate = async (id: string, next: Partial<Tx>) => {
    if (!db) return
    await updateDoc(doc(db, "transactions", id), next as any)
  }

  const total = useMemo(() => {
    const income = txs.filter(t => t.type === 'income').reduce((acc, t) => acc + (Number(t.amount) || 0), 0)
    const expenses = txs.filter(t => t.type === 'expense').reduce((acc, t) => acc + (Number(t.amount) || 0), 0)
    return { income, expenses, net: income - expenses }
  }, [txs])

  const startEdit = (tx: Tx) => {
    setEditingId(tx.id)
    setEditForm(tx)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const saveEdit = async () => {
    if (!db || !editingId) return
    await updateDoc(doc(db, "transactions", editingId), editForm as any)
    setEditingId(null)
    setEditForm({})
  }

  const onAI = async () => {
    if (!form.note.trim()) {
      alert("Please enter a note/description before using AI categorization.")
      return
    }
    
    try {
      const res = await trigger({ note: form.note, amount: Number(form.amount || 0) })
      if (res?.ok && res.data?.category) {
        setForm((f) => ({ ...f, category: res.data.category }))
      } else {
        setForm((f) => ({ ...f, category: "Other" }))
      }
    } catch (error) {
      console.error("AI categorization failed:", error)
      setForm((f) => ({ ...f, category: "Other" }))
    }
  }

  return (
    <main className="min-h-screen">
      <div className="w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        <Sidebar />

        <section className="flex flex-col gap-6 min-w-0">
          <header className="brut-border brut-shadow rounded-md p-4 bg-card">
            <h1 className="heading text-2xl md:text-3xl">Transactions</h1>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="brut-border">
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Total Income</div>
                  <div className="text-2xl font-bold text-green-600">₹{total.income.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card className="brut-border">
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Total Expenses</div>
                  <div className="text-2xl font-bold text-red-600">₹{total.expenses.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card className="brut-border">
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Net Balance</div>
                  <div className={`text-2xl font-bold ${total.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{total.net.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>
          </header>

          {/* Add Transaction */}
          <Card className="brut-border brut-shadow">
            <CardHeader>
              <CardTitle>Add New Transaction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={form.type} onValueChange={(value) => setForm(f => ({ ...f, type: value as 'income' | 'expense', category: '' }))}>
                    <SelectTrigger className="brut-border">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income" className="text-green-600">Income</SelectItem>
                      <SelectItem value="expense" className="text-red-600">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={form.category} onValueChange={(value) => setForm(f => ({ ...f, category: value }))}>
                    <SelectTrigger className="brut-border">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES[form.type].map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    className="brut-border"
                    placeholder="0"
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    className="brut-border"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="note">Note</Label>
                  <Input
                    id="note"
                    className="brut-border"
                    placeholder="Add a note..."
                    value={form.note}
                    onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <div className="flex gap-2">
                    <Button
                      onClick={onAdd}
                      className="brut-border brut-shadow bg-primary text-primary-foreground hover:bg-foreground hover:text-background flex-1"
                    >
                      Add
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={isMutating}
                      onClick={onAI}
                      className="brut-border brut-shadow flex-1"
                    >
                      {isMutating ? "..." : "AI"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction List */}
          <Card className="brut-border brut-shadow">
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading transactions...</div>
                ) : txs.length === 0 ? (
                  <div className="text-center py-12 px-6">
                    <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <span className="text-2xl">💰</span>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
                    <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
                      Start tracking your finances by adding your first transaction using the form above.
                    </p>
                    <div className="text-sm text-muted-foreground">
                      <p>💡 <strong>Tip:</strong> Record both income and expenses to get better insights</p>
                    </div>
                  </div>
                ) : (
                  txs.map((t) => (
                    <div key={t.id} className="brut-border rounded-md p-4 bg-background">
                      {editingId === t.id ? (
                        // Edit Mode
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                          <Select 
                            value={editForm.type || t.type} 
                            onValueChange={(value) => setEditForm(f => ({ ...f, type: value as 'income' | 'expense' }))}
                          >
                            <SelectTrigger className="brut-border">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="income" className="text-green-600">Income</SelectItem>
                              <SelectItem value="expense" className="text-red-600">Expense</SelectItem>
                            </SelectContent>
                          </Select>

                          <Select 
                            value={editForm.category || t.category} 
                            onValueChange={(value) => setEditForm(f => ({ ...f, category: value }))}
                          >
                            <SelectTrigger className="brut-border">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES[editForm.type || t.type].map((cat) => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Input
                            className="brut-border"
                            type="number"
                            value={editForm.amount || t.amount}
                            onChange={(e) => setEditForm(f => ({ ...f, amount: Number(e.target.value) }))}
                          />

                          <Input
                            className="brut-border"
                            type="date"
                            value={editForm.date || t.date}
                            onChange={(e) => setEditForm(f => ({ ...f, date: e.target.value }))}
                          />

                          <div className="flex gap-2">
                            <Button onClick={saveEdit} className="brut-border flex-1">Save</Button>
                            <Button variant="secondary" onClick={cancelEdit} className="brut-border flex-1">Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto_auto] gap-4 items-center">
                          <Badge variant={t.type === 'income' ? 'default' : 'destructive'} className="brut-border">
                            {t.type === 'income' ? '+ Income' : '- Expense'}
                          </Badge>
                          
                          <div className="flex-1">
                            <div className="font-semibold">{t.category}</div>
                            {t.note && <div className="text-sm text-muted-foreground">{t.note}</div>}
                          </div>
                          
                          <div className="text-right">
                            <div className={`text-lg font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                              {t.type === 'income' ? '+' : '-'}₹{Number(t.amount).toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(t.date).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="brut-border"
                              onClick={() => startEdit(t)}
                            >
                              Edit
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              className="brut-border" 
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this transaction?')) {
                                  onDelete(t.id)
                                }
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}

export default function TransactionsPage() {
  return (
    <ProtectedRoute>
      <TransactionsContent />
    </ProtectedRoute>
  )
}
