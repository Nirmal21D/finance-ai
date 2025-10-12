"use client"

import { Sidebar } from "@/components/sidebar"
import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

function useTheme() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const root = document.documentElement
    const saved = localStorage.getItem("theme") === "dark"
    if (saved) {
      root.classList.add("dark")
      setDark(true)
    }
  }, [])
  const toggle = () => {
    const root = document.documentElement
    const next = !dark
    setDark(next)
    if (next) {
      root.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      root.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }
  return { dark, toggle }
}

function SettingsContent() {
  const { dark, toggle } = useTheme()
  const { user, userProfile, updateUserProfile } = useAuth()
  
  // Form state
  const [profileForm, setProfileForm] = useState({
    displayName: userProfile?.displayName || '',
    currency: userProfile?.currency || 'INR'
  })
  
  const [notifications, setNotifications] = useState({
    budgetAlerts: true,
    billReminders: true,
    aiInsights: true
  })
  
  const [loading, setLoading] = useState(false)

  // Update form when userProfile changes
  useEffect(() => {
    if (userProfile) {
      setProfileForm({
        displayName: userProfile.displayName || '',
        currency: userProfile.currency || 'INR'
      })
    }
  }, [userProfile])

  const handleSaveSettings = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      await updateUserProfile({
        displayName: profileForm.displayName,
        currency: profileForm.currency
      })
      toast.success("Settings saved successfully!")
    } catch (error) {
      console.error("Failed to save settings:", error)
      toast.error("Failed to save settings. Please try again.")
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <main className="min-h-screen">
      <div className="w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        <Sidebar />
        <section className="flex flex-col gap-6 min-w-0">
          <header className="brut-border brut-shadow rounded-md p-4 bg-card">
            <h1 className="heading text-2xl md:text-3xl">Settings</h1>
          </header>

          {/* Theme Settings */}
          <Card className="brut-border brut-shadow">
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="theme">Theme</Label>
                <div className="flex gap-2">
                  <Button
                    variant={!dark ? "default" : "outline"}
                    size="sm"
                    onClick={() => !dark && toggle()}
                    className="brut-border"
                  >
                    Light
                  </Button>
                  <Button
                    variant={dark ? "default" : "outline"}
                    size="sm"
                    onClick={() => dark && toggle()}
                    className="brut-border"
                  >
                    Dark
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Settings */}
          <Card className="brut-border brut-shadow">
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  className="brut-border"
                  placeholder="Your name"
                  value={profileForm.displayName}
                  onChange={(e) => setProfileForm(f => ({ ...f, displayName: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={profileForm.currency} onValueChange={(value) => setProfileForm(f => ({ ...f, currency: value }))}>
                  <SelectTrigger className="brut-border">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">₹ Indian Rupee (INR)</SelectItem>
                    <SelectItem value="USD">$ US Dollar (USD)</SelectItem>
                    <SelectItem value="EUR">€ Euro (EUR)</SelectItem>
                    <SelectItem value="GBP">£ British Pound (GBP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              

            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card className="brut-border brut-shadow">
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="budgetAlerts">Budget Alerts</Label>
                  <p className="text-xs text-muted-foreground">Get notified when you approach budget limits</p>
                </div>
                <Switch 
                  id="budgetAlerts"
                  checked={notifications.budgetAlerts}
                  onCheckedChange={(checked) => setNotifications(n => ({ ...n, budgetAlerts: checked }))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="billReminders">Bill Reminders</Label>
                  <p className="text-xs text-muted-foreground">Reminders for upcoming bills and payments</p>
                </div>
                <Switch 
                  id="billReminders"
                  checked={notifications.billReminders}
                  onCheckedChange={(checked) => setNotifications(n => ({ ...n, billReminders: checked }))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="aiInsights">AI Insights</Label>
                  <p className="text-xs text-muted-foreground">Weekly AI-generated financial insights</p>
                </div>
                <Switch 
                  id="aiInsights"
                  checked={notifications.aiInsights}
                  onCheckedChange={(checked) => setNotifications(n => ({ ...n, aiInsights: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSaveSettings}
              disabled={loading}
              className="brut-border brut-shadow"
            >
              {loading ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </section>
      </div>
    </main>
  )
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  )
}
