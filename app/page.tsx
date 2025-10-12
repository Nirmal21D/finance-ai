"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useAuth } from "@/contexts/AuthContext"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard")
    }
  }, [user, loading, router])

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    )
  }

  // Don't show landing page to authenticated users
  if (user) return null
  return (
    <main className="min-h-screen flex flex-col">
      <header className="brut-border brut-shadow bg-card">
        <div className="max-w-6xl mx-auto flex items-center justify-between p-4 md:p-6">
          <div className="flex items-center gap-3">
            {/* Placeholder for logo */}
            <Image
              src="/finance-logo.png"
              width={32}
              height={32}
              alt="Personal Finance Manager logo"
              className="rounded-[4px]"
            />
            <span className="heading text-lg md:text-xl">Personal Finance Manager</span>
          </div>
          <nav className="hidden md:flex items-center gap-4">
            <Link href="/dashboard" className="underline-offset-4 hover:underline">
              Dashboard
            </Link>
            <Link href="/transactions" className="underline-offset-4 hover:underline">
              Transactions
            </Link>
            <Link href="/reports" className="underline-offset-4 hover:underline">
              Reports
            </Link>
            <Link href="/settings" className="underline-offset-4 hover:underline">
              Settings
            </Link>
          </nav>
          <div className="md:hidden">
            <Link href="/dashboard" className="underline-offset-4 hover:underline">
              Open App
            </Link>
          </div>
        </div>
      </header>

      <section className="flex-1">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-20">
          {/* Hero */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <h1 className="heading text-3xl md:text-5xl text-balance">
                Take control of your money with clarity and confidence
              </h1>
              <p className="text-pretty text-base md:text-lg">
                Track expenses, get AI-powered categorizations, and visualize your spending to hit your goals faster —
                all in a simple, brutalist interface.
              </p>
              <div className="flex items-center gap-3">
                <Button asChild className="brut-border brut-shadow">
                  <Link href="/auth/signup">Get Started Free</Link>
                </Button>
                <Link href="/auth/signin" className="underline underline-offset-4">
                  Sign In
                </Link>
              </div>
            </div>

            <div className="brut-border brut-shadow rounded-md bg-card p-4">
              {/* Placeholder for image */}
              <img
                src="/clean-finance-dashboard-preview.jpg"
                width={960}
                height={600}
                alt="App preview"
                className="w-full h-auto rounded-md"
              />
            </div>
          </div>

          {/* Features */}
          <div className="mt-12 md:mt-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Feature
                title="Track everything"
                body="Add income and expenses quickly. Keep all transactions in one place."
              />
              <Feature
                title="AI categorization"
                body="Let the AI suggest smart categories so you spend less time sorting."
              />
              <Feature
                title="Clear reports"
                body="See monthly trends and spending breakdowns to make better decisions."
              />
            </div>
          </div>

          {/* CTA */}
          <div className="mt-12 md:mt-16 flex items-center gap-4">
            <Button asChild className="brut-border brut-shadow">
              <Link href="/auth/signup">Create Free Account</Link>
            </Button>
            <span className="text-sm">Start managing your finances in under 2 minutes.</span>
          </div>
        </div>
      </section>

      <footer className="mt-auto">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
          <div className="brut-border rounded-md p-4 bg-card flex items-center justify-between">
            <span className="text-sm">© {new Date().getFullYear()} Personal Finance Manager</span>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/settings" className="underline-offset-4 hover:underline">
                Theme
              </Link>
              <a
                href="https://vercel.com"
                target="_blank"
                rel="noreferrer"
                className="underline-offset-4 hover:underline"
              >
                Deploy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="brut-border brut-shadow rounded-md bg-card p-4">
      <div className="heading text-lg mb-1">{title}</div>
      <p className="text-sm">{body}</p>
    </div>
  )
}
