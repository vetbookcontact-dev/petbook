import { AlertTriangle, Bot, PawPrint, PhoneCall, ShieldCheck } from 'lucide-react'

const tabs = [
  { id: 'home', label: 'ראשי', icon: PawPrint },
  { id: 'vaccines', label: 'חיסונים', icon: ShieldCheck },
  { id: 'triage', label: 'טריאז׳ AI', icon: Bot },
  { id: 'food', label: 'מזון', icon: AlertTriangle },
  { id: 'emergency', label: 'חירום', icon: PhoneCall, danger: true },
]

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 mx-auto max-w-md border-t border-slate-200/80 bg-white/95 backdrop-blur-md safe-bottom shadow-[0_-8px_30px_rgba(15,23,42,0.06)]">
      <ul className="grid grid-cols-5 gap-0 px-1 pt-2 pb-1">
        {tabs.map(({ id, label, icon: Icon, danger }) => {
          const isActive = active === id
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onChange(id)}
                className={`flex w-full flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 transition-all duration-200 ${
                  danger
                    ? isActive
                      ? 'text-red-600'
                      : 'text-red-500'
                    : isActive
                      ? 'text-brand-700'
                      : 'text-slate-400'
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-2xl transition-all duration-200 ${
                    danger
                      ? isActive
                        ? 'bg-red-100 scale-105'
                        : 'bg-red-50'
                      : isActive
                        ? 'bg-brand-100 scale-105'
                        : 'bg-transparent'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${danger ? 'stroke-[2.25]' : ''}`}
                    aria-hidden
                  />
                </span>
                <span className={`text-[10px] font-semibold leading-tight ${isActive ? 'opacity-100' : 'opacity-80'}`}>
                  {label}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
