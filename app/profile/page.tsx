"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"

function ProfileContent() {
  const { user, userProfile, updateUserProfile } = useAuth()
  const [formData, setFormData] = useState({
    displayName: userProfile?.displayName || "",
    currency: userProfile?.currency || "INR",
    notifications: {
      budgetAlerts: userProfile?.notifications?.budgetAlerts ?? true,
      billReminders: userProfile?.notifications?.billReminders ?? true,
      aiInsights: userProfile?.notifications?.aiInsights ?? true
    }
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    if (name.startsWith("notifications.")) {
      const notificationKey = name.split(".")[1]
      setFormData(prev => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          [notificationKey]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === "number" ? Number(value) : value
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSuccess("")

    try {
      await updateUserProfile(formData)
      setSuccess("Profile updated successfully!")
    } catch (error) {
      console.error("Failed to update profile:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!user || !userProfile) {
    return <div>Loading...</div>
  }

  return (
    <main className="min-h-screen">
      <div className="w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        <Sidebar />
        
        <section className="flex flex-col gap-4">
          <header className="brut-border brut-shadow rounded-md p-4 bg-card">
            <h1 className="heading text-2xl md:text-3xl">Profile Settings</h1>
          </header>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="brut-border brut-shadow rounded-md p-4 bg-card">
              <div className="heading text-lg mb-4">Personal Information</div>
              
              <div className="space-y-4">
                {user.isAnonymous ? (
                  <div className="brut-border rounded p-3 bg-yellow-50 border-yellow-500 text-yellow-800 text-sm">
                    <strong>Guest Account:</strong> Create a permanent account to save your data and access advanced features.
                    <div className="mt-2">
                      <Button size="sm" className="brut-border">
                        Create Account
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Email</label>
                      <input
                        type="email"
                        value={user.email || ""}
                        className="brut-border px-3 py-2 rounded w-full bg-muted text-muted-foreground"
                        disabled
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Email cannot be changed. Contact support if needed.
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Display Name</label>
                      <input
                        type="text"
                        name="displayName"
                        value={formData.displayName}
                        onChange={handleChange}
                        className="brut-border px-3 py-2 rounded w-full bg-background"
                        placeholder="Your display name"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Financial Preferences */}
            <div className="brut-border brut-shadow rounded-md p-4 bg-card">
              <div className="heading text-lg mb-4">Financial Preferences</div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Currency</label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="brut-border px-3 py-2 rounded w-full bg-background"
                  >
                    <option value="INR">₹ Indian Rupee (INR)</option>
                    <option value="USD">$ US Dollar (USD)</option>
                    <option value="EUR">€ Euro (EUR)</option>
                    <option value="GBP">£ British Pound (GBP)</option>
                    <option value="CAD">$ Canadian Dollar (CAD)</option>
                    <option value="AUD">$ Australian Dollar (AUD)</option>
                  </select>
                </div>
                

              </div>
            </div>

            {/* Notification Preferences */}
            <div className="brut-border brut-shadow rounded-md p-4 bg-card">
              <div className="heading text-lg mb-4">Notifications</div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Budget Alerts</div>
                    <div className="text-xs text-muted-foreground">
                      Get notified when you approach your budget limits
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    name="notifications.budgetAlerts"
                    checked={formData.notifications.budgetAlerts}
                    onChange={handleChange}
                    className="brut-border"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Bill Reminders</div>
                    <div className="text-xs text-muted-foreground">
                      Reminders for upcoming bills and payments
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    name="notifications.billReminders"
                    checked={formData.notifications.billReminders}
                    onChange={handleChange}
                    className="brut-border"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">AI Insights</div>
                    <div className="text-xs text-muted-foreground">
                      Weekly AI-generated financial insights and tips
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    name="notifications.aiInsights"
                    checked={formData.notifications.aiInsights}
                    onChange={handleChange}
                    className="brut-border"
                  />
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div className="brut-border brut-shadow rounded-md p-4 bg-card">
              <div className="heading text-lg mb-4">Account Information</div>
              
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Type:</span>
                  <span>{user.isAnonymous ? "Guest" : "Registered"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Member Since:</span>
                  <span>{userProfile.createdAt.toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Login:</span>
                  <span>{userProfile.lastLoginAt.toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}</span>
                </div>
              </div>
            </div>

            {success && (
              <div className="brut-border rounded p-3 bg-green-50 border-green-500 text-green-700 text-sm">
                {success}
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                className="brut-border"
                onClick={() => setFormData({
                  displayName: userProfile?.displayName || "",
                  currency: userProfile?.currency || "INR",
                  notifications: {
                    budgetAlerts: userProfile?.notifications?.budgetAlerts ?? true,
                    billReminders: userProfile?.notifications?.billReminders ?? true,
                    aiInsights: userProfile?.notifications?.aiInsights ?? true
                  }
                })}
              >
                Reset
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="brut-border brut-shadow bg-primary text-primary-foreground hover:bg-foreground hover:text-background"
              >
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  )
}