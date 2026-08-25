import { useEffect, useState } from 'react'
import { AlertOctagon, CheckCircle2, Search, Skull } from 'lucide-react'
import { getToxicFoods } from '../services/petService'

export default function FoodChecker() {
  const [tab, setTab] = useState('danger')
  const [query, setQuery] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    const timer = setTimeout(async () => {
      const data = await getToxicFoods({ category: tab, query })
      if (alive) {
        setItems(data)
        setLoading(false)
      }
    }, 180)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [tab, query])

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-medium text-brand-600">בטיחות מזון</p>
        <h1 className="text-2xl font-extrabold text-slate-900">בדיקת מזון ורעלים</h1>
        <p className="mt-1 text-sm text-slate-500">
          חיפוש מיידי – האם בטוח לחיות מחמד?
        </p>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חפשו מזון או חומר..."
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pr-10 pl-4 text-sm shadow-soft outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-200/60 p-1">
        <button
          type="button"
          onClick={() => setTab('danger')}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition ${
            tab === 'danger'
              ? 'bg-red-600 text-white shadow'
              : 'text-slate-600 hover:bg-white/70'
          }`}
        >
          <Skull className="h-4 w-4" />
          רעיל / מסוכן
        </button>
        <button
          type="button"
          onClick={() => setTab('safe')}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition ${
            tab === 'safe'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-600 hover:bg-white/70'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          בטוח למאכל
        </button>
      </div>

      <div className="space-y-3">
        {loading && (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-400 shadow-soft">
            טוען...
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-soft">
            לא נמצאו תוצאות לחיפוש
          </div>
        )}
        {!loading &&
          items.map((item) => {
            const danger = item.category === 'danger'
            return (
              <article
                key={item.id}
                className={`rounded-2xl border p-4 shadow-soft transition ${
                  danger
                    ? 'border-red-100 bg-white'
                    : 'border-emerald-100 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                        danger ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {danger ? (
                        <AlertOctagon className="h-5 w-5" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5" />
                      )}
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-900">{item.name}</h3>
                      <p
                        className={`mt-1 inline-flex rounded-lg px-2 py-0.5 text-[11px] font-bold ${
                          danger
                            ? 'bg-red-100 text-red-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        חומרת סיכון: {item.severity}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
                  <span className="font-semibold text-slate-700">הערה קלינית: </span>
                  {item.note}
                </p>
                <p className="mt-2 text-[11px] text-slate-400">
                  רלוונטי ל
                  {item.species.includes('dog') && item.species.includes('cat')
                    ? 'כלבים וחתולים'
                    : item.species.includes('dog')
                      ? 'כלבים'
                      : 'חתולים'}
                </p>
              </article>
            )
          })}
      </div>
    </div>
  )
}
