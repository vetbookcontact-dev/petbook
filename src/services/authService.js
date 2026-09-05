import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth, isFirebaseConfigured } from '../lib/firebase'

const REDIRECT_FLAG = 'vetbook-auth-redirect'

function requireAuth() {
  if (!isFirebaseConfigured || !auth) {
    throw new Error('Firebase לא מוגדר. מלאו את משתני VITE_FIREBASE_* בקובץ .env')
  }
  return auth
}

function isLikelyMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

function googleProvider() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  return provider
}

export async function signInWithGoogle() {
  const firebaseAuth = requireAuth()
  const provider = googleProvider()

  if (isLikelyMobile()) {
    sessionStorage.setItem(REDIRECT_FLAG, '1')
    await signInWithRedirect(firebaseAuth, provider)
    return
  }

  try {
    return await signInWithPopup(firebaseAuth, provider)
  } catch (error) {
    if (error?.code === 'auth/popup-blocked') {
      sessionStorage.setItem(REDIRECT_FLAG, '1')
      await signInWithRedirect(firebaseAuth, provider)
      return
    }
    throw error
  }
}

export async function completeRedirectSignIn() {
  if (!auth) return null
  try {
    return await getRedirectResult(auth)
  } finally {
    sessionStorage.removeItem(REDIRECT_FLAG)
  }
}

export function isRedirectSignInPending() {
  return sessionStorage.getItem(REDIRECT_FLAG) === '1'
}

export function signOutUser() {
  return firebaseSignOut(requireAuth())
}

export function subscribeToAuth(callback) {
  if (!auth) {
    callback(null)
    return () => {}
  }
  return onAuthStateChanged(auth, callback)
}

export function authErrorMessage(error) {
  switch (error?.code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'ההתחברות בוטלה'
    case 'auth/popup-blocked':
      return 'הדפדפן חסם את חלון ההתחברות. נסו שוב'
    case 'auth/network-request-failed':
      return 'אין חיבור לרשת. בדקו אינטרנט ונסו שוב'
    case 'auth/unauthorized-domain':
      return 'הדומיין לא מורשה ב-Firebase Authentication'
    case 'auth/operation-not-allowed':
      return 'התחברות Google לא הופעלה בקונסולת Firebase'
    default:
      return error?.message || 'ההתחברות נכשלה. נסו שוב'
  }
}
