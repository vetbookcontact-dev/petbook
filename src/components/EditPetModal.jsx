import { useEffect, useId, useRef, useState } from 'react'
import { Camera, Cat, Dog, PawPrint, X } from 'lucide-react'
import PetImage from './PetImage'

const SPECIES_OPTIONS = [
  { value: 'dog', label: 'כלב', icon: Dog },
  { value: 'cat', label: 'חתול', icon: Cat },
  { value: 'other', label: 'אחר', icon: PawPrint },
]

const SEX_OPTIONS = [
  { value: 'male', label: 'זכר' },
  { value: 'female', label: 'נקבה' },
]

function petToForm(pet) {
  return {
    name: pet?.name ?? '',
    type: pet?.type ?? 'dog',
    breed: pet?.breed ?? '',
    sex: pet?.sex ?? 'male',
    sterilized: Boolean(pet?.sterilized),
    birthDate: pet?.birthDate ?? '',
    weightKg: pet?.weightKg != null ? String(pet.weightKg) : '',
    chip: pet?.chip ?? '',
    image: pet?.image ?? '',
  }
}

export default function EditPetModal({
  open,
  pet,
  onClose,
  onSubmit,
  saving = false,
}) {
  const titleId = useId()
  const fileRef = useRef(null)
  const [form, setForm] = useState(() => petToForm(pet))
  const [error, setError] = useState('')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open && pet) {
      setForm(petToForm(pet))
      setError('')
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [open, pet])

  if (!open || !pet) return null

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('נא לבחור קובץ תמונה בלבד')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      update('image', String(reader.result))
      setError('')
    }
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('נא להזין שם בעל החיים')
      return
    }
    if (!form.birthDate) {
      setError('נא לבחור תאריך לידה')
      return
    }
    const weight = Number(form.weightKg)
    if (!form.weightKg || Number.isNaN(weight) || weight <= 0) {
      setError('נא להזין משקל תקין בק״ג')
      return
    }

    setError('')
    await onSubmit({
      name: form.name.trim(),
      type: form.type,
      breed: form.breed.trim() || 'לא צוין',
      sex: form.sex,
      sterilized: form.sterilized,
      birthDate: form.birthDate,
      weightKg: weight,
      chip: form.chip.trim() || '',
      image: form.image || '',
    })
  }

  const sterilizedLabel = form.sex === 'female' ? 'מעוקרת' : 'מסורס'

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
          <h2 id={titleId} className="text-lg font-extrabold text-slate-900">
            עריכת פרטי {pet.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-4 overflow-y-auto px-5 py-4">
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="group relative h-24 w-24 overflow-hidden rounded-3xl bg-slate-100 ring-2 ring-slate-200 transition hover:ring-brand-400"
              >
                <PetImage
                  src={form.image}
                  alt={form.name || 'תצוגה מקדימה'}
                  className="h-full w-full"
                  iconClassName="h-8 w-8"
                />
                <span className="absolute inset-x-0 bottom-0 bg-slate-900/55 py-1 text-center text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                  העלאה
                </span>
                <span className="absolute left-1.5 top-1.5 rounded-lg bg-white/90 p-1 text-brand-700 shadow-sm">
                  <Camera className="h-3.5 w-3.5" />
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhoto}
              />
              <div className="flex w-full gap-2">
                <input
                  value={form.image?.startsWith('data:') ? '' : form.image}
                  onChange={(e) => update('image', e.target.value)}
                  placeholder="או הדביקו כתובת URL לתמונה"
                  className={`${inputClass} flex-1`}
                  dir="ltr"
                />
              </div>
              {form.image && (
                <button
                  type="button"
                  onClick={() => update('image', '')}
                  className="text-xs font-semibold text-slate-500 underline"
                >
                  הסרת תמונה
                </button>
              )}
            </div>

            <Field label="שם בעל החיים">
              <input
                required
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="סוג">
              <div className="grid grid-cols-3 gap-2">
                {SPECIES_OPTIONS.map(({ value, label, icon: Icon }) => {
                  const active = form.type === value
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => update('type', value)}
                      className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-2.5 text-xs font-bold transition ${
                        active
                          ? 'border-brand-600 bg-brand-50 text-brand-800'
                          : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  )
                })}
              </div>
            </Field>

            <Field label="גזע">
              <input
                value={form.breed}
                onChange={(e) => update('breed', e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="מין">
              <div className="grid grid-cols-2 gap-2">
                {SEX_OPTIONS.map(({ value, label }) => {
                  const active = form.sex === value
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => update('sex', value)}
                      className={`rounded-2xl border py-2.5 text-sm font-bold transition ${
                        active
                          ? 'border-brand-600 bg-brand-700 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </Field>

            <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-sm font-semibold text-slate-700">
                {sterilizedLabel} / מעוקר·מסורס
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={form.sterilized}
                onClick={() => update('sterilized', !form.sterilized)}
                className={`relative h-7 w-12 rounded-full transition ${
                  form.sterilized ? 'bg-brand-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                    form.sterilized ? 'right-0.5' : 'right-[1.35rem]'
                  }`}
                />
              </button>
            </label>

            <Field label="תאריך לידה">
              <input
                required
                type="date"
                value={form.birthDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => update('birthDate', e.target.value)}
                className={`${inputClass} text-right`}
                dir="ltr"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label='משקל בק"ג'>
                <input
                  required
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={form.weightKg}
                  onChange={(e) => update('weightKg', e.target.value)}
                  className={inputClass}
                  dir="ltr"
                />
              </Field>
              <Field label="מספר שבב">
                <input
                  value={form.chip}
                  onChange={(e) => update('chip', e.target.value)}
                  className={inputClass}
                  dir="ltr"
                />
              </Field>
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
              className="w-full rounded-2xl bg-brand-700 py-3.5 text-sm font-bold text-white shadow-soft transition hover:bg-brand-800 disabled:opacity-60"
            >
              {saving ? 'שומר...' : 'שמירת שינויים'}
            </button>
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
  'mt-0 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100'
