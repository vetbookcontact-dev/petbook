import { useEffect, useMemo, useState } from 'react'
import {
  Clock,
  Compass,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  Phone,
  Radar,
  ShieldAlert,
  Siren,
} from 'lucide-react'
import { getNearbyVeterinaryClinics } from '../services/petService'

const GEO_IDLE = 'idle'
const GEO_LOCATING = 'locating'
const GEO_GRANTED = 'granted'
const GEO_DENIED = 'denied'

const FILTER_ALL = 'all'
const FILTER_OPEN = 'open'
const FILTER_EMERGENCY = 'emergency'

export default function Emergency() {
  const [clinics, setClinics] = useState([])
  const [coords, setCoords] = useState(null)
  const [loading, setLoading] = useState(true)
  const [geoStatus, setGeoStatus] = useState(GEO_IDLE)
  const [geoError, setGeoError] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [filter, setFilter] = useState(FILTER_ALL)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      const data = await getNearbyVeterinaryClinics(null, {})
      if (alive) {
        setClinics(data)
        setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const filters = {
        openNow: filter === FILTER_OPEN,
        emergencyOnly: filter === FILTER_EMERGENCY,
        city: geoStatus === GEO_DENIED ? selectedCity : '',
      }
      const data = await getNearbyVeterinaryClinics(coords, filters)
      if (alive) setClinics(data)
    })()
    return () => {
      alive = false
    }
  }, [coords, filter, selectedCity, geoStatus])

  const majors = useMemo(
    () =>
      clinics
        .filter((c) => c.isMajorReferral)
        .sort((a, b) => (a.pinOrder ?? 99) - (b.pinOrder ?? 99)),
    [clinics],
  )

  const nearby = useMemo(
    () => clinics.filter((c) => !c.isMajorReferral),
    [clinics],
  )

  const cityOptions = useMemo(() => {
    const set = new Set()
    clinics.forEach((c) => {
      if (!c.isMajorReferral && c.city) set.add(c.city)
    })
    return [...set]
  }, [clinics])

  function findNearestClinic() {
    if (!('geolocation' in navigator)) {
      setGeoStatus(GEO_DENIED)
      setGeoError('המכשיר אינו תומך באיתור מיקום. ניתן לבחור עיר ידנית למטה.')
      return
    }

    setGeoStatus(GEO_LOCATING)
    setGeoError('')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const next = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }
          setCoords(next)
          setGeoStatus(GEO_GRANTED)
          setGeoError('')
          setSelectedCity('')
        } catch {
          setGeoStatus(GEO_DENIED)
          setGeoError('שגיאה בחישוב מרחקים. ניתן לבחור עיר ידנית למטה.')
        }
      },
      (error) => {
        console.warn('GPS location permission denied or unavailable:', error.message)
        setGeoStatus(GEO_DENIED)
        setGeoError(
          'גישת מיקום כבויה או נדחתה. הפעילו הרשאת מיקום בהגדרות המכשיר, או בחרו עיר ידנית כדי למיין מרפאות אזוריות.',
        )
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    )
  }

  function openWaze(query) {
    const url = `https://waze.com/ul?q=${encodeURIComponent(query)}&navigate=yes`
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-5 pb-16" dir="rtl">
      <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900 shadow-sm">
        <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
        <div className="text-sm">
          <p className="font-bold text-red-950">מרפאות וטרינריות ומוקדי חירום</p>
          <p className="mt-0.5 text-xs text-red-700">
            שלושת מרכזי ההפניה הארציים בראש הרשימה. מתחת — מרפאות כלליות ומוקדי חירום לפי
            מרחק ושעות פתיחה.
          </p>
        </div>
      </div>

      {loading && clinics.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-400">טוען מרפאות...</div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="px-0.5 text-sm font-extrabold text-slate-800">
              מרכזי הפניה ארציים (24/7)
            </h2>
            <div className="space-y-3.5">
              {majors.map((clinic) => (
                <ClinicCard
                  key={clinic.id}
                  clinic={clinic}
                  showDistance={geoStatus === GEO_GRANTED}
                  onWaze={openWaze}
                />
              ))}
            </div>
          </section>

          <button
            type="button"
            onClick={findNearestClinic}
            disabled={geoStatus === GEO_LOCATING}
            className="relative w-full overflow-hidden rounded-2xl border border-emerald-300 bg-gradient-to-l from-emerald-600 to-teal-600 p-4 text-right text-white shadow-md transition hover:brightness-105 active:scale-[0.99] disabled:opacity-90"
          >
            <div className="flex items-start gap-3">
              <span className="relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15">
                {geoStatus === GEO_LOCATING ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <span className="absolute inset-0 animate-ping rounded-full bg-emerald-200/40" />
                    <Radar className="relative h-5 w-5" />
                  </>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold leading-snug sm:text-base">
                  📍 מצא מרפאות וטרינריות קרובות אליי (GPS)
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-emerald-50/95 sm:text-xs">
                  {geoStatus === GEO_LOCATING
                    ? 'מאתר מיקום נוכחי ומחשב מרחקים...'
                    : geoStatus === GEO_GRANTED
                      ? 'המיקום נמצא — המרפאות ממוינות לפי מרחק ושעות פתיחה'
                      : 'איתור ומיון מרפאות ומרכזי חירום באזור לפי מרחק ושעות פתיחה'}
                </p>
              </div>
              {geoStatus !== GEO_LOCATING && (
                <LocateFixed className="mt-1 h-5 w-5 shrink-0 opacity-90" />
              )}
            </div>
          </button>

          {geoStatus === GEO_DENIED && (
            <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-950">{geoError}</p>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-amber-900">
                  בחירת עיר ידנית
                </span>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">כל האזורים (סדר ברירת מחדל)</option>
                  {cityOptions.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2 px-0.5">
              <h2 className="text-sm font-extrabold text-slate-800">
                מרפאות וטרינריות באזורך (לפי מרחק)
              </h2>
              {geoStatus === GEO_GRANTED && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  ממוין לפי מרחק
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <FilterChip
                active={filter === FILTER_ALL}
                onClick={() => setFilter(FILTER_ALL)}
                label="הכל"
              />
              <FilterChip
                active={filter === FILTER_OPEN}
                onClick={() => setFilter(FILTER_OPEN)}
                label="🟢 פתוח כעת"
              />
              <FilterChip
                active={filter === FILTER_EMERGENCY}
                onClick={() => setFilter(FILTER_EMERGENCY)}
                label="🚨 חירום 24/7 בלבד"
              />
            </div>

            <div className="space-y-3.5">
              {nearby.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                  אין מרפאות התואמות לסינון הנוכחי
                </div>
              ) : (
                nearby.map((clinic) => (
                  <ClinicCard
                    key={clinic.id}
                    clinic={clinic}
                    showDistance={geoStatus === GEO_GRANTED}
                    onWaze={openWaze}
                  />
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function FilterChip({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
        active
          ? 'bg-slate-900 text-white shadow-sm'
          : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
      }`}
    >
      {label}
    </button>
  )
}

function ClinicCard({ clinic, showDistance, onWaze }) {
  const status = clinic.openStatus
  const isOpen = status?.isOpen
  const is24h = status?.is24h

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm transition-all ${
        clinic.isMajorReferral
          ? 'border-amber-300 bg-amber-50/20 ring-1 ring-amber-200/50'
          : 'border-slate-100 bg-white'
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-base font-bold text-slate-900">{clinic.name}</h3>
            {clinic.isMajorReferral && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                מרכז הפניה ארצי
              </span>
            )}
            {!clinic.isMajorReferral && clinic.isEmergency && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
                <Siren className="h-3 w-3" />
                חירום
              </span>
            )}
            {status && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isOpen
                    ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                    : 'bg-rose-50 text-rose-800 ring-1 ring-rose-200'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isOpen ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
                {is24h ? 'פתוח 24/7' : isOpen ? 'פתוח כעת' : 'סגור כעת'}
              </span>
            )}
          </div>

          {status?.label && (
            <p
              className={`mt-1 text-[11px] font-semibold ${
                isOpen ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {status.label}
            </p>
          )}

          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              <span>{clinic.city}</span>
              {clinic.address && <span>• {clinic.address}</span>}
            </div>

            {showDistance && clinic.distanceKm != null && (
              <div className="flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">
                <Compass className="h-3 w-3" />
                <span>{Number(clinic.distanceKm).toFixed(1)} ק״מ</span>
              </div>
            )}
          </div>
        </div>

        <div
          className={`flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${
            is24h || clinic.isEmergency
              ? 'bg-red-100 text-red-700'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>{is24h || clinic.isEmergency ? '24/7' : 'רגיל'}</span>
        </div>
      </div>

      {clinic.tag && <p className="mb-3 text-xs text-slate-600">{clinic.tag}</p>}

      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <a
          href={`tel:${clinic.phone}`}
          className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 active:scale-[0.98]"
        >
          <Phone className="h-4 w-4" />
          <span>חיוג מהיר</span>
        </a>

        <button
          type="button"
          onClick={() => onWaze(clinic.wazeQuery || clinic.name)}
          className="flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-sky-700 active:scale-[0.98]"
        >
          <Navigation className="h-4 w-4" />
          <span>ניווט Waze</span>
        </button>
      </div>
    </div>
  )
}
