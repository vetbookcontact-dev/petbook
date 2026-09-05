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

let redirectResultPromise = null

function requireAuth() {
  if (!isFirebaseConfigured || !auth) {
    throw new Error('Firebase לא מוגדר. מלאו את משתני VITE_FIREBASE_* בקובץ .env')
  }
  return auth
}

function isLikelyMobile() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/Android|iPhone|iPad|iPod/i.test(ua)) return true
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true
  return false
}

function googleProvider() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  return provider
}

function setRedirectFlag() {
  try {
    localStorage.setItem(REDIRECT_FLAG, '1')
  } catch {
    /* ignore quota / private mode */
  }
}

function clearRedirectFlag() {
  try {
    localStorage.removeItem(REDIRECT_FLAG)
    sessionStorage.removeItem(REDIRECT_FLAG)
  } catch {
    /* ignore */
  }
}

export function isRedirectSignInPending() {
  try {
    return (
      localStorage.getItem(REDIRECT_FLAG) === '1' ||
      sessionStorage.getItem(REDIRECT_FLAG) === '1'
    )
  } catch {
    return false
  }
}

export async function signInWithGoogle() {
  const firebaseAuth = requireAuth()
  const provider = googleProvider()

  if (isLikelyMobile()) {
    setRedirectFlag()
    await signInWithRedirect(firebaseAuth, provider)
    return
  }

  try {
    return await signInWithPopup(firebaseAuth, provider)
  } catch (error) {
    if (error?.code === 'auth/popup-blocked') {
      setRedirectFlag()
      await signInWithRedirect(firebaseAuth, provider)
      return
    }
    throw error
  }
}

/** Single-flight: getRedirectResult can be consumed only once (Strict Mode remounts). */
export function completeRedirectSignIn() {
  if (!auth) return Promise.resolve(null)
  if (!redirectResultPromise) {
    redirectResultPromise = getRedirectResult(auth)
      .catch((error) => {
        if (error?.code === 'auth/no-auth-event') return null
        console.warn('Google redirect handshake failed', error)
        return null
      })
      .finally(() => {
        clearRedirectFlag()
      })
  }
  return redirectResultPromise
}

export function signOutUser() {
  clearRedirectFlag()
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
