"use client"
import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { GoalService, type GoalProgress } from "@/lib/goal-service"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { Target, Plus, TrendingUp, Calendar } from "lucide-react"

export function GoalCard() {
  const { user } = useAuth()
  const [goalProgress, setGoalProgress] = useState<GoalProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    const loadGoals = async () => {
      try {
        setLoading(true)
        const goalService = GoalService.getInstance()
        const activeGoals = await goalService.getActiveGoals(user.uid)
        
        // Get progress for active goals only
        const progressPromises = activeGoals.map(async (goal) => {
          const allProgress = await goalService.getGoalProgress(user.uid)
          return allProgress.find(p => p.goal.id === goal.id)
        })
        
        const progress = (await Promise.all(progressPromises)).filter(Boolean) as GoalProgress[]
        setGoalProgress(progress.slice(0, 3)) // Show top 3 goals
        setError(null)
      } catch (err) {
        console.error('Error loading goals:', err)
        setError('Failed to load goals')
      } finally {
        setLoading(false)
      }
    }

    loadGoals()
  }, [user])

  if (loading) {
    return (
      <Card className="p-4 brut-border brut-shadow">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-4 brut-border brut-shadow">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Goals</h3>
        </div>
        <div className="text-sm text-red-600">{error}</div>
      </Card>
    )
  }

  if (goalProgress.length === 0) {
    return (
      <Card className="p-4 brut-border brut-shadow">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Goals</h3>
        </div>
        <div className="text-center py-6">
          <Target className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-3">No active goals</p>
          <Link href="/goals">
            <Button size="sm" className="brut-border">
              <Plus className="w-4 h-4 mr-1" />
              Create Goal
            </Button>
          </Link>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4 brut-border brut-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Active Goals</h3>
        </div>
        <Link href="/goals">
          <Button size="sm" variant="outline" className="text-xs">
            View All
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {goalProgress.map(({ goal, progressPercentage, remainingAmount, daysRemaining, onTrack }) => (
          <div key={goal.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{GoalService.getCategoryEmoji(goal.category)}</span>
                <div>
                  <div className="font-medium text-sm">{goal.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {GoalService.formatCurrency(goal.currentAmount)} / {GoalService.formatCurrency(goal.targetAmount)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{progressPercentage.toFixed(0)}%</div>
                <Badge 
                  variant={
                    progressPercentage >= 80 ? 'default' : 
                    progressPercentage >= 50 ? 'secondary' : 
                    onTrack ? 'outline' : 'destructive'
                  } 
                  className="text-xs"
                >
                  {progressPercentage >= 90 ? '🎯 Excellent' :
                   progressPercentage >= 70 ? '📈 Good' :
                   progressPercentage >= 40 ? '⚡ Progress' :
                   onTrack ? '✅ On Track' : '⚠️ Behind'}
                </Badge>
              </div>
            </div>
            
            <Progress 
              value={progressPercentage} 
              className={`h-2 ${
                progressPercentage >= 80 ? '[&>div]:bg-green-500' : 
                progressPercentage >= 50 ? '[&>div]:bg-blue-500' : 
                progressPercentage >= 25 ? '[&>div]:bg-yellow-500' : 
                '[&>div]:bg-red-500'
              }`}
            />
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {daysRemaining} days left
              </span>
              <span>{GoalService.formatCurrency(remainingAmount)} remaining</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-border">
        <Link href="/goals">
          <Button size="sm" className="w-full brut-border">
            <Plus className="w-4 h-4 mr-2" />
            Manage Goals
          </Button>
        </Link>
      </div>
    </Card>
  )
}
