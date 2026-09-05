import { useEffect, useId, useRef, useState } from 'react'
import { Camera, UserRound, X } from 'lucide-react'
import { compressImage } from '../utils/compressImage'

const EMPTY = {
  fullName: '',
  phone: '',
  address: '',
  email: '',
  photoURL: '',
}

export default function OwnerProfileModal({
  open,
  onClose,
  onSubmit,
  onSignOut,
  profile = null,
  saving = false,
  required = false,
}) {
  const titleId = useId()
  const fileRef = useRef(null)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [visible, setVisible] = useState(false)

  const isOnboarding = required || !profile?.fullName

  useEffect(() => {
    if (open) {
      setForm({
        fullName: profile?.fullName ?? '',
        phone: profile?.phone ?? '',
        address: profile?.address ?? '',
        email: profile?.email ?? '',
        photoURL: profile?.photoURL ?? profile?.avatar ?? '',
      })
      setError('')
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [open, profile])

  if (!open) return null

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('נא לבחור קובץ תמונה בלבד')
      return
    }
    try {
      update('photoURL', await compressImage(file))
      setError('')
    } catch {
      setError('שגיאה בעיבוד התמונה')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.fullName.trim()) {
      setError('נא להזין שם מלא')
      return
    }
    if (!form.phone.trim()) {
      setError('נא להזין מספר טלפון')
      return
    }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('נא להזין אימייל תקין')
      return
    }

    setError('')
    await onSubmit({
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      email: form.email.trim(),
      photoURL: form.photoURL || '',
    })
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="סגירה"
        className={`absolute inset-0 bg-slate-900/50 transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => {
          if (!saving && !required) onClose()
        }}
        disabled={required}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        dir="rtl"
        className={`relative z-10 flex max-h-[92vh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-2xl transition-all duration-300 sm:rounded-3xl ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-extrabold text-slate-900">
              {isOnboarding ? 'ברוכים הבאים לווט-בוק' : 'פרופיל בעלים'}
            </h2>
            <p className="text-xs text-slate-500">
              {isOnboarding
                ? 'מלאו פרטים בסיסיים כדי להתחיל'
                : 'עדכון תמונה, פרטי קשר ומגורים'}
            </p>
          </div>
          {!required && (
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-3 overflow-y-auto px-5 py-4">
            <div className="flex flex-col items-center gap-2 pb-1">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="group relative mx-auto h-20 w-20 overflow-hidden rounded-full border-2 border-emerald-500 bg-slate-100 shadow-sm transition hover:brightness-[0.98]"
                aria-label="העלאת תמונת פרופיל"
              >
                {form.photoURL ? (
                  <img
                    src={form.photoURL}
                    alt="תמונת פרופיל"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-emerald-50 text-emerald-700">
                    <UserRound className="h-9 w-9" />
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-slate-900/55 py-1 text-[9px] font-bold text-white">
                  <Camera className="h-3 w-3" />
                  העלאת תמונה
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={handlePhoto}
              />
              {form.photoURL && (
                <button
                  type="button"
                  onClick={() => update('photoURL', '')}
                  className="text-[11px] font-semibold text-slate-500 underline"
                >
                  הסרת תמונה
                </button>
              )}
            </div>

            <Field label="שם מלא">
              <input
                required
                value={form.fullName}
                onChange={(e) => update('fullName', e.target.value)}
                placeholder='לדוגמה: יובל'
                className={inputClass}
                autoFocus={isOnboarding}
              />
            </Field>

            <Field label="מספר טלפון">
              <input
                required
                type="tel"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="050-0000000"
                className={inputClass}
                dir="ltr"
              />
            </Field>

            <Field label="כתובת / עיר">
              <input
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                placeholder="תל אביב"
                className={inputClass}
              />
            </Field>

            <Field label="אימייל">
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="name@email.com"
                className={inputClass}
                dir="ltr"
              />
            </Field>

            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                {error}
              </p>
            )}
          </div>

          <div className="border-t border-slate-100 px-5 py-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-brand-700 py-3.5 text-sm font-bold text-white shadow-soft transition hover:bg-brand-800 disabled:opacity-60"
            >
              {saving ? 'שומר...' : isOnboarding ? 'המשך לאפליקציה' : 'שמירת פרטים'}
            </button>
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                disabled={saving}
                className="mt-3 w-full py-2 text-sm font-semibold text-slate-500 underline disabled:opacity-50"
              >
                התנתקות
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100'
