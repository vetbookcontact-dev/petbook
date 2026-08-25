import { useEffect, useId, useState } from 'react'
import { MapPin, MessageCircle, Navigation, Phone, X } from 'lucide-react'
import {
  buildClinicWhatsAppUrl,
  getNearbyClinics,
  getPrimaryClinic,
} from '../services/petService'

function ClinicActions({ clinic, petName, variant = 'compact' }) {
  const isPrimary = variant === 'primary'
  return (
    <div className={`mt-3 grid gap-2 ${isPrimary ? 'grid-cols-2' : 'grid-cols-3'}`}>
      <a
        href={clinic.phoneHref}
        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-[11px] font-bold text-white hover:bg-emerald-700"
      >
        <Phone className="h-3.5 w-3.5" />
        {isPrimary ? 'שיחה טלפונית' : 'שיחה'}
      </a>
      <a
        href={buildClinicWhatsAppUrl(clinic, petName)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] py-2.5 text-[11px] font-bold text-white hover:brightness-95"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        {isPrimary ? 'וואטסאפ למרפאה' : 'וואטסאפ'}
      </a>
      {!isPrimary && (
        <a
          href={clinic.wazeUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-1 rounded-xl bg-sky-600 py-2.5 text-[11px] font-bold text-white hover:bg-sky-700"
        >
          <Navigation className="h-3.5 w-3.5" />
          Waze
        </a>
      )}
    </div>
  )
}

export default function BookAppointmentModal({
  open,
  pet,
  ownerAddress = '',
  primaryClinicName = '',
  onClose,
}) {
  const titleId = useId()
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [primary, setPrimary] = useState(null)
  const [nearby, setNearby] = useState([])

  useEffect(() => {
    if (!open) {
      setVisible(false)
      return
    }
    requestAnimationFrame(() => setVisible(true))

    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const primaryClinic = await getPrimaryClinic({
          clinicName: primaryClinicName || undefined,
        })
        const others = await getNearbyClinics(ownerAddress, {
          excludeId: primaryClinic?.id,
        })
        if (!alive) return
        setPrimary(primaryClinic)
        setNearby(others)
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [open, ownerAddress, primaryClinicName])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="סגירה"
        className={`absolute inset-0 bg-slate-900/50 transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
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
              קביעת תור לחיסון / ביקורת
            </h2>
            <p className="text-xs text-slate-500">עבור {pet?.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 p-2 text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          {loading && (
            <p className="py-8 text-center text-sm text-slate-400">טוען מרפאות...</p>
          )}

          {!loading && primary && (
            <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
              <p className="text-[11px] font-bold text-emerald-700">המרפאה המטפלת שלך</p>
              <h3 className="mt-1 text-base font-extrabold text-slate-900">{primary.name}</h3>
              <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-600">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                {primary.address}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-800" dir="ltr">
                {primary.phone}
              </p>
              <ClinicActions clinic={primary} petName={pet?.name} variant="primary" />
              <a
                href={primary.wazeUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 py-2 text-[11px] font-bold text-sky-800 hover:bg-sky-100"
              >
                <Navigation className="h-3.5 w-3.5" />
                ניווט Waze למרפאה
              </a>
            </section>
          )}

          {!loading && (
            <section>
              <h3 className="mb-2 text-sm font-bold text-slate-800">
                מרפאות נוספות באזורך
              </h3>
              {nearby.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
                  לא נמצאו מרפאות נוספות באזור. עדכנו כתובת בפרופיל לסינון מדויק יותר.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {nearby.map((clinic) => (
                    <li
                      key={clinic.id}
                      className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-soft"
                    >
                      <h4 className="text-sm font-extrabold text-slate-900">{clinic.name}</h4>
                      <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-500">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {clinic.city} · {clinic.address}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-700" dir="ltr">
                        {clinic.phone}
                      </p>
                      <ClinicActions clinic={clinic} petName={pet?.name} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
