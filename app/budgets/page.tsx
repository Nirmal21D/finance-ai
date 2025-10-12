"use client"

import React, { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"
import { BudgetService, Budget, BudgetStatus } from "@/lib/budget-service"
import { TransactionService } from "@/lib/transaction-service"
import { toast } from "sonner"
import { DollarSign } from "lucide-react"

const CATEGORIES = [
  'All Categories',
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

interface EditBudgetFormProps {
  budget: Budget
  onSave: (updates: Partial<Budget>) => void
  onCancel: () => void
}

function EditBudgetForm({ budget, onSave, onCancel }: EditBudgetFormProps) {
  const [formData, setFormData] = useState({
    category: budget.category,
    monthlyLimit: budget.monthlyLimit.toString(),
    period: budget.period,
    alertThreshold: budget.alertThreshold.toString(),
    isActive: budget.isActive
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.category || !formData.monthlyLimit) {
      toast.error("Please fill in all required fields")
      return
    }

    setSaving(true)
    try {
      await onSave({
        category: formData.category,
        monthlyLimit: Number(formData.monthlyLimit),
        period: formData.period,
        alertThreshold: Number(formData.alertThreshold),
        isActive: formData.isActive
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-category">Category</Label>
          <Select 
            value={formData.category} 
            onValueChange={(value) => setFormData(f => ({ ...f, category: value }))}
          >
            <SelectTrigger className="brut-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-monthlyLimit">Budget Amount</Label>
          <Input
            id="edit-monthlyLimit"
            type="number"
            value={formData.monthlyLimit}
            onChange={(e) => setFormData(f => ({ ...f, monthlyLimit: e.target.value }))}
            className="brut-border"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-period">Period</Label>
          <Select 
            value={formData.period} 
            onValueChange={(value) => setFormData(f => ({ ...f, period: value as Budget['period'] }))}
          >
            <SelectTrigger className="brut-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-alertThreshold">Alert at % spent</Label>
          <Input
            id="edit-alertThreshold"
            type="number"
            value={formData.alertThreshold}
            onChange={(e) => setFormData(f => ({ ...f, alertThreshold: e.target.value }))}
            className="brut-border"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <input
          id="edit-isActive"
          type="checkbox"
          checked={formData.isActive}
          onChange={(e) => setFormData(f => ({ ...f, isActive: e.target.checked }))}
          className="brut-border"
        />
        <Label htmlFor="edit-isActive">Active Budget</Label>
      </div>

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={saving}
          className="brut-border brut-shadow"
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="brut-border"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

function BudgetContent() {
  const { user } = useAuth()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [budgetStatuses, setBudgetStatuses] = useState<BudgetStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [spendingBudget, setSpendingBudget] = useState<Budget | null>(null)
  const [spendingAmount, setSpendingAmount] = useState('')
  const [spendingNote, setSpendingNote] = useState('')

  // Form state
  const [budgetForm, setBudgetForm] = useState({
    category: '',
    monthlyLimit: '',
    period: 'monthly' as Budget['period'],
    alertThreshold: '80'
  })

  const budgetService = BudgetService.getInstance()

  useEffect(() => {
    if (user) {
      loadBudgets()
    }
  }, [user])

  const loadBudgets = async () => {
    if (!user) return

    try {
      setLoading(true)
      const [budgetsData, statusesData] = await Promise.all([
        budgetService.getUserBudgets(user.uid),
        budgetService.getBudgetStatus(user.uid)
      ])
      
      setBudgets(budgetsData)
      setBudgetStatuses(statusesData)
    } catch (error) {
      console.error("Failed to load budgets:", error)
      toast.error("Failed to load budgets")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBudget = async () => {
    if (!user || !budgetForm.category || !budgetForm.monthlyLimit) {
      toast.error("Please fill in all required fields")
      return
    }

    // Check if budget already exists for this category
    const existingBudget = budgets.find(b => 
      b.category === budgetForm.category && b.isActive
    )
    
    if (existingBudget) {
      toast.error("Budget already exists for this category")
      return
    }

    setCreating(true)
    try {
      await budgetService.createBudget(user.uid, {
        category: budgetForm.category,
        monthlyLimit: Number(budgetForm.monthlyLimit),
        period: budgetForm.period,
        alertThreshold: Number(budgetForm.alertThreshold),
        isActive: true
      })

      toast.success("Budget created successfully!")
      setBudgetForm({
        category: '',
        monthlyLimit: '',
        period: 'monthly',
        alertThreshold: '80'
      })
      loadBudgets()
    } catch (error) {
      console.error("Failed to create budget:", error)
      toast.error("Failed to create budget")
    } finally {
      setCreating(false)
    }
  }

  const handleUpdateBudget = async (budgetId: string, updates: Partial<Budget>) => {
    try {
      await budgetService.updateBudget(budgetId, updates)
      toast.success("Budget updated successfully!")
      setEditingId(null)
      loadBudgets()
    } catch (error) {
      console.error("Failed to update budget:", error)
      toast.error("Failed to update budget")
    }
  }

  const handleDeleteBudget = async (budgetId: string) => {
    if (!confirm("Are you sure you want to delete this budget?")) return

    try {
      await budgetService.deleteBudget(budgetId)
      toast.success("Budget deleted successfully!")
      loadBudgets()
    } catch (error) {
      console.error("Failed to delete budget:", error)
      toast.error("Failed to delete budget")
    }
  }

  const getBudgetStatusColor = (status: BudgetStatus): string => {
    if (status.isOverBudget) return 'bg-red-100 border-red-500 text-red-700'
    if (status.shouldAlert) return 'bg-yellow-100 border-yellow-500 text-yellow-700'
    return 'bg-green-100 border-green-500 text-green-700'
  }

  const getBudgetStatusIcon = (status: BudgetStatus): string => {
    if (status.isOverBudget) return '🚨'
    if (status.shouldAlert) return '⚠️'
    return '✅'
  }

  const handleAddSpending = async () => {
    if (!user || !spendingBudget || !spendingAmount) {
      toast.error("Please enter a valid amount")
      return
    }

    const amount = Number(spendingAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid positive amount")
      return
    }

    try {
      // Create transaction for budget spending (negative amount for expenses)
      const transactionService = TransactionService.getInstance()
      await transactionService.createTransaction({
        userId: user.uid,
        category: spendingBudget.category,
        amount: -amount, // Negative for expenses
        date: new Date().toISOString().split('T')[0],
        note: spendingNote || `Spending in ${spendingBudget.category}`,
        type: 'expense'
      })

      toast.success(`Added ₹${amount.toLocaleString()} spending to ${spendingBudget.category}!`)
      setSpendingBudget(null)
      setSpendingAmount('')
      setSpendingNote('')
      loadBudgets()
    } catch (err) {
      console.error('Error adding spending:', err)
      toast.error('Failed to add spending. Please try again.')
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen">
        <div className="max-w-6xl mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
          <Sidebar />
          <section className="flex items-center justify-center">
            <div className="brut-border brut-shadow rounded-md p-6 bg-card">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                <span>Loading budgets...</span>
              </div>
            </div>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      <div className="w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        <Sidebar />

        <section className="flex flex-col gap-6 min-w-0">
          <header className="brut-border brut-shadow rounded-md p-4 bg-card">
            <h1 className="heading text-2xl md:text-3xl">Budget Management</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Set spending limits and track your budget across different categories
            </p>
          </header>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="budgets">My Budgets</TabsTrigger>
              <TabsTrigger value="create">Create Budget</TabsTrigger>
            </TabsList>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="space-y-4">
              {budgetStatuses.length === 0 ? (
                <Card className="brut-border brut-shadow">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="text-6xl mb-4">💰</div>
                    <h3 className="text-lg font-semibold mb-2">No budgets yet</h3>
                    <p className="text-sm text-muted-foreground text-center mb-4">
                      Create your first budget to start tracking your spending limits
                    </p>
                    <Button onClick={() => {
                      const createTab = document.querySelector('[value="create"]') as HTMLElement
                      createTab?.click()
                    }} className="brut-border">
                      Create Budget
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Budget Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="brut-border brut-shadow">
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Total Budgeted</div>
                        <div className="text-2xl font-bold">
                          ₹{budgetStatuses.reduce((sum, s) => sum + s.budget.monthlyLimit, 0).toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="brut-border brut-shadow">
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Total Spent</div>
                        <div className="text-2xl font-bold text-red-600">
                          ₹{budgetStatuses.reduce((sum, s) => sum + s.budget.currentSpent, 0).toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="brut-border brut-shadow">
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Remaining</div>
                        <div className="text-2xl font-bold text-green-600">
                          ₹{budgetStatuses.reduce((sum, s) => sum + s.remainingAmount, 0).toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Budget Status List */}
                  <Card className="brut-border brut-shadow">
                    <CardHeader>
                      <CardTitle>Budget Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {budgetStatuses.map((status) => (
                          <div key={status.budget.id} className={`p-4 rounded-lg border-2 ${getBudgetStatusColor(status)}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{getBudgetStatusIcon(status)}</span>
                                <h3 className="font-semibold">{status.budget.category}</h3>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSpendingBudget(status.budget)}
                                  className="brut-border"
                                >
                                  <DollarSign className="w-3 h-3" />
                                </Button>
                                <Badge variant="outline">
                                  {status.spentPercentage.toFixed(1)}%
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>₹{status.budget.currentSpent.toLocaleString()} spent</span>
                                <span>₹{status.budget.monthlyLimit.toLocaleString()} budget</span>
                              </div>
                              <Progress 
                                value={status.spentPercentage} 
                                className="h-2"
                              />
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>₹{status.remainingAmount.toLocaleString()} remaining</span>
                                <span>{status.daysRemainingInPeriod} days left</span>
                              </div>
                            </div>

                            {status.projectedSpending > status.budget.monthlyLimit && (
                              <Alert className="mt-3 bg-yellow-50 border-yellow-200">
                                <AlertDescription className="text-xs">
                                  At current pace, you're projected to spend ₹{status.projectedSpending.toLocaleString()} this month
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* BUDGETS TAB */}
            <TabsContent value="budgets" className="space-y-4">
              <Card className="brut-border brut-shadow">
                <CardHeader>
                  <CardTitle>All Budgets</CardTitle>
                </CardHeader>
                <CardContent>
                  {budgets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No budgets created yet
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {budgets.map((budget) => (
                        <div key={budget.id} className="brut-border rounded-md p-4 bg-accent/20">
                          {editingId === budget.id ? (
                            <EditBudgetForm
                              budget={budget}
                              onSave={(updates) => handleUpdateBudget(budget.id, updates)}
                              onCancel={() => setEditingId(null)}
                            />
                          ) : (
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-semibold">{budget.category}</h3>
                                <p className="text-sm text-muted-foreground">
                                  ₹{budget.monthlyLimit.toLocaleString()} • {budget.period} • {budget.alertThreshold}% alert
                                </p>
                              </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="brut-border"
                                onClick={() => setSpendingBudget(budget)}
                              >
                                <DollarSign className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="brut-border"
                                onClick={() => setEditingId(budget.id)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="brut-border"
                                onClick={() => handleDeleteBudget(budget.id)}
                              >
                                Delete
                              </Button>
                            </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* CREATE TAB */}
            <TabsContent value="create" className="space-y-4">
              <Card className="brut-border brut-shadow">
                <CardHeader>
                  <CardTitle>Create New Budget</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select 
                        value={budgetForm.category} 
                        onValueChange={(value) => setBudgetForm(f => ({ ...f, category: value }))}
                      >
                        <SelectTrigger className="brut-border">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="monthlyLimit">Budget Amount</Label>
                      <Input
                        id="monthlyLimit"
                        type="number"
                        placeholder="10000"
                        value={budgetForm.monthlyLimit}
                        onChange={(e) => setBudgetForm(f => ({ ...f, monthlyLimit: e.target.value }))}
                        className="brut-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="period">Period</Label>
                      <Select 
                        value={budgetForm.period} 
                        onValueChange={(value) => setBudgetForm(f => ({ ...f, period: value as Budget['period'] }))}
                      >
                        <SelectTrigger className="brut-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="alertThreshold">Alert at % spent</Label>
                      <Input
                        id="alertThreshold"
                        type="number"
                        placeholder="80"
                        value={budgetForm.alertThreshold}
                        onChange={(e) => setBudgetForm(f => ({ ...f, alertThreshold: e.target.value }))}
                        className="brut-border"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleCreateBudget}
                    disabled={creating || !budgetForm.category || !budgetForm.monthlyLimit}
                    className="brut-border brut-shadow w-full"
                  >
                    {creating ? "Creating..." : "Create Budget"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>
      </div>

      {/* Add Spending Dialog */}
      <Dialog open={spendingBudget !== null} onOpenChange={(open) => !open && setSpendingBudget(null)}>
        <DialogContent className="brut-border">
          <DialogHeader>
            <DialogTitle>Add Spending to {spendingBudget?.category}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="spending-amount">Amount Spent (₹)</Label>
              <Input
                id="spending-amount"
                type="number"
                value={spendingAmount}
                onChange={(e) => setSpendingAmount(e.target.value)}
                placeholder="500"
                className="brut-border"
              />
            </div>
            <div>
              <Label htmlFor="spending-note">Note (optional)</Label>
              <Input
                id="spending-note"
                value={spendingNote}
                onChange={(e) => setSpendingNote(e.target.value)}
                placeholder="What did you spend on?"
                className="brut-border"
              />
            </div>
            {spendingBudget && (
              <div className="text-sm text-muted-foreground space-y-1">
                <div>Current spent: ₹{spendingBudget.currentSpent.toLocaleString()}</div>
                <div>Budget limit: ₹{spendingBudget.monthlyLimit.toLocaleString()}</div>
                <div>After spending: ₹{(spendingBudget.currentSpent + Number(spendingAmount || 0)).toLocaleString()}</div>
                <div>Remaining: ₹{(spendingBudget.monthlyLimit - spendingBudget.currentSpent - Number(spendingAmount || 0)).toLocaleString()}</div>
              </div>
            )}
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setSpendingBudget(null)}>
                Cancel
              </Button>
              <Button onClick={handleAddSpending} className="brut-border brut-shadow">
                Add Spending
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}

export default function BudgetsPage() {
  return (
    <ProtectedRoute>
      <BudgetContent />
    </ProtectedRoute>
  )
}