"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"

export default function SignInPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { signIn, signInAnon } = useAuth()
  const router = useRouter()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError("Please fill in all fields")
      return
    }

    setLoading(true)
    setError("")

    try {
      await signIn(email, password)
      router.push("/dashboard")
    } catch (error: any) {
      setError(error.message || "Failed to sign in")
    } finally {
      setLoading(false)
    }
  }

  const handleAnonymousSignIn = async () => {
    setLoading(true)
    setError("")

    try {
      await signInAnon()
      router.push("/dashboard")
    } catch (error: any) {
      setError(error.message || "Failed to sign in anonymously")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="brut-border brut-shadow rounded-md p-6 bg-card">
          <div className="text-center mb-6">
            <h1 className="heading text-2xl mb-2">Welcome Back</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to your personal finance manager
            </p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
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

            <div>
              <label className="text-sm font-medium mb-2 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="brut-border px-3 py-2 rounded w-full bg-background"
                placeholder="Enter your password"
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
              {loading ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          <div className="my-6 flex items-center">
            <hr className="flex-1 border-border" />
            <span className="px-3 text-xs text-muted-foreground">OR</span>
            <hr className="flex-1 border-border" />
          </div>

          <Button
            onClick={handleAnonymousSignIn}
            disabled={loading}
            variant="outline"
            className="brut-border w-full mb-4"
          >
            Continue as Guest
          </Button>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link href="/auth/signup" className="underline underline-offset-4 hover:text-primary">
              Sign up
            </Link>
          </div>

          <div className="text-center text-sm mt-2">
            <Link href="/auth/forgot-password" className="text-muted-foreground underline underline-offset-4 hover:text-primary">
              Forgot your password?
            </Link>
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