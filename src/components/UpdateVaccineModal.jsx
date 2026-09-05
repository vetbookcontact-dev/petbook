import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Camera, FileImage, Info, X } from 'lucide-react'
import {
  CAT_RABIES_INTERVALS,
  FLEA_TICK_PRODUCTS,
  computeVaccineOutcome,
  getProtocolsForPet,
} from '../data/vaccineProtocols'
import { compressImage } from '../utils/compressImage'

function formatDateHe(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function UpdateVaccineModal({
  open,
  pet,
  vaccines = [],
  ownerAddress = '',
  protocolOptions = [],
  initialRow = null,
  scanMode = false,
  onClose,
  onSubmit,
  saving = false,
}) {
  const titleId = useId()
  const fileRef = useRef(null)
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')
  const [protocolKey, setProtocolKey] = useState('')
  const [administeredAt, setAdministeredAt] = useState('')
  const [clinic, setClinic] = useState('מרפאת וט-קר, תל אביב')
  const [notes, setNotes] = useState('')
  const [image, setImage] = useState('')
  const [forceSpirocerca, setForceSpirocerca] = useState(false)
  const [fleaProductKey, setFleaProductKey] = useState('bravecto')
  const [customDueAt, setCustomDueAt] = useState('')
  const [catRabiesMonths, setCatRabiesMonths] = useState(12)

  const options = useMemo(() => {
    if (protocolOptions?.length) return protocolOptions
    return getProtocolsForPet(pet, { includeOptionalRabies: true })
  }, [protocolOptions, pet])

  const selectedProtocol = useMemo(
    () => options.find((p) => p.key === protocolKey) ?? null,
    [options, protocolKey],
  )

  const isFlea = protocolKey === 'flea_tick'
  const isCatRabies = protocolKey === 'rabies' && pet?.type === 'cat'

  const outcome = useMemo(() => {
    if (!selectedProtocol || !administeredAt || !pet) return null
    return computeVaccineOutcome({
      pet,
      protocolKey: selectedProtocol.key,
      administeredAt,
      vaccines,
      ownerAddress,
      recordId: initialRow?.record?.id ?? null,
      forceSpirocerca,
      fleaProductKey,
      customDueAt: fleaProductKey === 'custom' ? customDueAt : null,
      catRabiesMonths,
    })
  }, [
    selectedProtocol,
    administeredAt,
    pet,
    vaccines,
    ownerAddress,
    initialRow,
    forceSpirocerca,
    fleaProductKey,
    customDueAt,
    catRabiesMonths,
  ])

  useEffect(() => {
    if (!open) {
      setVisible(false)
      return
    }

    const protocol = initialRow?.protocol ?? options[0] ?? null
    setProtocolKey(protocol?.key ?? '')
    setAdministeredAt(
      initialRow?.administeredAt || new Date().toISOString().slice(0, 10),
    )
    setClinic(initialRow?.record?.clinic || 'מרפאת וט-קר, תל אביב')
    setNotes(initialRow?.record?.notes || '')
    setImage(initialRow?.record?.image || '')
    setForceSpirocerca(Boolean(initialRow?.record?.forceSpirocerca))
    setFleaProductKey(initialRow?.record?.fleaProductKey || 'bravecto')
    setCustomDueAt(initialRow?.record?.customDueAt || initialRow?.dueAt || '')
    setCatRabiesMonths(initialRow?.record?.catRabiesMonths || 12)
    setError('')
    requestAnimationFrame(() => setVisible(true))
  }, [open, initialRow, options])

  if (!open || !pet) return null

  async function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('נא לבחור קובץ תמונה בלבד')
      return
    }
    try {
      setImage(await compressImage(file))
      setError('')
    } catch {
      setError('שגיאה בעיבוד התמונה')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!protocolKey || !selectedProtocol) {
      setError('נא לבחור סוג חיסון / טיפול')
      return
    }
    if (!administeredAt) {
      setError('נא לבחור תאריך קבלת החיסון')
      return
    }
    if (outcome?.notRequired && !forceSpirocerca) {
      setError('באזור זה הטיפול מסומן כלא נדרש. סמנו "בכל זאת תיעוד" כדי לשמור.')
      return
    }
    if (isFlea && fleaProductKey === 'custom' && !customDueAt) {
      setError('נא לבחור תאריך יעד מותאם אישית')
      return
    }

    setError('')
    await onSubmit({
      id: initialRow?.record?.id,
      protocolKey: selectedProtocol.key,
      name: selectedProtocol.name,
      nameEn: selectedProtocol.nameEn,
      petType: pet.type,
      birthDate: pet.birthDate,
      ageYears: pet.ageYears,
      ownerAddress,
      administeredAt,
      dueAt: outcome?.dueAt ?? null,
      stageLabel: outcome?.stageLabel,
      displayName: outcome?.displayName,
      productLabel: outcome?.productLabel,
      fleaProductKey: isFlea ? fleaProductKey : undefined,
      customDueAt: isFlea && fleaProductKey === 'custom' ? customDueAt : undefined,
      catRabiesMonths: isCatRabies ? catRabiesMonths : undefined,
      forceSpirocerca,
      clinic,
      notes,
      image,
    })
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="סגירה"
        className={`absolute inset-0 bg-slate-900/50 transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => !saving && onClose()}
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
              {scanMode ? 'סריקת פנקס / מדבקה' : 'עדכון חיסון / טיפול'}
            </h2>
            <p className="text-xs text-slate-500">
              עבור {pet.name} · {pet.type === 'cat' ? 'חתול' : 'כלב'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl bg-slate-100 p-2 text-slate-600 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-3 overflow-y-auto px-5 py-4">
            {scanMode && (
              <div className="rounded-2xl border border-dashed border-brand-300 bg-brand-50/60 p-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-sm">
                    <FileImage className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-800">סריקה מדומה</p>
                    <p className="text-xs text-slate-500">
                      העלו צילום מדבקה/פנקס ומלאו את הפרטים ידנית
                    </p>
                  </div>
                </div>
              </div>
            )}

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                סוג חיסון / טיפול
              </span>
              <select
                value={protocolKey}
                onChange={(e) => setProtocolKey(e.target.value)}
                className={inputClass}
                required
              >
                {options.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name}
                    {p.optionalBadge ? ` · ${p.optionalBadge}` : ''} ({p.nameEn})
                  </option>
                ))}
              </select>
            </label>

            {isFlea && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  סוג תכשיר / מותג
                </span>
                <select
                  value={fleaProductKey}
                  onChange={(e) => setFleaProductKey(e.target.value)}
                  className={inputClass}
                >
                  {FLEA_TICK_PRODUCTS.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {isFlea && fleaProductKey === 'custom' && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  תאריך יעד מותאם
                </span>
                <input
                  type="date"
                  value={customDueAt}
                  min={administeredAt}
                  onChange={(e) => setCustomDueAt(e.target.value)}
                  className={`${inputClass} text-right`}
                  dir="ltr"
                  required
                />
              </label>
            )}

            {isCatRabies && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  תוקף חיסון הכלבת (לחתולים)
                </span>
                <select
                  value={catRabiesMonths}
                  onChange={(e) => setCatRabiesMonths(Number(e.target.value))}
                  className={inputClass}
                >
                  {CAT_RABIES_INTERVALS.map((opt) => (
                    <option key={opt.months} value={opt.months}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {outcome?.ruleText && (
              <div className="flex gap-2 rounded-2xl border border-sky-100 bg-sky-50 px-3 py-2.5 text-xs leading-relaxed text-sky-950">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                <p>{outcome.ruleText}</p>
              </div>
            )}

            {outcome?.stageLabel && (
              <p className="inline-flex rounded-lg bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-800">
                {outcome.stageLabel}
              </p>
            )}

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                תאריך קבלת החיסון / הטיפול
              </span>
              <input
                type="date"
                required
                value={administeredAt}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setAdministeredAt(e.target.value)}
                className={`${inputClass} text-right`}
                dir="ltr"
              />
            </label>

            <div className="rounded-2xl bg-slate-50 px-3 py-2.5 text-sm">
              <p className="text-xs font-semibold text-slate-500">תאריך יעד הבא (אוטומטי)</p>
              <p className="mt-0.5 font-bold text-slate-900">
                {outcome?.notRequired && !forceSpirocerca
                  ? 'לא נדרש באזור זה'
                  : formatDateHe(outcome?.dueAt)}
              </p>
            </div>

            {protocolKey === 'spirocerca' && outcome?.notRequired && (
              <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700">
                <span>בכל זאת תיעוד טיפול (חריגה מאזור)</span>
                <input
                  type="checkbox"
                  checked={forceSpirocerca}
                  onChange={(e) => setForceSpirocerca(e.target.checked)}
                  className="h-4 w-4 accent-brand-700"
                />
              </label>
            )}

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">שם מרפאה</span>
              <input
                value={clinic}
                onChange={(e) => setClinic(e.target.value)}
                className={inputClass}
                placeholder="מרפאת וט-קר, תל אביב"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">הערות</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className={`${inputClass} resize-none`}
                placeholder="פרטים נוספים מהמדבקה"
              />
            </label>

            <div>
              <p className="mb-1.5 text-xs font-semibold text-slate-600">
                העלאת צילום מדבקה / פנקס
              </p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-right transition hover:border-brand-300"
              >
                {image ? (
                  <img
                    src={image}
                    alt="תצוגה מקדימה"
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-white text-brand-700 shadow-sm">
                    <Camera className="h-5 w-5" />
                  </span>
                )}
                <span className="text-sm font-semibold text-slate-700">
                  {image ? 'החלפת תמונה' : 'בחירת תמונה / מצלמה'}
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhoto}
              />
            </div>

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
              className="w-full rounded-2xl bg-brand-700 py-3.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? 'שומר...' : 'שמירת עדכון'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100'
