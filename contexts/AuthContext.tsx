"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInAnonymously,
  updateProfile
} from "firebase/auth"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { getFirebase } from "@/lib/firebase"

interface AuthContextType {
  user: User | null
  loading: boolean
  userProfile: UserProfile | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName?: string) => Promise<void>
  signInAnon: () => Promise<void>
  signOut: () => Promise<void>
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>
}

interface UserProfile {
  uid: string
  email: string | null
  displayName: string | null
  currency: string
  notifications: {
    budgetAlerts: boolean
    billReminders: boolean
    aiInsights: boolean
  }
  createdAt: Date
  lastLoginAt: Date
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const { auth, db } = getFirebase()

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      
      if (user) {
        // Load or create user profile
        await loadUserProfile(user)
      } else {
        setUserProfile(null)
      }
      
      setLoading(false)
    })

    return unsubscribe
  }, [auth])

  const loadUserProfile = async (user: User) => {
    if (!db) return

    const userDocRef = doc(db, "users", user.uid)
    const userDoc = await getDoc(userDocRef)

    if (userDoc.exists()) {
      const data = userDoc.data()
      setUserProfile({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        currency: data.currency || "INR",
        notifications: data.notifications || {
          budgetAlerts: true,
          billReminders: true,
          aiInsights: true
        },
        createdAt: data.createdAt?.toDate() || new Date(),
        lastLoginAt: new Date()
      })

      // Update last login time
      await setDoc(userDocRef, { lastLoginAt: new Date() }, { merge: true })
    } else {
      // Create new user profile
      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        currency: "INR",
        notifications: {
          budgetAlerts: true,
          billReminders: true,
          aiInsights: true
        },
        createdAt: new Date(),
        lastLoginAt: new Date()
      }

      await setDoc(userDocRef, {
        ...newProfile,
        createdAt: new Date(),
        lastLoginAt: new Date()
      })
      
      setUserProfile(newProfile)
    }
  }

  const signIn = async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase not initialized")
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signUp = async (email: string, password: string, displayName?: string) => {
    if (!auth) throw new Error("Firebase not initialized")
    
    const { user } = await createUserWithEmailAndPassword(auth, email, password)
    
    if (displayName && user) {
      await updateProfile(user, { displayName })
    }
  }

  const signInAnon = async () => {
    if (!auth) throw new Error("Firebase not initialized")
    await signInAnonymously(auth)
  }

  const signOut = async () => {
    if (!auth) throw new Error("Firebase not initialized")
    await firebaseSignOut(auth)
  }

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user || !db) throw new Error("User not authenticated or Firebase not initialized")

    const userDocRef = doc(db, "users", user.uid)
    await setDoc(userDocRef, data, { merge: true })
    
    // Update local state
    if (userProfile) {
      setUserProfile({ ...userProfile, ...data })
    }
  }

  const value = {
    user,
    loading,
    userProfile,
    signIn,
    signUp,
    signInAnon,
    signOut,
    updateUserProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}