import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ImagePlus,
  MapPinned,
  PhoneCall,
  Siren,
  Stethoscope,
} from 'lucide-react'
import {
  getVetConsultInquiries,
  onDutyVeterinarian,
  submitVetConsultInquiry,
  vetConsultFlags,
} from '../services/petService'

const SYMPTOM_PLACEHOLDER =
  'תארו את הסימנים, ממתי זה התחיל ואיך בעל החיים מגיב כרגע...'

const verdictStyles = {
  red: 'border-red-300 bg-red-50 text-red-900',
  amber: 'border-amber-200 bg-amber-50 text-amber-950',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-950',
}

function PetSummaryCard({ pet }) {
  if (!pet) return null
  const rows = [
    ['שם', pet.name],
    ['מין', pet.speciesHe || (pet.type === 'cat' ? 'חתול' : 'כלב')],
    ['גזע', pet.breed || '—'],
    ['גיל', pet.ageYears != null ? `${pet.ageYears} שנים` : '—'],
    ['משקל', pet.weightKg != null ? `${pet.weightKg} ק״ג` : '—'],
  ]
  return (
    <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-3">
      <p className="mb-2 text-[11px] font-bold text-brand-700">סיכום בעל חיים</p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-700">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2">
            <dt className="text-slate-500">{k}</dt>
            <dd className="font-semibold text-slate-900">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function InquiryCard({ inquiry, onGoEmergency }) {
  const response = inquiry.response
  const isEmergency = response?.verdictId === 'emergency'
  const isUrgent = response?.verdictId === 'urgent'

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="rounded-2xl rounded-br-md bg-brand-700 px-3.5 py-2.5 text-sm text-white">
        <p className="mb-1 text-[11px] font-bold text-brand-100">פנייה לווטרינר כונן</p>
        <p className="leading-relaxed">{inquiry.symptoms}</p>
        {inquiry.flagLabels?.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {inquiry.flagLabels.map((label) => (
              <li
                key={label}
                className="rounded-lg bg-white/15 px-2 py-0.5 text-[10px] font-semibold"
              >
                {label}
              </li>
            ))}
          </ul>
        )}
        {inquiry.media?.dataUrl && (
          <div className="mt-2 overflow-hidden rounded-xl border border-white/20">
            {inquiry.media.type?.startsWith('video') ? (
              <video
                src={inquiry.media.dataUrl}
                controls
                className="max-h-40 w-full bg-black object-contain"
              />
            ) : (
              <img
                src={inquiry.media.dataUrl}
                alt="צרופה לפנייה"
                className="max-h-40 w-full object-cover"
              />
            )}
          </div>
        )}
      </div>

      {inquiry.status === 'pending' && (
        <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs text-slate-600">
          <div className="mb-1 flex items-center gap-1.5 font-bold text-brand-700">
            <Stethoscope className="h-3.5 w-3.5 animate-pulse" />
            ממתין למענה וטרינר כונן...
          </div>
          {onDutyVeterinarian.name} בוחן את הפרטים הקליניים.
        </div>
      )}

      {response && (
        <div className="rounded-2xl rounded-bl-md bg-slate-100 px-3.5 py-3 text-sm text-slate-800">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-brand-800">
            <Stethoscope className="h-3.5 w-3.5" />
            {response.stampLabel}
          </div>
          <div
            className={`mb-2 rounded-xl border px-2.5 py-1.5 text-xs font-extrabold ${
              verdictStyles[response.color] || verdictStyles.amber
            }`}
          >
            {response.badge}
          </div>
          {response.banner && (
            <div
              className={`mb-2 rounded-xl px-3 py-2 text-[11px] font-bold leading-relaxed ${
                isEmergency
                  ? 'border border-red-400 bg-red-600 text-white'
                  : isUrgent
                    ? 'border border-amber-300 bg-amber-100 text-amber-950'
                    : 'border border-emerald-200 bg-emerald-50 text-emerald-900'
              }`}
            >
              {response.banner}
            </div>
          )}
          <p className="leading-relaxed">{response.clinicalNotes}</p>

          {isEmergency && (
            <div className="mt-3 space-y-2 rounded-2xl border border-red-300 bg-red-600 p-3 text-white">
              <div className="flex items-start gap-2">
                <Siren className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-extrabold">מרכז חירום 24/7</p>
                  <p className="mt-0.5 text-[11px] text-red-50">
                    מעבר למדריך מרפאות חירום וחיוג מהיר.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onGoEmergency}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-xs font-bold text-red-700"
              >
                <PhoneCall className="h-4 w-4" />
                חיוג מהיר למרכז חירום קרוב
              </button>
            </div>
          )}

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <a
              href={response.vet?.phoneHref || onDutyVeterinarian.phoneHref}
              className="flex items-center justify-center gap-2 rounded-xl border border-brand-200 bg-white py-2.5 text-xs font-bold text-brand-800 transition hover:bg-brand-50"
            >
              <PhoneCall className="h-4 w-4" />
              שיחה חוזרת עם הווטרינר
            </a>
            <button
              type="button"
              onClick={onGoEmergency}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-800 transition hover:bg-slate-50"
            >
              <MapPinned className="h-4 w-4" />
              ניווט למרפאה הקרובה
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function VetConsultView({ pet, ownerProfile, onGoEmergency }) {
  const [symptoms, setSymptoms] = useState('')
  const [flags, setFlags] = useState([])
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [media, setMedia] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [inquiries, setInquiries] = useState([])
  const fileRef = useRef(null)
  const timelineRef = useRef(null)

  const refresh = useCallback(async () => {
    const list = await getVetConsultInquiries()
    setInquiries(list)
  }, [])

  useEffect(() => {
    setPhone(ownerProfile?.phone || '')
    setWhatsapp(ownerProfile?.phone || '')
  }, [ownerProfile])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const hasPending = inquiries.some((i) => i.status === 'pending')
    if (!hasPending) return undefined
    const t = setInterval(refresh, 900)
    return () => clearInterval(t)
  }, [inquiries, refresh])

  useEffect(() => {
    timelineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [inquiries])

  function toggleFlag(id) {
    setFlags((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    )
  }

  function handleMedia(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 6 * 1024 * 1024) {
      setError('קובץ גדול מדי (עד 6MB בדמו)')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setMedia({
        name: file.name,
        type: file.type,
        dataUrl: String(reader.result),
      })
      setError('')
    }
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!symptoms.trim()) {
      setError('נא לתאר את הסימנים')
      return
    }
    if (!phone.trim()) {
      setError('נא למלא מספר טלפון ליצירת קשר')
      return
    }
    setSaving(true)
    setError('')
    try {
      await submitVetConsultInquiry({
        pet,
        symptoms: symptoms.trim(),
        flags,
        media,
        contact: {
          phone: phone.trim(),
          whatsapp: (whatsapp || phone).trim(),
          ownerName: ownerProfile?.fullName || '',
        },
      })
      setSymptoms('')
      setFlags([])
      setMedia(null)
      if (fileRef.current) fileRef.current.value = ''
      await refresh()
    } catch {
      setError('שגיאה בשליחת הפנייה. נסו שוב.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-brand-100 bg-gradient-to-l from-brand-50 to-white p-3">
        <div className="flex items-start gap-2">
          <Stethoscope className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
          <div>
            <p className="text-sm font-extrabold text-slate-900">
              התייעצות טריאז׳ עם וטרינר כונן
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
              שלחו פנייה מובנית — {onDutyVeterinarian.name} ({onDutyVeterinarian.title})
              יסווג דחיפות ויחזיר הנחיות קליניות.
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-2xl bg-white p-3 shadow-soft ring-1 ring-slate-100"
      >
        <PetSummaryCard pet={pet} />

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-700">
            תיאור הסימנים
          </span>
          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            rows={4}
            placeholder={SYMPTOM_PLACEHOLDER}
            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
            disabled={saving}
          />
        </label>

        <fieldset>
          <legend className="mb-2 text-xs font-bold text-slate-700">
            דגלי אזהרה מהירים
          </legend>
          <div className="space-y-2">
            {vetConsultFlags.map((flag) => {
              const checked = flags.includes(flag.id)
              return (
                <label
                  key={flag.id}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 text-xs transition ${
                    checked
                      ? 'border-brand-300 bg-brand-50 text-brand-900'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleFlag(flag.id)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
                    disabled={saving}
                  />
                  <span className="font-semibold leading-snug">{flag.label}</span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <div>
          <span className="mb-1.5 block text-xs font-bold text-slate-700">
            צרופת מדיה (אופציונלי)
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleMedia}
            className="hidden"
            disabled={saving}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 py-3 text-xs font-bold text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
          >
            <ImagePlus className="h-4 w-4" />
            {media ? media.name : 'העלאת תמונה / וידאו לפציעה, יציבה או חניכיים'}
          </button>
          {media && (
            <button
              type="button"
              onClick={() => {
                setMedia(null)
                if (fileRef.current) fileRef.current.value = ''
              }}
              className="mt-1.5 text-[11px] font-semibold text-red-600"
            >
              הסרת צרופה
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-700">טלפון</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05X-XXX-XXXX"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              disabled={saving}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-700">WhatsApp</span>
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="אותו מספר או אחר"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              disabled={saving}
            />
          </label>
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-700 py-3.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-brand-800 disabled:opacity-50"
        >
          {saving ? 'שולח...' : '🚀 שלח פנייה דחופה לווטרינר כונן'}
        </button>
      </form>

      {inquiries.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-extrabold text-slate-900">ציר זמן פניות</h2>
          {inquiries.map((inquiry) => (
            <InquiryCard
              key={inquiry.id}
              inquiry={inquiry}
              onGoEmergency={onGoEmergency}
            />
          ))}
          <div ref={timelineRef} />
        </section>
      )}
    </div>
  )
}
