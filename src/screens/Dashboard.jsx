import { useState } from 'react'
import {
  Pencil,
  Plus,
  ShieldCheck,
  Siren,
  Stethoscope,
  TreePine,
  UserRound,
  UtensilsCrossed,
} from 'lucide-react'
import AddPetModal from '../components/AddPetModal'
import EditPetModal from '../components/EditPetModal'
import PetImage from '../components/PetImage'

function daysUntil(dateStr) {
  if (!dateStr) return null
  const due = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24))
}

function nextUrgentVaccine(vaccines = []) {
  const upcoming = vaccines
    .filter((v) => v.dueAt)
    .map((v) => ({ ...v, days: daysUntil(v.dueAt) }))
    .filter((v) => v.days !== null && v.days <= 60)
    .sort((a, b) => a.days - b.days)
  return upcoming[0] ?? null
}

function vaccineChip(vaccines) {
  const next = nextUrgentVaccine(vaccines)
  if (!next) {
    return {
      label: 'אין קרוב',
      className: 'bg-slate-100 text-slate-500',
    }
  }
  if (next.days <= 0) {
    return {
      label: `${next.name} · נדרש חידוש`,
      className: 'bg-red-100 text-red-700',
    }
  }
  return {
    label: `${next.name} · ${next.days} ימים`,
    className: 'bg-amber-100 text-amber-800',
  }
}

function welcomeHeading(ownerName) {
  if (ownerName) return `שלום, ${ownerName}`
  return 'שלום'
}

export default function Dashboard({
  pets,
  activePet,
  vaccinesByPetId = {},
  ownerProfile,
  onSelectPet,
  onNavigate,
  onAddPet,
  onUpdatePet,
  onOpenProfile,
  savingPet = false,
}) {
  const [addOpen, setAddOpen] = useState(false)
  const [editingPet, setEditingPet] = useState(null)
  const ownerName = ownerProfile?.fullName?.trim() || ''
  const ownerPhoto = ownerProfile?.photoURL || ownerProfile?.avatar || ''

  const actions = [
    {
      id: 'vaccines',
      label: 'פנקס חיסונים',
      desc: 'סטטוס וחידושים',
      icon: ShieldCheck,
      tone: 'bg-teal-50 text-teal-700',
    },
    {
      id: 'triage',
      label: 'טריאז׳ AI',
      desc: 'הערכת תסמינים',
      icon: Stethoscope,
      tone: 'bg-sky-50 text-sky-700',
    },
    {
      id: 'food',
      label: 'בדיקת מזון',
      desc: 'רעיל או בטוח?',
      icon: UtensilsCrossed,
      tone: 'bg-amber-50 text-amber-700',
    },
    {
      id: 'emergency',
      label: 'חירום 24/7',
      desc: 'התקשרו עכשיו',
      icon: Siren,
      tone: 'bg-red-50 text-red-600',
    },
    {
      id: 'dog-parks',
      label: 'גינות כלבים',
      desc: 'צ׳ק-אין חברתי ב-GPS',
      icon: TreePine,
      tone: 'bg-emerald-50 text-emerald-700',
    },
  ]

  async function handleAddPet(petData) {
    const created = await onAddPet(petData)
    if (created) setAddOpen(false)
  }

  async function handleEditPet(updatedData) {
    if (!editingPet) return
    const updated = await onUpdatePet(editingPet.id, updatedData)
    if (updated) setEditingPet(null)
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3 pt-1">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <img
              src="/app-icon.png"
              alt=""
              className="h-8 w-8 rounded-full bg-white object-contain ring-1 ring-brand-100"
            />
            <p className="text-sm font-medium text-brand-600">וט-בוק</p>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {welcomeHeading(ownerName)}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            מעקב בריאות דיגיטלי לחיות המחמד שלכם
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex shrink-0 flex-col items-center gap-1 rounded-2xl border border-slate-200 bg-white px-2.5 py-2 text-slate-700 shadow-sm transition hover:border-brand-300 hover:text-brand-700"
          aria-label="פרופיל בעלים"
        >
          {ownerPhoto ? (
            <img
              src={ownerPhoto}
              alt={ownerName || 'פרופיל'}
              className="h-10 w-10 rounded-full border border-emerald-500 object-cover"
            />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500 bg-brand-50 text-brand-700">
              <UserRound className="h-4 w-4" />
            </span>
          )}
          <span className="text-[10px] font-bold">פרופיל</span>
        </button>
      </header>

      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700">החיות שלי</h2>
          <span className="text-xs text-slate-400">{pets.length} ברשימה</span>
        </div>

        {pets.length === 0 ? (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex w-full flex-col items-center gap-3 rounded-2xl border border-dashed border-brand-300 bg-white p-8 text-center shadow-soft"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <Plus className="h-7 w-7" />
            </span>
            <div>
              <p className="font-bold text-slate-900">עדיין אין חיות ברשימה</p>
              <p className="mt-1 text-sm text-slate-500">לחצו להוספת חיה ראשונה</p>
            </div>
          </button>
        ) : (
          <ul className="grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-4">
            {pets.map((pet) => {
              const selected = pet.id === activePet?.id
              const chip = vaccineChip(vaccinesByPetId[pet.id] ?? [])
              return (
                <li key={pet.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectPet(pet.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onSelectPet(pet.id)
                      }
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl border bg-white p-3 text-right shadow-soft transition ${
                      selected
                        ? 'border-brand-500 ring-2 ring-brand-100'
                        : 'border-slate-100 hover:border-brand-200'
                    }`}
                  >
                    <PetImage
                      src={pet.image || pet.photoURL}
                      alt={pet.name}
                      className="h-14 w-14 shrink-0 rounded-2xl"
                      iconClassName="h-6 w-6"
                      fallbackClassName="bg-brand-100 text-brand-700"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold text-slate-900">
                            {pet.name}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {pet.speciesHe}
                            {pet.breed ? ` · ${pet.breed}` : ''}
                            {pet.ageYears != null ? ` · ${pet.ageYears} שנים` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectPet(pet.id)
                            setEditingPet(pet)
                          }}
                          className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-slate-50 px-2 py-1.5 text-[11px] font-bold text-slate-600 transition hover:bg-brand-50 hover:text-brand-700"
                          aria-label={`עריכת פרטי ${pet.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          עריכה
                        </button>
                      </div>
                      <p
                        className={`mt-2 inline-flex max-w-full truncate rounded-lg px-2 py-0.5 text-[11px] font-semibold ${chip.className}`}
                      >
                        {chip.label}
                      </p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-brand-400 bg-brand-50/80 px-3 py-3 text-brand-800 transition hover:bg-brand-100"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm font-bold">+ הוסף חיה</span>
        </button>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-bold text-slate-700">פעולות מהירות</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {actions.map(({ id, label, desc, icon: Icon, tone }) => (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className="rounded-2xl bg-white p-4 text-right shadow-soft ring-1 ring-slate-100 transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl ${tone}`}>
                <Icon className="h-5 w-5" />
              </span>
              <p className="text-sm font-bold text-slate-900">{label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
            </button>
          ))}
        </div>
      </section>

      <AddPetModal
        open={addOpen}
        onClose={() => !savingPet && setAddOpen(false)}
        onSubmit={handleAddPet}
        saving={savingPet}
      />

      <EditPetModal
        open={Boolean(editingPet)}
        pet={editingPet}
        onClose={() => !savingPet && setEditingPet(null)}
        onSubmit={handleEditPet}
        saving={savingPet}
      />
    </div>
  )
}
