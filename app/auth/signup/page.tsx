"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: ""
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { signUp } = useAuth()
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.displayName || !formData.email || !formData.password) {
      setError("Please fill in all fields")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setLoading(true)
    setError("")

    try {
      await signUp(formData.email, formData.password, formData.displayName)
      router.push("/dashboard")
    } catch (error: any) {
      setError(error.message || "Failed to create account")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="brut-border brut-shadow rounded-md p-6 bg-card">
          <div className="text-center mb-6">
            <h1 className="heading text-2xl mb-2">Create Account</h1>
            <p className="text-sm text-muted-foreground">
              Join thousands managing their finances with AI
            </p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Full Name</label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                className="brut-border px-3 py-2 rounded w-full bg-background"
                placeholder="Enter your full name"
                disabled={loading}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="brut-border px-3 py-2 rounded w-full bg-background"
                placeholder="Enter your email"
                disabled={loading}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="brut-border px-3 py-2 rounded w-full bg-background"
                placeholder="Create a password (min. 6 characters)"
                disabled={loading}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="brut-border px-3 py-2 rounded w-full bg-background"
                placeholder="Confirm your password"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="brut-border rounded p-3 bg-red-50 border-red-500 text-red-700 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="brut-border brut-shadow w-full bg-primary text-primary-foreground hover:bg-foreground hover:text-background"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="text-center text-sm mt-6">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/auth/signin" className="underline underline-offset-4 hover:text-primary">
              Sign in
            </Link>
          </div>

          <div className="text-xs text-muted-foreground text-center mt-4">
            By creating an account, you agree to our{" "}
            <Link href="/terms" className="underline underline-offset-4">Terms of Service</Link>
            {" "}and{" "}
            <Link href="/privacy" className="underline underline-offset-4">Privacy Policy</Link>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-muted-foreground underline underline-offset-4">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}