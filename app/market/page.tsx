"use client"

import React from "react"
import { Sidebar } from "@/components/sidebar"
import { MarketDashboard } from "@/components/market/market-dashboard"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"

function MarketContent() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-6">
        <MarketDashboard />
      </main>
    </div>
  )
}

export default function MarketPage() {
  return (
    <ProtectedRoute>
      <MarketContent />
    </ProtectedRoute>
  )
}