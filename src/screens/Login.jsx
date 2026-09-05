import { useState } from 'react'
import { PawPrint } from 'lucide-react'
import { isFirebaseConfigured } from '../lib/firebase'
import { authErrorMessage, isRedirectSignInPending, signInWithGoogle } from '../services/authService'

export default function Login() {
  const [busy, setBusy] = useState(isRedirectSignInPending)
  const [error, setError] = useState('')
  const configured = isFirebaseConfigured
  const waiting = busy

  async function handleGoogle() {
    if (!configured || waiting) return
    setError('')
    setBusy(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(authErrorMessage(err))
      setBusy(false)
    }
  }

  if (waiting) {
    return (
      <div
        dir="rtl"
        className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center bg-slate-50 px-6 text-slate-900"
      >
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-700" />
        <p className="mt-3 text-sm font-medium text-slate-500">מתחבר לחשבון Google...</p>
      </div>
    )
  }

  return (
    <div
      dir="rtl"
      className="mx-auto flex min-h-screen max-w-md flex-col justify-center bg-slate-50 px-6 text-slate-900"
    >
      <div className="rounded-3xl bg-white p-7 shadow-soft ring-1 ring-slate-100">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-100 text-brand-700">
            <PawPrint className="h-8 w-8" />
          </span>
          <p className="text-sm font-semibold text-brand-600">וט-בוק</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
            פנקס וטרינרי דיגיטלי
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            התחברו עם Google כדי לשמור את החיות, החיסונים והפרופיל בענן
          </p>
        </div>

        {!configured && (
          <p className="mb-4 rounded-2xl bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-900">
            Firebase עדיין לא מוגדר. העתיקו את `.env.example` ל-`.env` ומלאו את מפתחות
            הפרויקט מקונסולת Firebase.
          </p>
        )}

        {error && (
          <p className="mb-4 rounded-2xl bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleGoogle}
          disabled={!configured || waiting}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <GoogleMark />
          התחברות עם Google
        </button>
      </div>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
      />
    </svg>
  )
}
