"use client"
import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { GoalService, type Goal, type GoalProgress } from "@/lib/goal-service"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Sidebar } from "@/components/sidebar"
import { Trash2, Edit, Plus, Target, Calendar, TrendingUp, DollarSign } from "lucide-react"
import { TransactionService } from "@/lib/transaction-service"
import { toast } from "sonner"

function GoalsContent() {
  const { user } = useAuth()
  const [goalProgress, setGoalProgress] = useState<GoalProgress[]>([])
  const [suggestions, setSuggestions] = useState<Partial<Goal>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [progressGoal, setProgressGoal] = useState<Goal | null>(null)
  const [progressAmount, setProgressAmount] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetAmount: '',
    currentAmount: '0',
    deadline: '',
    category: 'savings' as Goal['category'],
    status: 'active' as Goal['status']
  })

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      targetAmount: '',
      currentAmount: '0',
      deadline: '',
      category: 'savings',
      status: 'active'
    })
  }

  const loadGoals = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)
      
      const goalService = GoalService.getInstance()
      const [progress, goalSuggestions] = await Promise.all([
        goalService.getGoalProgress(user.uid),
        goalService.generateGoalSuggestions(user.uid)
      ])
      
      setGoalProgress(progress)
      setSuggestions(goalSuggestions)
    } catch (err) {
      console.error('Error loading goals:', err)
      setError('Failed to load goals. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGoals()
  }, [user])

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      const goalService = GoalService.getInstance()
      await goalService.createGoal(user.uid, {
        title: formData.title,
        description: formData.description,
        targetAmount: Number(formData.targetAmount),
        currentAmount: Number(formData.currentAmount),
        deadline: formData.deadline,
        category: formData.category,
        status: formData.status,
        priority: 'medium',
        milestones: [],
        reminderFrequency: 'weekly',
        notes: ''
      })
      
      setIsCreateDialogOpen(false)
      resetForm()
      await loadGoals()
    } catch (err) {
      console.error('Error creating goal:', err)
      setError('Failed to create goal. Please try again.')
    }
  }

  const handleUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !editingGoal) return

    try {
      const goalService = GoalService.getInstance()
      await goalService.updateGoal(editingGoal.id, {
        title: formData.title,
        description: formData.description,
        targetAmount: Number(formData.targetAmount),
        currentAmount: Number(formData.currentAmount),
        deadline: formData.deadline,
        category: formData.category,
        status: formData.status
      })
      
      setEditingGoal(null)
      resetForm()
      await loadGoals()
    } catch (err) {
      console.error('Error updating goal:', err)
      setError('Failed to update goal. Please try again.')
    }
  }

  const handleDeleteGoal = async (goalId: string) => {
    if (!user || !confirm('Are you sure you want to delete this goal?')) return

    try {
      const goalService = GoalService.getInstance()
      await goalService.deleteGoal(goalId)
      await loadGoals()
    } catch (err) {
      console.error('Error deleting goal:', err)
      setError('Failed to delete goal. Please try again.')
    }
  }

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal)
    setFormData({
      title: goal.title,
      description: goal.description,
      targetAmount: goal.targetAmount.toString(),
      currentAmount: goal.currentAmount.toString(),
      deadline: goal.deadline,
      category: goal.category,
      status: goal.status
    })
  }

  const handleCreateFromSuggestion = (suggestion: Partial<Goal>) => {
    setFormData({
      title: suggestion.title || '',
      description: suggestion.description || '',
      targetAmount: suggestion.targetAmount?.toString() || '',
      currentAmount: suggestion.currentAmount?.toString() || '0',
      deadline: suggestion.deadline || '',
      category: suggestion.category || 'savings',
      status: 'active'
    })
    setIsCreateDialogOpen(true)
  }

  const handleAddProgress = async () => {
    if (!user || !progressGoal || !progressAmount) {
      toast.error("Please enter a valid amount")
      return
    }

    const amount = Number(progressAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid positive amount")
      return
    }

    try {
      // Create transaction for goal progress (negative amount for expenses)
      const transactionService = TransactionService.getInstance()
      await transactionService.createTransaction({
        userId: user.uid,
        category: `Goal: ${progressGoal.title}`,
        amount: -amount, // Negative for expenses
        date: new Date().toISOString().split('T')[0],
        note: `Progress towards ${progressGoal.title}`,
        type: 'expense' // Goal contribution is an expense
      })

      // Update goal progress
      const goalService = GoalService.getInstance()
      await goalService.updateGoal(progressGoal.id, {
        currentAmount: progressGoal.currentAmount + amount
      })

      toast.success(`Added ₹${amount.toLocaleString()} to ${progressGoal.title}!`)
      setProgressGoal(null)
      setProgressAmount('')
      await loadGoals()
    } catch (err) {
      console.error('Error adding progress:', err)
      toast.error('Failed to add progress. Please try again.')
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen">
        <div className="w-full p-4 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
            <Sidebar />
            <section className="flex flex-col gap-6 min-w-0">
              <header className="brut-border brut-shadow rounded-md p-4 bg-card">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </header>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      <div className="w-full p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
          <Sidebar />
          <section className="flex flex-col gap-6 min-w-0">
            <header className="brut-border brut-shadow rounded-md p-4 bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="heading text-2xl md:text-3xl">Financial Goals</h1>
                  <p className="text-muted-foreground mt-1">Track and achieve your financial objectives</p>
                </div>
                <Button className="brut-border brut-shadow" onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Goal
                </Button>
              </div>
            </header>

            {error && (
              <Alert className="brut-border border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}

            {/* Goal Suggestions */}
            {suggestions.length > 0 && (
              <div className="space-y-4">
                <h2 className="heading text-lg">Suggested Goals</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {suggestions.map((suggestion, index) => (
                    <Card key={index} className="p-4 brut-border brut-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span>{GoalService.getCategoryEmoji(suggestion.category!)}</span>
                            <h3 className="font-semibold">{suggestion.title}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{suggestion.description}</p>
                          <div className="text-sm space-y-1">
                            <div>Target: {GoalService.formatCurrency(suggestion.targetAmount!)}</div>
                            <div>Deadline: {new Date(suggestion.deadline!).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}</div>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleCreateFromSuggestion(suggestion)}
                        size="sm"
                        className="w-full mt-3 brut-border"
                      >
                        Create This Goal
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Active Goals */}
            <div className="space-y-4">
              <h2 className="heading text-lg">Your Goals</h2>
              {goalProgress.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Target className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No goals set yet</h3>
                  <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
                    Create your first financial goal to start tracking your progress towards financial success.
                  </p>
                  <Button className="brut-border brut-shadow" onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Goal
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {goalProgress.map(({ goal, progressPercentage, remainingAmount, daysRemaining, onTrack }) => (
                    <Card key={goal.id} className="p-4 brut-border brut-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{GoalService.getCategoryEmoji(goal.category)}</span>
                          <div>
                            <h3 className="font-semibold">{goal.title}</h3>
                            <p className="text-xs text-muted-foreground">{goal.description}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setProgressGoal(goal)}
                            className="brut-border"
                          >
                            <DollarSign className="w-3 h-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleEditGoal(goal)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={() => handleDeleteGoal(goal.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{GoalService.formatCurrency(goal.currentAmount)}</span>
                          <span>{GoalService.formatCurrency(goal.targetAmount)}</span>
                        </div>
                        
                        <Progress value={progressPercentage} className="h-2" />
                        
                        <div className="flex justify-between items-center">
                          <Badge variant={onTrack ? 'default' : 'destructive'} className="text-xs">
                            {progressPercentage.toFixed(0)}% Complete
                          </Badge>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {daysRemaining} days left
                          </div>
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          {GoalService.formatCurrency(remainingAmount)} remaining
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Create Goal Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="brut-border">
          <DialogHeader>
            <DialogTitle>Create Financial Goal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateGoal} className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Emergency Fund"
                required
                className="brut-border"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your goal..."
                className="brut-border"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="targetAmount">Target Amount (₹)</Label>
                <Input
                  id="targetAmount"
                  type="number"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetAmount: e.target.value }))}
                  placeholder="100000"
                  required
                  className="brut-border"
                />
              </div>
              <div>
                <Label htmlFor="currentAmount">Current Amount (₹)</Label>
                <Input
                  id="currentAmount"
                  type="number"
                  value={formData.currentAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentAmount: e.target.value }))}
                  placeholder="0"
                  className="brut-border"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as Goal['category'] }))}>
                  <SelectTrigger className="brut-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="savings">💰 Savings</SelectItem>
                    <SelectItem value="debt-reduction">💳 Debt Reduction</SelectItem>
                    <SelectItem value="investment">📈 Investment</SelectItem>
                    <SelectItem value="expense-reduction">📉 Expense Reduction</SelectItem>
                    <SelectItem value="other">🎯 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="deadline">Deadline</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                  required
                  className="brut-border"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="brut-border brut-shadow">
                Create Goal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Goal Dialog */}
      <Dialog open={editingGoal !== null} onOpenChange={(open) => !open && setEditingGoal(null)}>
        <DialogContent className="brut-border">
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateGoal} className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
                className="brut-border"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="brut-border"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-targetAmount">Target Amount (₹)</Label>
                <Input
                  id="edit-targetAmount"
                  type="number"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetAmount: e.target.value }))}
                  required
                  className="brut-border"
                />
              </div>
              <div>
                <Label htmlFor="edit-currentAmount">Current Amount (₹)</Label>
                <Input
                  id="edit-currentAmount"
                  type="number"
                  value={formData.currentAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentAmount: e.target.value }))}
                  className="brut-border"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as Goal['category'] }))}>
                  <SelectTrigger className="brut-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="savings">💰 Savings</SelectItem>
                    <SelectItem value="debt-reduction">💳 Debt Reduction</SelectItem>
                    <SelectItem value="investment">📈 Investment</SelectItem>
                    <SelectItem value="expense-reduction">📉 Expense Reduction</SelectItem>
                    <SelectItem value="other">🎯 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-deadline">Deadline</Label>
                <Input
                  id="edit-deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                  required
                  className="brut-border"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as Goal['status'] }))}>
                <SelectTrigger className="brut-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditingGoal(null)}>
                Cancel
              </Button>
              <Button type="submit" className="brut-border brut-shadow">
                Update Goal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Progress Dialog */}
      <Dialog open={progressGoal !== null} onOpenChange={(open) => !open && setProgressGoal(null)}>
        <DialogContent className="brut-border">
          <DialogHeader>
            <DialogTitle>Add Progress to {progressGoal?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="progress-amount">Amount to Add (₹)</Label>
              <Input
                id="progress-amount"
                type="number"
                value={progressAmount}
                onChange={(e) => setProgressAmount(e.target.value)}
                placeholder="1000"
                className="brut-border"
              />
            </div>
            {progressGoal && (
              <div className="text-sm text-muted-foreground space-y-1">
                <div>Current: ₹{progressGoal.currentAmount.toLocaleString()}</div>
                <div>Target: ₹{progressGoal.targetAmount.toLocaleString()}</div>
                <div>After addition: ₹{(progressGoal.currentAmount + Number(progressAmount || 0)).toLocaleString()}</div>
              </div>
            )}
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setProgressGoal(null)}>
                Cancel
              </Button>
              <Button onClick={handleAddProgress} className="brut-border brut-shadow">
                Add Progress
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}

export default function GoalsPage() {
  return (
    <ProtectedRoute>
      <GoalsContent />
    </ProtectedRoute>
  )
}