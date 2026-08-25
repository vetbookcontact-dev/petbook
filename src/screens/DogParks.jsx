import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import {
  ArrowRight,
  ChevronDown,
  Clock3,
  Compass,
  Loader2,
  LocateFixed,
  Map,
  MapPin,
  Megaphone,
  Navigation,
  Search,
  TreePine,
  Users,
  X,
} from 'lucide-react'
import PetImage from '../components/PetImage'
import ReportParkModal from '../components/ReportParkModal'
import {
  PARK_NOTE_CHIPS,
  PARK_TIME_WINDOWS,
  checkInToPark,
  checkOutOfPark,
  getParkReportSummaries,
  getParkVisitorSummaries,
  getParkVisitors,
  getSortedDogParks,
} from '../services/petService'

const GEO_IDLE = 'idle'
const GEO_LOCATING = 'locating'
const GEO_GRANTED = 'granted'
const GEO_DENIED = 'denied'

export default function DogParks({
  onBack,
  pets = [],
  activePetId = null,
  ownerProfile = null,
}) {
  const dogs = useMemo(
    () => pets.filter((p) => p.type === 'dog' || p.speciesHe === 'כלב'),
    [pets],
  )
  const authorName = ownerProfile?.fullName?.trim() || 'אורח/ת'

  const [parks, setParks] = useState([])
  const [summaries, setSummaries] = useState({})
  const [reportSummaries, setReportSummaries] = useState({})
  const [loading, setLoading] = useState(true)
  const [geoStatus, setGeoStatus] = useState(GEO_IDLE)
  const [geoMessage, setGeoMessage] = useState('')
  const [query, setQuery] = useState('')
  const [whoPark, setWhoPark] = useState(null)
  const [statusPark, setStatusPark] = useState(null)
  const [reportPark, setReportPark] = useState(null)
  const [expandedParkId, setExpandedParkId] = useState(null)

  const refreshSummaries = useCallback(async () => {
    const [map, reports] = await Promise.all([
      getParkVisitorSummaries(),
      getParkReportSummaries(),
    ])
    setSummaries(map)
    setReportSummaries(reports)
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      const [data, map, reports] = await Promise.all([
        getSortedDogParks(null),
        getParkVisitorSummaries(),
        getParkReportSummaries(),
      ])
      if (alive) {
        setParks(data)
        setSummaries(map)
        setReportSummaries(reports)
        setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return parks
    return parks.filter((p) => {
      const hay = [p.name, p.city, p.neighborhood, p.address, ...(p.amenities || [])]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [parks, query])

  function locateParks() {
    if (!('geolocation' in navigator)) {
      setGeoStatus(GEO_DENIED)
      setGeoMessage('המכשיר אינו תומך באיתור מיקום. מוצגת רשימת ברירת מחדל.')
      return
    }

    setGeoStatus(GEO_LOCATING)
    setGeoMessage('')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const data = await getSortedDogParks({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
          setParks(data)
          setGeoStatus(GEO_GRANTED)
          setGeoMessage('הגינות ממוינות לפי מרחק מהמיקום שלך')
        } catch {
          setGeoStatus(GEO_DENIED)
          setGeoMessage('שגיאה בחישוב מרחקים. מוצגת רשימת ברירת מחדל.')
        }
      },
      (error) => {
        console.warn('Dog parks GPS unavailable:', error.message)
        setGeoStatus(GEO_DENIED)
        setGeoMessage(
          'גישת מיקום כבויה או נדחתה. מוצגת רשימת ברירת מחדל — אפשר לחפש לפי עיר או שם הגינה.',
        )
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    )
  }

  function openWaze(park) {
    const q = park.wazeQuery || `${park.name} ${park.city}`
    window.open(`https://waze.com/ul?q=${encodeURIComponent(q)}&navigate=yes`, '_blank')
  }

  function openGoogleMaps(park) {
    const mapsQuery =
      Number.isFinite(park.lat) && Number.isFinite(park.lng)
        ? `${park.lat},${park.lng}`
        : park.wazeQuery || `${park.name} ${park.city}`
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`,
      '_blank',
    )
  }

  async function handleStatusSubmit({ parkId, petId, status, plannedWindowId, note, petSnapshot }) {
    if (status === 'checkout') {
      await checkOutOfPark(parkId, petId)
    } else {
      await checkInToPark(parkId, petId, {
        status,
        plannedWindowId,
        note,
        petSnapshot,
      })
    }
    await refreshSummaries()
    setStatusPark(null)
  }

  return (
    <div className="space-y-4 pb-16" dir="rtl">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-emerald-700">גינת כלבים חברתית</p>
          <h1 className="text-2xl font-extrabold text-slate-900">גינות כלבים באזור</h1>
          <p className="mt-1 text-sm text-slate-500">
            איתור, צ׳ק-אין ודיווחי שטח בזמן אמת
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-800"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          חזרה לראשי
        </button>
      </header>

      <button
        type="button"
        onClick={locateParks}
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
                <LocateFixed className="relative h-5 w-5" />
              </>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold sm:text-base">
              📍 אתר גינות לפי מיקום נוכחי
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-emerald-50/95 sm:text-xs">
              {geoStatus === GEO_LOCATING
                ? 'מאתר מיקום ומחשב מרחקים...'
                : geoStatus === GEO_GRANTED
                  ? 'המיקום נמצא — הרשימה ממוינת מהקרובה לרחוקה'
                  : 'לחצו לאיתור GPS ומיון גינות לפי מרחק'}
            </p>
          </div>
          <TreePine className="mt-1 h-5 w-5 shrink-0 opacity-90" />
        </div>
      </button>

      {geoMessage && (
        <p
          className={`rounded-xl px-3 py-2 text-xs font-semibold ${
            geoStatus === GEO_DENIED
              ? 'border border-amber-200 bg-amber-50 text-amber-900'
              : 'border border-emerald-100 bg-emerald-50 text-emerald-800'
          }`}
        >
          {geoMessage}
        </p>
      )}

      <label className="relative block">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חיפוש לפי עיר או שם הגינה..."
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pr-10 pl-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
      </label>

      <div className="space-y-3.5">
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-400">טוען גינות כלבים...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            לא נמצאו גינות התואמות לחיפוש
          </div>
        ) : (
          filtered.map((park) => (
            <ParkCard
              key={park.id}
              park={park}
              summary={summaries[park.id]}
              reportSummary={reportSummaries[park.id]}
              showDistance={geoStatus === GEO_GRANTED}
              expanded={expandedParkId === park.id}
              onToggleExpand={() =>
                setExpandedParkId((prev) => (prev === park.id ? null : park.id))
              }
              onWaze={() => openWaze(park)}
              onMaps={() => openGoogleMaps(park)}
              onOpenWho={() => setWhoPark(park)}
              onOpenStatus={() => setStatusPark(park)}
              onOpenReport={() => setReportPark(park)}
            />
          ))
        )}
      </div>

      {whoPark && (
        <WhoAtParkModal park={whoPark} onClose={() => setWhoPark(null)} />
      )}

      {statusPark && (
        <UpdateStatusModal
          park={statusPark}
          dogs={dogs}
          defaultPetId={activePetId}
          onClose={() => setStatusPark(null)}
          onSubmit={handleStatusSubmit}
        />
      )}

      {reportPark && (
        <ReportParkModal
          park={reportPark}
          authorName={authorName}
          onClose={() => setReportPark(null)}
          onSubmitted={refreshSummaries}
        />
      )}
    </div>
  )
}

function ParkCard({
  park,
  summary,
  reportSummary,
  showDistance,
  expanded,
  onToggleExpand,
  onWaze,
  onMaps,
  onOpenWho,
  onOpenStatus,
  onOpenReport,
}) {
  const hereCount = summary?.hereCount ?? 0
  const planningCount = summary?.planningCount ?? 0
  const hereAvatars = summary?.hereAvatars ?? []
  const planningAvatars = summary?.planningAvatars ?? []
  const crowd = reportSummary?.crowd
  const alerts = reportSummary?.alerts ?? []
  const primaryAlert = alerts[0]
  const amenities = (park.amenities || []).slice(0, 4)

  function stop(e) {
    e.stopPropagation()
  }

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 ${
        expanded
          ? 'border-emerald-200 ring-2 ring-emerald-100'
          : 'border-slate-100 ring-1 ring-emerald-50/60'
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onToggleExpand}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggleExpand()
          }
        }}
        className="cursor-pointer p-4 text-right outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
        aria-expanded={expanded}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900">{park.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                {park.city}
                {park.neighborhood && <span>• {park.neighborhood}</span>}
              </span>
              {showDistance && park.distanceKm != null && (
                <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">
                  <Compass className="h-3 w-3" />
                  {Number(park.distanceKm).toFixed(1)} ק״מ
                </span>
              )}
            </div>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <TreePine className="h-5 w-5" />
          </span>
        </div>

        {amenities.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {amenities.map((amenity) => (
              <span
                key={amenity}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
              >
                {amenity}
              </span>
            ))}
          </div>
        )}

        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 ring-1 ring-emerald-100">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            {crowd
              ? `${crowd.emoji} רמת עומס: ${crowd.badge}`
              : `🟢 ${hereCount} כלבים כעת`}
          </span>
          {primaryAlert && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-800 ring-1 ring-red-100">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
              </span>
              {primaryAlert.emoji} {primaryAlert.label}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5" onClick={stop}>
          <button
            type="button"
            onClick={onWaze}
            className="flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 active:scale-[0.98]"
          >
            <Navigation className="h-4 w-4" />
            ניווט Waze
          </button>
          <button
            type="button"
            onClick={onMaps}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-900 active:scale-[0.98]"
          >
            <Map className="h-4 w-4" />
            Google Maps
          </button>
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-emerald-800">
          <span>
            {expanded
              ? 'סגירת פרטים ▴'
              : 'לפרטים מלאים, דיווחים ונוכחות ▾'}
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-300 ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-3 border-t border-emerald-50 px-4 pb-4 pt-3">
            <div className="space-y-2 rounded-2xl border border-orange-100 bg-orange-50/30 p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-orange-950">
                <Megaphone className="h-3.5 w-3.5 text-orange-600" />
                דיווחי שטח בזמן אמת
              </div>

              {crowd ? (
                <div
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-2.5 py-2 text-[11px] font-semibold ${crowd.tone}`}
                >
                  <span>
                    {crowd.emoji} רמת עומס: {crowd.badge}
                  </span>
                  <span className="font-medium opacity-80">
                    דווח ע״י {crowd.authorName} {crowd.relativeTime}
                  </span>
                </div>
              ) : (
                <p className="rounded-xl bg-white/70 px-2.5 py-2 text-[11px] text-slate-500">
                  אין דיווח עומס פעיל — היו הראשונים לדווח
                </p>
              )}

              {alerts.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {alerts.map((alert) => (
                    <span
                      key={alert.id}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${
                        alert.pulse
                          ? 'border-red-300 bg-red-50 text-red-800'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      {alert.pulse && (
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                        </span>
                      )}
                      <span>
                        {alert.emoji} {alert.label}
                      </span>
                      <span className="font-medium opacity-70">· {alert.relativeTime}</span>
                    </span>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={(e) => {
                  stop(e)
                  onOpenReport()
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 active:scale-[0.99]"
              >
                <Megaphone className="h-4 w-4" />
                📢 דיווח מהשטח
              </button>
            </div>

            <div className="space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                <Users className="h-3.5 w-3.5" />
                נוכחות בגינה
              </div>

              <button
                type="button"
                onClick={(e) => {
                  stop(e)
                  onOpenWho()
                }}
                className="flex w-full items-center justify-between gap-2 rounded-xl bg-white/80 px-2.5 py-2 text-right transition hover:bg-white"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-800">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    עכשיו בגינה
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-600">
                    🟢 {hereCount} כלבים נמצאים כעת
                  </p>
                </div>
                <AvatarStack avatars={hereAvatars} />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  stop(e)
                  onOpenWho()
                }}
                className="flex w-full items-center justify-between gap-2 rounded-xl bg-white/80 px-2.5 py-2 text-right transition hover:bg-white"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-800">
                    <Clock3 className="h-3.5 w-3.5 text-amber-600" />
                    מתכננים להגיע היום
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-600">
                    🕒 {planningCount} כלבים מתכננים להגיע
                  </p>
                </div>
                <AvatarStack avatars={planningAvatars} />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  stop(e)
                  onOpenStatus()
                }}
                className="w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 active:scale-[0.99]"
              >
                עדכן סטטוס הגעה
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

function AvatarStack({ avatars }) {
  if (!avatars?.length) {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-400">
        —
      </span>
    )
  }
  return (
    <div className="flex -space-x-2 space-x-reverse">
      {avatars.map((a) => (
        <PetImage
          key={a.id}
          src={a.photoURL}
          alt={a.petName}
          className="h-8 w-8 rounded-full border-2 border-white"
          iconClassName="h-3.5 w-3.5 text-emerald-500"
        />
      ))}
    </div>
  )
}

function WhoAtParkModal({ park, onClose }) {
  const titleId = useId()
  const [visitors, setVisitors] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      const list = await getParkVisitors(park.id)
      if (alive) {
        setVisitors(list)
        setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [park.id])

  const here = visitors.filter((v) => v.status === 'here')
  const planning = visitors.filter((v) => v.status === 'planning')

  return (
    <Sheet titleId={titleId} title="מי בגינה?" subtitle={park.name} onClose={onClose}>
      {loading ? (
        <p className="py-8 text-center text-sm text-slate-400">טוען נוכחות...</p>
      ) : (
        <div className="space-y-5">
          <VisitorGroup title={`עכשיו בגינה (${here.length})`} visitors={here} empty="אין כלבים בגינה כרגע" live />
          <VisitorGroup
            title={`מתכננים להגיע (${planning.length})`}
            visitors={planning}
            empty="אין תכנוני הגעה להיום"
          />
        </div>
      )}
    </Sheet>
  )
}

function VisitorGroup({ title, visitors, empty, live = false }) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-extrabold text-slate-800">
        {live && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        )}
        {title}
      </h3>
      {visitors.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-500">{empty}</p>
      ) : (
        <ul className="space-y-2.5">
          {visitors.map((v) => (
            <li
              key={v.id}
              className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3"
            >
              <PetImage
                src={v.photoURL}
                alt={v.petName}
                className="h-14 w-14 rounded-2xl"
                iconClassName="h-5 w-5 text-emerald-500"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <p className="font-bold text-slate-900">{v.petName}</p>
                  <p className="text-xs text-slate-500">{v.breed}</p>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-600">
                  {v.sexHe}
                  {v.neuteredHe ? ` · ${v.neuteredHe}` : ''}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-emerald-700">
                  {v.arrivalLabel}
                </p>
                {v.tags?.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {v.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {v.note && (
                  <p className="mt-1.5 text-[11px] text-slate-500">הערה: {v.note}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function UpdateStatusModal({ park, dogs, defaultPetId, onClose, onSubmit }) {
  const titleId = useId()
  const defaultDog =
    dogs.find((d) => d.id === defaultPetId) || dogs[0] || null
  const [petId, setPetId] = useState(defaultDog?.id || '')
  const [mode, setMode] = useState('here') // here | planning | checkout
  const [windowId, setWindowId] = useState('evening')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!petId) {
      setError('נא לבחור כלב')
      return
    }
    const pet = dogs.find((d) => d.id === petId)
    setSaving(true)
    setError('')
    try {
      await onSubmit({
        parkId: park.id,
        petId,
        status: mode === 'checkout' ? 'checkout' : mode,
        plannedWindowId: windowId,
        note,
        petSnapshot: pet
          ? {
              name: pet.name,
              breed: pet.breed,
              sex: pet.sex,
              sexHe: pet.sexHe,
              image: pet.image,
              neutered: true,
              neuteredHe: pet.sex === 'female' ? 'מעוקרת' : 'מסורס',
              tags: ['חברותי'],
            }
          : {},
      })
    } catch {
      setError('שגיאה בעדכון הסטטוס')
      setSaving(false)
    }
  }

  return (
    <Sheet
      titleId={titleId}
      title="עדכן סטטוס הגעה"
      subtitle={park.name}
      onClose={onClose}
    >
      {dogs.length === 0 ? (
        <p className="rounded-xl bg-amber-50 px-3 py-3 text-sm text-amber-900">
          אין כלבים בפרופיל. הוסיפו כלב בדף הראשי כדי לבצע צ׳ק-אין.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">בחירת כלב</span>
            <select
              value={petId}
              onChange={(e) => setPetId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            >
              {dogs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.breed ? `· ${d.breed}` : ''}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600">סטטוס</p>
            <StatusOption
              active={mode === 'here'}
              onClick={() => setMode('here')}
              title="🐾 אני כאן עכשיו"
              desc="צ׳ק-אין פעיל ל־60 דקות"
            />
            <StatusOption
              active={mode === 'planning'}
              onClick={() => setMode('planning')}
              title="⏰ מתכנן/ת להגיע היום"
              desc="בחרו חלון זמן למטה"
            />
            <StatusOption
              active={mode === 'checkout'}
              onClick={() => setMode('checkout')}
              title="🚪 עזבתי את הגינה"
              desc="הסרה מנוכחות / תכנון"
            />
          </div>

          {mode === 'planning' && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600">חלון הגעה</p>
              <div className="grid gap-2">
                {PARK_TIME_WINDOWS.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setWindowId(w.id)}
                    className={`rounded-xl border px-3 py-2.5 text-right text-sm font-semibold transition ${
                      windowId === w.id
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode !== 'checkout' && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-slate-600">
                הערת התנהגות/מזג (אופציונלי)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PARK_NOTE_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setNote(note === chip ? '' : chip)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                      note === chip
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-emerald-700 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-60"
          >
            {saving ? 'מעדכן...' : 'שמירת סטטוס'}
          </button>
        </form>
      )}
    </Sheet>
  )
}

function StatusOption({ active, onClick, title, desc }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-3 py-2.5 text-right transition ${
        active
          ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{desc}</p>
    </button>
  )
}

function Sheet({ titleId, title, subtitle, onClose, children }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="סגירה"
        className={`absolute inset-0 bg-slate-900/50 transition-opacity ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        dir="rtl"
        className={`relative z-10 flex max-h-[88vh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-2xl transition-all sm:rounded-3xl ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-extrabold text-slate-900">
              {title}
            </h2>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
