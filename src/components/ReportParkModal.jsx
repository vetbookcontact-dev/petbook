import { useEffect, useId, useState } from 'react'
import { Megaphone, X } from 'lucide-react'
import {
  PARK_CROWD_LEVELS,
  PARK_ALERT_TYPES,
  PARK_REPORT_MODAL_ALERTS,
  addParkReport,
} from '../services/petService'

export default function ReportParkModal({
  park,
  authorName = 'אורח/ת',
  onClose,
  onSubmitted,
}) {
  const titleId = useId()
  const [visible, setVisible] = useState(false)
  const [crowdLevel, setCrowdLevel] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  function toggleAlert(id) {
    setAlerts((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!crowdLevel && alerts.length === 0) {
      setError('בחרו רמת עומס או לפחות התראה אחת')
      return
    }
    setSaving(true)
    setError('')
    try {
      await addParkReport(park.id, {
        crowdLevel,
        alerts,
        note,
        authorName,
      })
      onSubmitted?.()
      onClose()
    } catch {
      setError('שגיאה בשליחת הדיווח')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center sm:items-center sm:p-4">
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
        className={`relative z-10 flex max-h-[92vh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-2xl transition-all sm:rounded-3xl ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id={titleId} className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
              <Megaphone className="h-5 w-5 text-orange-600" />
              דיווח מהשטח
            </h2>
            <p className="text-xs text-slate-500">{park.name} · כמו ב-Waze</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-5 overflow-y-auto px-5 py-4">
            <section>
              <h3 className="mb-2 text-sm font-extrabold text-slate-800">
                1. מה רמת העומס כרגע בגינה?
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {PARK_CROWD_LEVELS.map((level) => {
                  const active = crowdLevel === level.id
                  return (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => setCrowdLevel(level.id)}
                      className={`rounded-2xl border-2 px-3 py-3 text-center transition active:scale-[0.98] ${
                        active
                          ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="text-2xl">{level.emoji}</span>
                      <p className="mt-1 text-sm font-bold text-slate-900">{level.label}</p>
                      <p className="text-[10px] text-slate-500">{level.hint}</p>
                    </button>
                  )
                })}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-extrabold text-slate-800">
                2. התראות מיוחדות (בחירה מרובה)
              </h3>
              <div className="space-y-2">
                {PARK_REPORT_MODAL_ALERTS.map((id) => {
                  const meta = PARK_ALERT_TYPES[id]
                  if (!meta) return null
                  const active = alerts.includes(id)
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleAlert(id)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-right transition ${
                        active
                          ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-200'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xl">{meta.emoji}</span>
                      <span className="flex-1 text-sm font-semibold text-slate-800">
                        {meta.modalLabel}
                      </span>
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-md border text-[10px] font-bold ${
                          active
                            ? 'border-orange-500 bg-orange-500 text-white'
                            : 'border-slate-300 text-transparent'
                        }`}
                      >
                        ✓
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>

            <section>
              <label className="block">
                <span className="mb-1.5 block text-sm font-extrabold text-slate-800">
                  3. הערה קצרה (אופציונלי)
                </span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  maxLength={160}
                  placeholder="הערה קצרה למבקרים..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                />
              </label>
            </section>

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
              className="w-full rounded-2xl bg-orange-600 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-60"
            >
              {saving ? 'שולח...' : 'שלח דיווח לקהילה'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
