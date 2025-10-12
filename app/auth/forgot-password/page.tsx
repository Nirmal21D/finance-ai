"use client"

import { useState } from "react"
import Link from "next/link"
import { sendPasswordResetEmail } from "firebase/auth"
import { getFirebase } from "@/lib/firebase"
import { Button } from "@/components/ui/button"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const { auth } = getFirebase()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      setError("Please enter your email address")
      return
    }

    if (!auth) {
      setError("Firebase not initialized")
      return
    }

    setLoading(true)
    setError("")
    setMessage("")

    try {
      await sendPasswordResetEmail(auth, email)
      setMessage("Password reset email sent! Check your inbox and follow the instructions.")
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        setError("No account found with this email address")
      } else if (error.code === "auth/invalid-email") {
        setError("Please enter a valid email address")
      } else {
        setError(error.message || "Failed to send reset email")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="brut-border brut-shadow rounded-md p-6 bg-card">
          <div className="text-center mb-6">
            <h1 className="heading text-2xl mb-2">Reset Password</h1>
            <p className="text-sm text-muted-foreground">
              Enter your email address and we'll send you a link to reset your password
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="brut-border px-3 py-2 rounded w-full bg-background"
                placeholder="Enter your email"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="brut-border rounded p-3 bg-red-50 border-red-500 text-red-700 text-sm">
                {error}
              </div>
            )}

            {message && (
              <div className="brut-border rounded p-3 bg-green-50 border-green-500 text-green-700 text-sm">
                {message}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="brut-border brut-shadow w-full bg-primary text-primary-foreground hover:bg-foreground hover:text-background"
            >
              {loading ? "Sending..." : "Send Reset Email"}
            </Button>
          </form>

          <div className="text-center text-sm mt-6 space-y-2">
            <div>
              <Link href="/auth/signin" className="text-muted-foreground underline underline-offset-4 hover:text-primary">
                ← Back to Sign In
              </Link>
            </div>
            <div>
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link href="/auth/signup" className="underline underline-offset-4 hover:text-primary">
                Sign up
              </Link>
            </div>
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