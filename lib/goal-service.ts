import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  orderBy,
  Timestamp 
} from "firebase/firestore"
import { getFirebase } from "@/lib/firebase"
import { TransactionService } from "@/lib/transaction-service"

export interface Goal {
  id: string
  userId: string
  title: string
  description: string
  targetAmount: number
  currentAmount: number
  deadline: string
  category: 'savings' | 'debt-reduction' | 'investment' | 'expense-reduction' | 'other'
  status: 'active' | 'completed' | 'paused'
  priority: 'low' | 'medium' | 'high'
  milestones: GoalMilestone[]
  linkedTransactionCategory?: string // For automatic progress tracking
  reminderFrequency: 'weekly' | 'monthly' | 'none'
  notes: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface GoalMilestone {
  id: string
  title: string
  targetAmount: number
  targetDate: string
  isCompleted: boolean
  completedDate?: string
  reward?: string
}

export interface GoalAlert {
  id: string
  userId: string
  goalId: string
  type: 'milestone_reached' | 'deadline_approaching' | 'off_track' | 'completed'
  message: string
  isRead: boolean
  createdAt: Timestamp
}

export interface GoalProgress {
  goal: Goal
  progressPercentage: number
  remainingAmount: number
  daysRemaining: number
  monthlyTargetAmount: number
  onTrack: boolean
  projectedCompletion?: string
}

export class GoalService {
  private static instance: GoalService
  private db = getFirebase().db

  static getInstance(): GoalService {
    if (!GoalService.instance) {
      GoalService.instance = new GoalService()
    }
    return GoalService.instance
  }

  async getUserGoals(userId: string): Promise<Goal[]> {
    if (!this.db) throw new Error("Firestore not initialized")

    const goalsRef = collection(this.db, "goals")
    // Temporary fix: Query without orderBy to avoid index requirement
    // TODO: Re-enable orderBy after creating composite index in Firebase Console
    const q = query(
      goalsRef,
      where("userId", "==", userId)
    )

    const snapshot = await getDocs(q)
    const goals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Goal))

    // Sort in memory as temporary workaround
    return goals.sort((a, b) => {
      const aTime = a.createdAt?.toMillis() || 0
      const bTime = b.createdAt?.toMillis() || 0
      return bTime - aTime // Descending order
    })
  }

  async createGoal(userId: string, goalData: Omit<Goal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (!this.db) throw new Error("Firestore not initialized")

    const goalsRef = collection(this.db, "goals")
    const now = Timestamp.now()
    
    const docRef = await addDoc(goalsRef, {
      ...goalData,
      userId,
      createdAt: now,
      updatedAt: now
    })

    return docRef.id
  }

  async updateGoal(goalId: string, updates: Partial<Omit<Goal, 'id' | 'userId' | 'createdAt'>>): Promise<void> {
    if (!this.db) throw new Error("Firestore not initialized")

    const goalRef = doc(this.db, "goals", goalId)
    await updateDoc(goalRef, {
      ...updates,
      updatedAt: Timestamp.now()
    })
  }

  async deleteGoal(goalId: string): Promise<void> {
    if (!this.db) throw new Error("Firestore not initialized")

    const goalRef = doc(this.db, "goals", goalId)
    await deleteDoc(goalRef)
  }

  async updateGoalProgress(goalId: string, newAmount: number): Promise<void> {
    const goals = await this.getUserGoals(goalId.split('-')[0]) // Extract userId from goalId pattern
    const goal = goals.find(g => g.id === goalId)
    
    if (!goal) return

    // Check for milestone completions
    const completedMilestones = goal.milestones.map(milestone => {
      if (!milestone.isCompleted && newAmount >= milestone.targetAmount) {
        return {
          ...milestone,
          isCompleted: true,
          completedDate: new Date().toISOString().split('T')[0]
        }
      }
      return milestone
    })

    // Determine new status
    let newStatus: Goal['status'] = 'active'
    if (newAmount >= goal.targetAmount) {
      newStatus = 'completed'
    }

    await this.updateGoal(goalId, { 
      currentAmount: newAmount,
      status: newStatus,
      milestones: completedMilestones
    })

    // Create alerts for newly completed milestones
    const newlyCompleted = completedMilestones.filter((m, i) => 
      m.isCompleted && !goal.milestones[i].isCompleted
    )

    for (const milestone of newlyCompleted) {
      await this.createGoalAlert({
        userId: goal.userId,
        goalId: goalId,
        type: 'milestone_reached',
        message: `Milestone achieved: ${milestone.title} for goal "${goal.title}"`,
        isRead: false,
        createdAt: Timestamp.now()
      })
    }

    // Create completion alert if goal is completed
    if (newStatus === 'completed' && goal.status !== 'completed') {
      await this.createGoalAlert({
        userId: goal.userId,
        goalId: goalId,
        type: 'completed',
        message: `Congratulations! You've completed your goal: "${goal.title}"`,
        isRead: false,
        createdAt: Timestamp.now()
      })
    }
  }

  async createGoalAlert(alert: Omit<GoalAlert, 'id'>): Promise<string> {
    if (!this.db) throw new Error("Firestore not initialized")

    const alertsRef = collection(this.db, "goal_alerts")
    const docRef = await addDoc(alertsRef, alert)
    return docRef.id
  }

  async getGoalAlerts(userId: string): Promise<GoalAlert[]> {
    if (!this.db) throw new Error("Firestore not initialized")

    const alertsRef = collection(this.db, "goal_alerts")
    const q = query(
      alertsRef,
      where("userId", "==", userId)
    )

    const snapshot = await getDocs(q)
    const alerts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as GoalAlert))

    return alerts.sort((a, b) => {
      const aTime = a.createdAt?.toMillis() || 0
      const bTime = b.createdAt?.toMillis() || 0
      return bTime - aTime
    })
  }

  async getGoalProgress(userId: string): Promise<GoalProgress[]> {
    const goals = await this.getUserGoals(userId)
    const transactionService = TransactionService.getInstance()
    
    return Promise.all(goals.map(async (goal) => {
      const progressPercentage = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
      const remainingAmount = Math.max(goal.targetAmount - goal.currentAmount, 0)
      
      const deadline = new Date(goal.deadline)
      const now = new Date()
      const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      // Calculate monthly target based on remaining time
      const monthsRemaining = Math.max(daysRemaining / 30, 1)
      const monthlyTargetAmount = remainingAmount / monthsRemaining
      
      // Check if on track based on current progress and timeline
      const expectedProgress = Math.max(0, 100 - (daysRemaining / 365) * 100)
      const onTrack = progressPercentage >= expectedProgress * 0.8 // 80% tolerance
      
      // Project completion date based on current progress
      let projectedCompletion: string | undefined
      if (goal.currentAmount > 0 && remainingAmount > 0) {
        const monthsToComplete = remainingAmount / Math.max(monthlyTargetAmount, goal.currentAmount / 12)
        const projectedDate = new Date()
        projectedDate.setMonth(projectedDate.getMonth() + monthsToComplete)
        projectedCompletion = projectedDate.toISOString().split('T')[0]
      }

      return {
        goal,
        progressPercentage,
        remainingAmount,
        daysRemaining,
        monthlyTargetAmount,
        onTrack,
        projectedCompletion
      }
    }))
  }

  async getGoalsByCategory(userId: string, category: Goal['category']): Promise<Goal[]> {
    if (!this.db) throw new Error("Firestore not initialized")

    const goalsRef = collection(this.db, "goals")
    // Temporary fix: Query without orderBy to avoid index requirement
    // TODO: Re-enable orderBy after creating composite index in Firebase Console
    const q = query(
      goalsRef,
      where("userId", "==", userId),
      where("category", "==", category)
    )

    const snapshot = await getDocs(q)
    const goals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Goal))

    // Sort in memory as temporary workaround
    return goals.sort((a, b) => {
      const aTime = a.createdAt?.toMillis() || 0
      const bTime = b.createdAt?.toMillis() || 0
      return bTime - aTime // Descending order
    })
  }

  async getActiveGoals(userId: string): Promise<Goal[]> {
    if (!this.db) throw new Error("Firestore not initialized")

    const goalsRef = collection(this.db, "goals")
    // Temporary fix: Query without orderBy to avoid index requirement
    // TODO: Re-enable orderBy after creating composite index in Firebase Console
    const q = query(
      goalsRef,
      where("userId", "==", userId),
      where("status", "==", "active")
    )

    const snapshot = await getDocs(q)
    const goals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Goal))

    // Sort in memory as temporary workaround (by deadline ascending)
    return goals.sort((a, b) => {
      const aDate = new Date(a.deadline).getTime()
      const bDate = new Date(b.deadline).getTime()
      return aDate - bDate // Ascending order (earliest deadline first)
    })
  }

  // Helper method to suggest goals based on financial data
  async generateGoalSuggestions(userId: string): Promise<Partial<Goal>[]> {
    const transactionService = TransactionService.getInstance()
    const financialSummary = await transactionService.getFinancialSummary(userId)
    
    const suggestions: Partial<Goal>[] = []
    const monthlyNet = financialSummary.totalBalance / 6 // Assuming 6 months of data

    // Emergency fund suggestion
    if (monthlyNet > 0) {
      const emergencyTarget = financialSummary.totalExpenses * 0.5 // 6 months of expenses
      suggestions.push({
        title: "Emergency Fund",
        description: "Build an emergency fund to cover 6 months of expenses",
        targetAmount: emergencyTarget,
        currentAmount: 0,
        category: "savings",
        deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 1 year
      })
    }

    // Savings goal based on current net income
    if (monthlyNet > 1000) {
      suggestions.push({
        title: "Monthly Savings Goal",
        description: "Save 20% of your monthly net income",
        targetAmount: monthlyNet * 0.2 * 12, // 20% for a year
        currentAmount: 0,
        category: "savings",
        deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      })
    }

    // Expense reduction goal for top category
    if (financialSummary.categoryBreakdown.length > 0) {
      const topCategory = financialSummary.categoryBreakdown[0]
      suggestions.push({
        title: `Reduce ${topCategory.category} Spending`,
        description: `Cut down ${topCategory.category} expenses by 15%`,
        targetAmount: topCategory.amount * 0.15,
        currentAmount: 0,
        category: "expense-reduction",
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 3 months
      })
    }

    return suggestions
  }

  // Helper to format currency
  static formatCurrency(amount: number): string {
    return `₹${Math.abs(amount).toLocaleString()}`
  }

  // Helper to get category emoji
  static getCategoryEmoji(category: Goal['category']): string {
    switch (category) {
      case 'savings': return '💰'
      case 'debt-reduction': return '📉'
      case 'investment': return '📈'
      case 'expense-reduction': return '✂️'
      default: return '🎯'
    }
  }

  // Helper to get status color
  static getStatusColor(status: Goal['status']): string {
    switch (status) {
      case 'active': return 'text-blue-600'
      case 'completed': return 'text-green-600'
      case 'paused': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }
}