import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getAuth, signInAnonymously, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null

export function getFirebase() {
  if (!app) {
    const config = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    }
    if (!config.apiKey || !config.projectId) {
      console.warn("[v0] Firebase env vars missing. Add NEXT_PUBLIC_FIREBASE_* in Vars.")
      return { app: null, auth: null, db: null }
    }
    app = getApps().length ? getApps()[0]! : initializeApp(config)
    auth = getAuth(app)
    db = getFirestore(app)
  }
  return { app, auth, db }
}

export async function ensureAnonAuth() {
  const { auth } = getFirebase()
  if (!auth) return false

  try {
    // If already signed in (any method), do nothing.
    if (auth.currentUser) return true

    // Try to sign in anonymously. If the project disallows it, this may throw.
    await signInAnonymously(auth)
    return true
  } catch (err) {
    console.warn("[v0] Anonymous auth not available or failed. Proceeding without auth.", err)
    return false
  }
}
