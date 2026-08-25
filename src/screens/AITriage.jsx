import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Bot,
  PhoneCall,
  SendHorizontal,
  Siren,
  Stethoscope,
} from 'lucide-react'
import { assessSymptoms } from '../services/petService'
import { triageQuickSymptoms } from '../data/mockData'
import VetConsultView from '../components/VetConsultView'

const DISCLAIMER =
  'מערכת זו אינה מחליפה בדיקה וטרינרית. במקרה חירום יש לפנות מיד למרפאה'

const urgencyStyles = {
  red: 'border-red-300 bg-red-50 text-red-900',
  orange: 'border-orange-200 bg-orange-50 text-orange-900',
  amber: 'border-amber-200 bg-amber-50 text-amber-900',
  teal: 'border-teal-200 bg-teal-50 text-teal-900',
}

export default function AITriage({ pet, ownerProfile, onGoEmergency }) {
  const [mode, setMode] = useState('ai')
  const species = pet?.type === 'cat' ? 'cat' : 'dog'
  const chips = useMemo(
    () => triageQuickSymptoms[species] || triageQuickSymptoms.dog,
    [species],
  )

  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'bot',
      text: `שלום! אני מנוע הטריאז׳ הקליני של וט-בוק. ספרו מה מטריד את ${pet?.name || 'החיה'} — אזהיר מיד במצבי חירום לפי פרוטוקולים וטרינריים.`,
    },
  ])
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  async function send(text) {
    const content = text.trim()
    if (!content || busy) return

    setInput('')
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: content },
    ])
    setBusy(true)

    try {
      const result = await assessSymptoms({
        petName: pet?.name,
        message: content,
        species,
      })
      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          role: 'bot',
          text: result.advice,
          urgency: result.urgency,
          color: result.color,
          banner: result.banner,
          ctaLabel: result.ctaLabel,
          isEmergency: result.isEmergency || result.color === 'red',
          isHighUrgency:
            result.isHighUrgency || result.isEmergency || result.color === 'red',
          category: result.category,
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'bot',
          text: 'אירעה שגיאה זמנית. נסו שוב או פנו ישירות למרפאת חירום.',
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-7.5rem)] flex-col">
      <header className="mb-3">
        <p className="text-sm font-medium text-brand-600">טריאז׳ חירום קליני</p>
        <h1 className="text-2xl font-extrabold text-slate-900">הערכת תסמינים</h1>
        <p className="mt-1 text-sm text-slate-500">
          עבור {pet?.name}
          {pet?.speciesHe ? ` · ${pet.speciesHe}` : ''}
        </p>
      </header>

      <div
        role="tablist"
        aria-label="מצב טריאז׳"
        className="mb-3 grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'ai'}
          onClick={() => setMode('ai')}
          className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-[11px] font-extrabold transition sm:text-xs ${
            mode === 'ai'
              ? 'bg-white text-brand-800 shadow-sm ring-1 ring-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bot className="h-3.5 w-3.5 shrink-0" />
          🤖 טריאז׳ מהיר AI
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'vet'}
          onClick={() => setMode('vet')}
          className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-[11px] font-extrabold transition sm:text-xs ${
            mode === 'vet'
              ? 'bg-white text-brand-800 shadow-sm ring-1 ring-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Stethoscope className="h-3.5 w-3.5 shrink-0" />
          👨‍⚕️ התייעצות עם וטרינר כונן
        </button>
      </div>

      <div className="mb-3 flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p>
          <span className="font-bold">הצהרה חשובה: </span>
          {DISCLAIMER}
        </p>
      </div>

      {mode === 'vet' ? (
        <VetConsultView
          pet={pet}
          ownerProfile={ownerProfile}
          onGoEmergency={onGoEmergency}
        />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            {chips.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => send(label)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl bg-white p-3 shadow-soft ring-1 ring-slate-100">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'rounded-br-md bg-brand-700 text-white'
                      : 'rounded-bl-md bg-slate-100 text-slate-800'
                  }`}
                >
                  {msg.role === 'bot' && (
                    <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-brand-700">
                      <Bot className="h-3.5 w-3.5" />
                      וט-בוק AI · טריאז׳ קליני
                    </div>
                  )}
                  {msg.urgency && (
                    <div
                      className={`mb-2 rounded-xl border px-2.5 py-1.5 text-xs font-extrabold ${urgencyStyles[msg.color] || urgencyStyles.teal}`}
                    >
                      {msg.urgency.startsWith('🚨')
                        ? msg.urgency
                        : `רמת דחיפות: ${msg.urgency}`}
                    </div>
                  )}
                  {msg.banner && (
                    <div className="mb-2 rounded-xl border border-red-400 bg-red-600 px-3 py-2 text-[11px] font-bold leading-relaxed text-white">
                      {msg.banner}
                    </div>
                  )}
                  <p>{msg.text}</p>
                  {(msg.isEmergency || msg.isHighUrgency) && (
                    <div className="mt-3 space-y-2 rounded-2xl border border-red-300 bg-red-600 p-3 text-white shadow-sm">
                      <div className="flex items-start gap-2">
                        <Siren className="mt-0.5 h-5 w-5 shrink-0" />
                        <div>
                          <p className="text-sm font-extrabold">מרכז חירום 24/7</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-red-50">
                            מעבר מיידי למדריך מרפאות החירום הקרובות.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={onGoEmergency}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-xs font-bold text-red-700 transition hover:bg-red-50"
                      >
                        <PhoneCall className="h-4 w-4" />
                        {msg.ctaLabel || 'חיוג מהיר למרכז חירום קרוב'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-end">
                <div className="rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 text-xs text-slate-500">
                  בודק מול מטריצת דגלי אזהרה קליניים...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="תארו את התסמינים..."
              className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              disabled={busy}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-700 text-white disabled:opacity-40"
              aria-label="שליחה"
            >
              <SendHorizontal className="h-5 w-5 scale-x-[-1]" />
            </button>
          </form>
        </>
      )}
    </div>
  )
}
