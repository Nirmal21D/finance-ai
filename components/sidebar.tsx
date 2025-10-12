"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"

const items = [
  { href: "/", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/budgets", label: "Budgets" },
  { href: "/goals", label: "Goals" },
  { href: "/market", label: "Market Data" },
  { href: "/reports", label: "Reports" },
  { href: "/data", label: "Data Management" },
  { href: "/settings", label: "Settings" },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, userProfile, signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/")
    } catch (error) {
      console.error("Sign out failed:", error)
    }
  }

  return (
    <aside className="brut-border brut-shadow p-4 md:p-6 rounded-md bg-card">
      <div className="heading text-xl md:text-2xl mb-4">Financier</div>
      
      {/* User Info */}
      {user && (
        <div className="mb-6 p-3 brut-border rounded bg-accent/20">
          <div className="text-sm font-medium truncate">
            {userProfile?.displayName || user.email || "User"}
          </div>
          <div className="text-xs text-muted-foreground">
            {user.isAnonymous ? "Guest User" : user.email}
          </div>
        </div>
      )}
      
      <nav className="flex flex-col gap-2 mb-6">
        {items.map((it) => {
          const active = pathname === it.href
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "brut-border px-3 py-2 rounded text-sm font-semibold transition-colors",
                active ? "bg-primary text-primary-foreground" : "bg-background hover:bg-secondary hover:text-white",
              )}
            >
              {it.label}
            </Link>
          )
        })}
      </nav>

      {/* User Actions */}
      <div className="space-y-2">
        {user && !user.isAnonymous && (
          <Link
            href="/profile"
            className="block brut-border px-3 py-2 rounded text-sm font-medium bg-background hover:bg-accent text-center"
          >
            Profile
          </Link>
        )}
        
        {user?.isAnonymous && (
          <Link
            href="/auth/signup"
            className="block brut-border px-3 py-2 rounded text-sm font-medium bg-primary text-primary-foreground text-center hover:bg-foreground hover:text-background"
          >
            Create Account
          </Link>
        )}
        
        <Button
          onClick={handleSignOut}
          variant="outline"
          size="sm"
          className="brut-border w-full"
        >
          Sign Out
        </Button>
      </div>
    </aside>
  )
}
