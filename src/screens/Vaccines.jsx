import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  Bell,
  BellOff,
  Calendar,
  Camera,
  Check,
  ChevronDown,
  Pencil,
  Phone,
} from 'lucide-react'
import BookAppointmentModal from '../components/BookAppointmentModal'
import EditPetModal from '../components/EditPetModal'
import PetImage from '../components/PetImage'
import UpdateVaccineModal from '../components/UpdateVaccineModal'
import {
  getProtocolsForPet,
  isProtocolVaccine,
  resolveProtocolRows,
} from '../data/vaccineProtocols'
import { updateVaccineRecord } from '../services/petService'
import {
  getNotificationPermission,
  markAppointmentBooked,
  markTreatmentCompleted,
  muteTreatmentReminders,
  requestNotificationPermission,
  syncRemindersFromProtocolRows,
} from '../services/notificationService'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatShortDate(iso) {
  if (!iso) return ''
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}`
}

function tableStatusBadge(row) {
  const appointmentAt = row.record?.appointmentAt
  if (appointmentAt) {
    return {
      label: `נקבע תור ל-${formatShortDate(appointmentAt)}`,
      className: 'bg-sky-100 text-sky-800',
      emoji: '🔵',
    }
  }
  if (row.record?.remindersMuted) {
    return {
      label: 'תזכורות מושתקות',
      className: 'bg-slate-100 text-slate-600',
      emoji: '🔕',
    }
  }
  const status = row.status
  if (status.tone === 'valid') {
    return { label: 'בתוקף', className: 'bg-emerald-100 text-emerald-700', emoji: '🟢' }
  }
  if (status.tone === 'not_required') {
    return { label: 'לא נדרש באזור', className: 'bg-sky-100 text-sky-800', emoji: '' }
  }
  if (status.tone === 'optional') {
    return { label: 'לא בוצע', className: 'bg-violet-100 text-violet-800', emoji: '' }
  }
  if (status.tone === 'missing') {
    return { label: 'נדרש חידוש', className: 'bg-amber-100 text-amber-800', emoji: '🟡' }
  }
  return { label: 'נדרש חידוש', className: 'bg-amber-100 text-amber-800', emoji: '🟡' }
}

function rowMeta(pet, row, ownerAddress) {
  return {
    petName: pet.name,
    petType: pet.type,
    birthDate: pet.birthDate,
    ageYears: pet.ageYears,
    ownerAddress,
    recordId: row.record?.id,
    forceSpirocerca: row.record?.forceSpirocerca,
    fleaProductKey: row.record?.fleaProductKey,
    customDueAt: row.record?.customDueAt,
    catRabiesMonths: row.record?.catRabiesMonths,
    administeredAt: row.administeredAt,
    dueAt: row.dueAt,
    treatmentName:
      row.productLabel || row.displayName || row.protocol.name,
  }
}

function TreatmentActionsMenu({
  row,
  busy,
  onComplete,
  onBook,
  onMute,
  onEdit,
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    function onDoc(e) {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const canRemind = Boolean(row.dueAt) && !row.notRequired && !row.optionalEmpty

  return (
    <div className="relative flex items-center gap-1" ref={ref}>
      <button
        type="button"
        onClick={() => onEdit()}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700 transition hover:bg-brand-100"
        aria-label={`עדכון ${row.protocol.name}`}
        title="עדכן"
        disabled={busy}
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className="inline-flex h-8 items-center gap-0.5 rounded-lg bg-slate-50 px-1.5 text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
        aria-haspopup="menu"
        aria-expanded={open}
        title="פעולות תזכורת"
      >
        <Bell className="h-3.5 w-3.5" />
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-right shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-xs font-semibold text-slate-800 hover:bg-emerald-50"
            onClick={() => {
              setOpen(false)
              onComplete()
            }}
          >
            <Check className="h-3.5 w-3.5 text-emerald-600" />
            ✔️ בוצע היום / עדכן ביצוע
          </button>
          {canRemind && (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-xs font-semibold text-slate-800 hover:bg-sky-50"
              onClick={() => {
                setOpen(false)
                onBook()
              }}
            >
              <Calendar className="h-3.5 w-3.5 text-sky-600" />
              📅 קבעתי תור
            </button>
          )}
          {canRemind && (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              onClick={() => {
                setOpen(false)
                onMute()
              }}
            >
              <BellOff className="h-3.5 w-3.5 text-slate-500" />
              🔕 השתק תזכורות לסבב זה
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function AppointmentDateModal({ open, treatmentName, onClose, onConfirm, saving }) {
  const titleId = useId()
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!open) {
      setVisible(false)
      return
    }
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setDate(tomorrow.toISOString().slice(0, 10))
    setTime('09:00')
    requestAnimationFrame(() => setVisible(true))
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="סגירה"
        className={`absolute inset-0 bg-slate-900/50 transition-opacity ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        dir="rtl"
        className={`relative z-10 w-full max-w-sm rounded-t-3xl bg-white p-5 shadow-2xl transition-all sm:rounded-3xl ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
        }`}
      >
        <h2 id={titleId} className="text-lg font-extrabold text-slate-900">
          קביעת תור
        </h2>
        <p className="mt-1 text-xs text-slate-500">{treatmentName}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block text-xs font-bold text-slate-700">
            תאריך
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
            />
          </label>
          <label className="block text-xs font-bold text-slate-700">
            שעה
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
            />
          </label>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          תזכורות הביניים יושתקו; תישלח התראה בבוקר יום התור.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600"
            disabled={saving}
          >
            ביטול
          </button>
          <button
            type="button"
            disabled={saving || !date}
            onClick={() => onConfirm(`${date}T${time || '09:00'}`)}
            className="flex-1 rounded-xl bg-sky-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? 'שומר...' : 'שמירת תור'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Vaccines({
  pet,
  vaccines,
  ownerProfile = null,
  onBack,
  onRefresh,
  onUpdatePet,
  savingPet = false,
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [scanMode, setScanMode] = useState(false)
  const [activeRow, setActiveRow] = useState(null)
  const [saving, setSaving] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [trackCatRabies, setTrackCatRabies] = useState(false)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [apptRow, setApptRow] = useState(null)
  const [permission, setPermission] = useState(() => getNotificationPermission())
  const [toast, setToast] = useState('')

  const ownerAddress = ownerProfile?.address ?? ''
  const isCat = pet?.type === 'cat'

  const hasCatRabiesHistory = useMemo(
    () =>
      isCat &&
      vaccines.some(
        (v) =>
          v.protocolKey === 'rabies' ||
          v.name === 'כלבת' ||
          v.nameEn === 'Rabies',
      ),
    [isCat, vaccines],
  )

  useEffect(() => {
    if (hasCatRabiesHistory) setTrackCatRabies(true)
  }, [hasCatRabiesHistory])

  const includeOptionalRabies = !isCat || trackCatRabies || hasCatRabiesHistory

  const protocolOptions = useMemo(
    () => getProtocolsForPet(pet, { includeOptionalRabies: true }),
    [pet],
  )

  const protocolRows = useMemo(
    () =>
      resolveProtocolRows(pet, vaccines, {
        ownerAddress,
        includeOptionalRabies,
      }),
    [pet, vaccines, ownerAddress, includeOptionalRabies],
  )

  const extraVaccines = useMemo(
    () => vaccines.filter((v) => !isProtocolVaccine(v, pet)),
    [vaccines, pet],
  )

  useEffect(() => {
    syncRemindersFromProtocolRows(pet, protocolRows)
  }, [pet, protocolRows])

  useEffect(() => {
    let hideTimer
    function onReminder(e) {
      const msg = e.detail?.message
      if (!msg) return
      setToast(msg)
      clearTimeout(hideTimer)
      hideTimer = setTimeout(() => setToast(''), 6000)
    }
    window.addEventListener('vetbook:reminder', onReminder)
    return () => {
      window.removeEventListener('vetbook:reminder', onReminder)
      clearTimeout(hideTimer)
    }
  }, [])

  function openUpdate(row = null, asScan = false) {
    setActiveRow(row)
    setScanMode(asScan)
    setModalOpen(true)
  }

  async function handleVaccineSubmit(data) {
    setSaving(true)
    try {
      if (data.protocolKey === 'rabies' && isCat) setTrackCatRabies(true)
      await updateVaccineRecord(pet.id, data)
      setModalOpen(false)
      setActiveRow(null)
      await onRefresh?.()
    } finally {
      setSaving(false)
    }
  }

  async function handleEditPet(updatedData) {
    const updated = await onUpdatePet?.(pet.id, updatedData)
    if (updated) setEditOpen(false)
  }

  async function handleEnableNotifications() {
    const result = await requestNotificationPermission()
    setPermission(result)
    if (result === 'granted') {
      syncRemindersFromProtocolRows(pet, protocolRows)
      setToast('התראות דפדפן הופעלו — תזכורות חיסונים מתוזמנות')
    }
  }

  async function handleComplete(row) {
    setActionBusy(true)
    try {
      await markTreatmentCompleted(
        pet.id,
        row.protocol.key,
        new Date().toISOString().slice(0, 10),
        rowMeta(pet, row, ownerAddress),
      )
      setToast(`עודכן ביצוע: ${row.protocol.name} — הסטטוס בתוקף והתזכורות חודשו`)
      await onRefresh?.()
    } finally {
      setActionBusy(false)
    }
  }

  async function handleBookConfirm(isoLocal) {
    if (!apptRow) return
    setActionBusy(true)
    try {
      await markAppointmentBooked(
        pet.id,
        apptRow.protocol.key,
        isoLocal,
        rowMeta(pet, apptRow, ownerAddress),
      )
      setToast(`נקבע תור ל-${formatShortDate(isoLocal)} · תזכורות ביניים הושתקו`)
      setApptRow(null)
      await onRefresh?.()
    } finally {
      setActionBusy(false)
    }
  }

  async function handleMute(row) {
    setActionBusy(true)
    try {
      await muteTreatmentReminders(pet.id, row.protocol.key, {
        ...rowMeta(pet, row, ownerAddress),
        syncRecord: Boolean(row.record),
      })
      setToast(`תזכורות הושתקו לסבב הנוכחי של ${row.protocol.name}`)
      await onRefresh?.()
    } finally {
      setActionBusy(false)
    }
  }

  const showPermissionBanner =
    permission !== 'granted' && typeof Notification !== 'undefined'

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <header className="rounded-2xl bg-white p-3 shadow-soft ring-1 ring-slate-100">
        <button
          type="button"
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 transition hover:text-brand-800"
        >
          <ArrowRight className="h-4 w-4" />
          חזרה לראשי
        </button>

        <div className="flex items-center gap-3">
          <PetImage
            src={pet.image}
            alt={pet.name}
            className="h-12 w-12 aspect-square rounded-full border border-emerald-500"
            iconClassName="h-5 w-5"
            fallbackClassName="bg-emerald-50 text-emerald-700"
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-extrabold leading-snug text-slate-900">
              פנקס החיסונים של {pet.name}
            </h1>
            <p className="mt-0.5 truncate text-[11px] text-slate-500">
              {pet.breed || pet.speciesHe}
              {' · '}
              שבב <span dir="ltr">{pet.chip || '—'}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100"
            aria-label="עריכת פרטי החיה"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      </header>

      {showPermissionBanner && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <Bell className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold text-amber-950">
              הפעלת התראות לתזכורות חיסונים
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-amber-900/80">
              קבלו תזכורות אוטומטיות 14, 5 ו־2 ימים לפני מועד היעד, וביום החיסון עצמו.
            </p>
            <button
              type="button"
              onClick={handleEnableNotifications}
              className="mt-2 rounded-xl bg-amber-700 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-amber-800"
            >
              אפשר התראות בדפדפן
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 px-3 py-2.5 text-xs font-semibold text-brand-900">
          {toast}
        </div>
      )}

      <button
        type="button"
        onClick={() => openUpdate(null, true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-700 px-4 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-brand-800"
      >
        <Camera className="h-4 w-4" />
        העלאת צילום / סריקת פנקס חיסונים
      </button>

      {isCat && !includeOptionalRabies && (
        <button
          type="button"
          onClick={() => setTrackCatRabies(true)}
          className="w-full rounded-2xl border border-dashed border-violet-300 bg-violet-50 px-3 py-2.5 text-xs font-bold text-violet-800"
        >
          + הוסף מעקב כלבת (חיסון רשות · אופציונלי)
        </button>
      )}

      {isCat && includeOptionalRabies && !hasCatRabiesHistory && (
        <button
          type="button"
          onClick={() => setTrackCatRabies(false)}
          className="text-xs font-semibold text-slate-500 underline"
        >
          הסתר שורת כלבת (רשות)
        </button>
      )}

      <section className="overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-slate-100">
        <div className="border-b border-slate-100 px-3 py-2.5">
          <h2 className="text-sm font-bold text-slate-800">
            {isCat ? 'פרוטוקול חתולים' : 'פרוטוקול כלבים'}
          </h2>
          <p className="mt-0.5 text-[10px] text-slate-400">
            תזכורות אוטומטיות לחיסונים וטיפולים מניעתיים ·{' '}
            {isCat
              ? 'מרובע, פרעושים/קרציות, תילוע וכלבת (רשות)'
              : 'משושה, כלבת, תולעת הפארק, תילוע ופרעושים/קרציות'}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[22rem] border-collapse text-right text-xs">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold text-slate-500">
                <th className="px-2.5 py-2 font-bold">שם החיסון / טיפול</th>
                <th className="px-2.5 py-2 font-bold">תאריך ביצוע אחרון</th>
                <th className="px-2.5 py-2 font-bold">תאריך יעד הבא</th>
                <th className="px-2 py-2 font-bold">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {protocolRows.map((row) => {
                const badge = tableStatusBadge(row)
                const title =
                  row.protocol.key === 'flea_tick' && row.productLabel
                    ? row.productLabel
                    : row.displayName || row.protocol.name

                return (
                  <tr
                    key={row.protocol.key}
                    className="border-t border-slate-100 align-middle"
                  >
                    <td className="px-2.5 py-3">
                      <p className="font-bold text-slate-900">{title}</p>
                      <p className="text-[10px] text-slate-400" dir="ltr">
                        {row.protocol.nameEn}
                      </p>
                      {row.protocol.optionalBadge ? (
                        <p className="mt-1 inline-flex rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold text-violet-800">
                          {row.protocol.optionalBadge}
                        </p>
                      ) : row.stageLabel ? (
                        <p className="mt-1 inline-flex rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-800">
                          {row.stageLabel}
                        </p>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-2.5 py-3 font-semibold text-slate-700">
                      {formatDate(row.administeredAt)}
                    </td>
                    <td className="px-2.5 py-3">
                      <p className="whitespace-nowrap font-semibold text-slate-700">
                        {(row.notRequired && !row.record) || row.optionalEmpty
                          ? '—'
                          : formatDate(row.dueAt)}
                      </p>
                      <span
                        className={`mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${badge.className}`}
                      >
                        {badge.emoji ? <span aria-hidden>{badge.emoji}</span> : null}
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <TreatmentActionsMenu
                        row={row}
                        busy={actionBusy}
                        onEdit={() => openUpdate(row, false)}
                        onComplete={() => handleComplete(row)}
                        onBook={() => setApptRow(row)}
                        onMute={() => handleMute(row)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <button
        type="button"
        onClick={() => setBookingOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-soft transition hover:bg-emerald-700"
      >
        <Calendar className="h-4 w-4" />
        קביעת תור לחיסון / ביקורת
        <Phone className="h-4 w-4 opacity-90" />
      </button>

      {extraVaccines.length > 0 && (
        <section className="rounded-2xl bg-white p-3 shadow-soft ring-1 ring-slate-100">
          <h3 className="mb-2 text-xs font-bold text-slate-700">רשומות נוספות</h3>
          <ul className="space-y-1.5">
            {extraVaccines.map((vax) => (
              <li key={vax.id} className="text-xs text-slate-600">
                <span className="font-bold text-slate-800">{vax.name}</span>
                {' · '}
                {formatDate(vax.administeredAt)}
              </li>
            ))}
          </ul>
        </section>
      )}

      <UpdateVaccineModal
        open={modalOpen}
        pet={pet}
        vaccines={vaccines}
        ownerAddress={ownerAddress}
        protocolOptions={protocolOptions}
        initialRow={activeRow}
        scanMode={scanMode}
        saving={saving}
        onClose={() => {
          if (!saving) {
            setModalOpen(false)
            setActiveRow(null)
          }
        }}
        onSubmit={handleVaccineSubmit}
      />

      <AppointmentDateModal
        open={Boolean(apptRow)}
        treatmentName={
          apptRow
            ? apptRow.productLabel || apptRow.displayName || apptRow.protocol.name
            : ''
        }
        saving={actionBusy}
        onClose={() => !actionBusy && setApptRow(null)}
        onConfirm={handleBookConfirm}
      />

      <BookAppointmentModal
        open={bookingOpen}
        pet={pet}
        ownerAddress={ownerAddress}
        primaryClinicName="מרפאת וט-קר, תל אביב"
        onClose={() => setBookingOpen(false)}
      />

      <EditPetModal
        open={editOpen}
        pet={pet}
        onClose={() => !savingPet && setEditOpen(false)}
        onSubmit={handleEditPet}
        saving={savingPet}
      />
    </div>
  )
}
