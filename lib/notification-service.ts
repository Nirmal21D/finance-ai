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
  onSnapshot,
  Timestamp,
  limit 
} from "firebase/firestore"
import { getFirebase } from "@/lib/firebase"

export interface Notification {
  id: string
  userId: string
  type: 'budget_alert' | 'goal_milestone' | 'goal_completed' | 'bill_reminder' | 'system' | 'achievement'
  title: string
  message: string
  priority: 'low' | 'medium' | 'high'
  isRead: boolean
  actionUrl?: string
  actionText?: string
  data?: Record<string, any> // Additional data for the notification
  expiresAt?: Timestamp
  createdAt: Timestamp
}

export interface NotificationPreferences {
  id: string
  userId: string
  budgetAlerts: boolean
  goalMilestones: boolean
  billReminders: boolean
  systemUpdates: boolean
  aiInsights: boolean
  emailNotifications: boolean
  pushNotifications: boolean
  frequency: 'instant' | 'daily' | 'weekly'
  quietHours: {
    enabled: boolean
    startTime: string // "22:00"
    endTime: string   // "08:00"
  }
  updatedAt: Timestamp
}

export interface NotificationStats {
  total: number
  unread: number
  byType: Record<string, number>
  last24Hours: number
  thisWeek: number
}

export class NotificationService {
  private static instance: NotificationService
  private db = getFirebase().db

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  // =============== NOTIFICATION MANAGEMENT ===============

  async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<string> {
    if (!this.db) throw new Error("Firestore not initialized")

    const notificationsRef = collection(this.db, "notifications")
    const docRef = await addDoc(notificationsRef, {
      ...notification,
      createdAt: Timestamp.now()
    })

    return docRef.id
  }

  async getUserNotifications(
    userId: string, 
    options: {
      limit?: number
      unreadOnly?: boolean
      type?: Notification['type']
    } = {}
  ): Promise<Notification[]> {
    if (!this.db) throw new Error("Firestore not initialized")

    const notificationsRef = collection(this.db, "notifications")
    let q = query(notificationsRef, where("userId", "==", userId))

    if (options.unreadOnly) {
      q = query(q, where("isRead", "==", false))
    }

    if (options.type) {
      q = query(q, where("type", "==", options.type))
    }

    if (options.limit) {
      q = query(q, limit(options.limit))
    }

    const snapshot = await getDocs(q)
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Notification))

    // Filter expired notifications and sort
    const now = Timestamp.now()
    return notifications
      .filter(n => !n.expiresAt || n.expiresAt.toMillis() > now.toMillis())
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis() || 0
        const bTime = b.createdAt?.toMillis() || 0
        return bTime - aTime
      })
  }

  async markAsRead(notificationId: string): Promise<void> {
    if (!this.db) throw new Error("Firestore not initialized")

    const notificationRef = doc(this.db, "notifications", notificationId)
    await updateDoc(notificationRef, { isRead: true })
  }

  async markAllAsRead(userId: string): Promise<void> {
    const notifications = await this.getUserNotifications(userId, { unreadOnly: true })
    
    const updatePromises = notifications.map(notification => 
      this.markAsRead(notification.id)
    )

    await Promise.all(updatePromises)
  }

  async deleteNotification(notificationId: string): Promise<void> {
    if (!this.db) throw new Error("Firestore not initialized")

    const notificationRef = doc(this.db, "notifications", notificationId)
    await deleteDoc(notificationRef)
  }

  async deleteOldNotifications(userId: string, daysOld = 30): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)
    const cutoffTimestamp = Timestamp.fromDate(cutoffDate)

    const notifications = await this.getUserNotifications(userId)
    const oldNotifications = notifications.filter(n => 
      n.createdAt.toMillis() < cutoffTimestamp.toMillis()
    )

    const deletePromises = oldNotifications.map(n => this.deleteNotification(n.id))
    await Promise.all(deletePromises)

    return oldNotifications.length
  }

  // =============== NOTIFICATION PREFERENCES ===============

  async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    if (!this.db) throw new Error("Firestore not initialized")

    const preferencesRef = collection(this.db, "notification_preferences")
    const q = query(preferencesRef, where("userId", "==", userId))

    const snapshot = await getDocs(q)
    if (snapshot.empty) {
      return null
    }

    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    } as NotificationPreferences
  }

  async updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<void> {
    if (!this.db) throw new Error("Firestore not initialized")

    const existingPrefs = await this.getUserPreferences(userId)

    if (existingPrefs) {
      const preferencesRef = doc(this.db, "notification_preferences", existingPrefs.id)
      await updateDoc(preferencesRef, {
        ...preferences,
        updatedAt: Timestamp.now()
      })
    } else {
      const preferencesRef = collection(this.db, "notification_preferences")
      await addDoc(preferencesRef, {
        userId,
        budgetAlerts: true,
        goalMilestones: true,
        billReminders: true,
        systemUpdates: true,
        aiInsights: true,
        emailNotifications: false,
        pushNotifications: true,
        frequency: 'instant',
        quietHours: {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00'
        },
        ...preferences,
        updatedAt: Timestamp.now()
      })
    }
  }

  // =============== SMART NOTIFICATIONS ===============

  async createBudgetAlert(
    userId: string, 
    budgetId: string, 
    category: string, 
    spent: number, 
    limit: number, 
    isOverBudget = false
  ): Promise<string> {
    const percentage = (spent / limit) * 100
    const type = isOverBudget ? 'high' : percentage > 80 ? 'medium' : 'low'

    return this.createNotification({
      userId,
      type: 'budget_alert',
      title: isOverBudget ? 'Budget Exceeded!' : 'Budget Alert',
      message: isOverBudget 
        ? `You've exceeded your ${category} budget by ₹${(spent - limit).toLocaleString()}`
        : `You've spent ${percentage.toFixed(1)}% (₹${spent.toLocaleString()}) of your ${category} budget`,
      priority: type as 'low' | 'medium' | 'high',
      isRead: false,
      actionUrl: '/transactions?category=' + encodeURIComponent(category),
      actionText: 'View Transactions',
      data: { budgetId, category, spent, limit, percentage }
    })
  }

  async createGoalMilestone(
    userId: string, 
    goalId: string, 
    goalTitle: string, 
    milestoneTitle: string
  ): Promise<string> {
    return this.createNotification({
      userId,
      type: 'goal_milestone',
      title: 'Milestone Reached! 🎉',
      message: `You've achieved "${milestoneTitle}" for your goal "${goalTitle}"`,
      priority: 'medium',
      isRead: false,
      actionUrl: `/goals?id=${goalId}`,
      actionText: 'View Goal',
      data: { goalId, goalTitle, milestoneTitle }
    })
  }

  async createGoalCompletion(userId: string, goalId: string, goalTitle: string): Promise<string> {
    return this.createNotification({
      userId,
      type: 'goal_completed',
      title: 'Goal Completed! 🏆',
      message: `Congratulations! You've successfully completed "${goalTitle}"`,
      priority: 'high',
      isRead: false,
      actionUrl: `/goals?id=${goalId}`,
      actionText: 'View Achievement',
      data: { goalId, goalTitle }
    })
  }

  async createSystemNotification(
    userId: string, 
    title: string, 
    message: string, 
    expiresInDays?: number
  ): Promise<string> {
    const expiresAt = expiresInDays 
      ? Timestamp.fromDate(new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000))
      : undefined

    return this.createNotification({
      userId,
      type: 'system',
      title,
      message,
      priority: 'low',
      isRead: false,
      expiresAt
    })
  }

  // =============== STATISTICS ===============

  async getNotificationStats(userId: string): Promise<NotificationStats> {
    const allNotifications = await this.getUserNotifications(userId)
    
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const unread = allNotifications.filter(n => !n.isRead).length
    const last24Hours = allNotifications.filter(n => 
      n.createdAt.toDate() > yesterday
    ).length
    const thisWeek = allNotifications.filter(n => 
      n.createdAt.toDate() > weekAgo
    ).length

    const byType: Record<string, number> = {}
    allNotifications.forEach(n => {
      byType[n.type] = (byType[n.type] || 0) + 1
    })

    return {
      total: allNotifications.length,
      unread,
      byType,
      last24Hours,
      thisWeek
    }
  }

  // =============== REAL-TIME SUBSCRIPTIONS ===============

  subscribeToUserNotifications(
    userId: string, 
    callback: (notifications: Notification[]) => void
  ): () => void {
    if (!this.db) throw new Error("Firestore not initialized")

    const notificationsRef = collection(this.db, "notifications")
    const q = query(
      notificationsRef,
      where("userId", "==", userId),
      where("isRead", "==", false)
    )

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification))

      // Filter expired and sort
      const now = Timestamp.now()
      const validNotifications = notifications
        .filter(n => !n.expiresAt || n.expiresAt.toMillis() > now.toMillis())
        .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())

      callback(validNotifications)
    })
  }

  // =============== UTILITY METHODS ===============

  static getNotificationIcon(type: Notification['type']): string {
    switch (type) {
      case 'budget_alert': return '💰'
      case 'goal_milestone': return '🎯'
      case 'goal_completed': return '🏆'
      case 'bill_reminder': return '📋'
      case 'achievement': return '🏅'
      case 'system': return '🔔'
      default: return '📢'
    }
  }

  static getPriorityColor(priority: Notification['priority']): string {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  static formatTimeAgo(timestamp: Timestamp): string {
    const now = new Date()
    const notificationTime = timestamp.toDate()
    const diffMs = now.getTime() - notificationTime.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return notificationTime.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }
}