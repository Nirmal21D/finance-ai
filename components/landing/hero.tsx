import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Hero() {
  return (
    <section className="bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="space-y-6">
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Take control of your money
            </h1>
            <p className="text-pretty text-muted-foreground leading-relaxed md:text-lg">
              Track expenses, categorize transactions, and visualize your spending with clear, actionable charts.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/dashboard">Get Started</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/transactions">View Transactions</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              No clutter. Just clear insights to help you reach your goals.
            </p>
          </div>

          <div className="hidden md:block">
            {/* Accessible decorative illustration */}
            <img
              src="/finance-dashboard-preview.jpg"
              alt=""
              className="w-full rounded-lg border bg-card"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
