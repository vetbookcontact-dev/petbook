/**
 * Automated vaccine / treatment reminder manager.
 * Uses Web Notifications API + localStorage; in-session timers for due milestones.
 */

import { updateVaccineRecord } from './petService'

const STORAGE_KEY = 'vetbook-reminders-v1'
const MILESTONES = [14, 5, 2, 0]

/** @type {Map<string, ReturnType<typeof setTimeout>>} */
const timerMap = new Map()

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Calendar days from today until due date (YYYY-MM-DD). */
export function daysUntilDue(dueAt) {
  if (!dueAt) return null
  const due = startOfDay(new Date(`${dueAt}T12:00:00`))
  const now = startOfDay(new Date())
  return Math.round((due - now) / 86400000)
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return {
    permission: typeof Notification !== 'undefined' ? Notification.permission : 'default',
    byPet: {},
  }
}

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function reminderKey(petId, treatmentKey, milestone) {
  return `${petId}::${treatmentKey}::${milestone}`
}

function clearTimer(id) {
  const t = timerMap.get(id)
  if (t) clearTimeout(t)
  timerMap.delete(id)
}

function clearTreatmentTimers(petId, treatmentKey) {
  for (const id of [...timerMap.keys()]) {
    if (id.startsWith(`${petId}::${treatmentKey}::`)) clearTimer(id)
  }
}

function buildMessage(milestone, treatmentName, petName) {
  if (milestone === 14) {
    return `תזכורת: בעוד שבועיים מועד חיסון/טיפול ${treatmentName} עבור ${petName}.`
  }
  if (milestone === 5) {
    return `מתקרב מועד החידוש: נותרו 5 ימים לחיסון ${treatmentName} של ${petName}. מומלץ לקבוע תור!`
  }
  if (milestone === 2) {
    return `תזכורת דחופה: בעוד יומיים מועד הטיפול ${treatmentName} עבור ${petName}.`
  }
  if (milestone === 'appointment') {
    return `היום נקבע תור לטיפול ${treatmentName} של ${petName}.`
  }
  return `היום! מועד החיסון/טיפול ${treatmentName} של ${petName} הגיע.`
}

/** Fire time: 09:00 local on (dueDate - daysBefore). */
function fireAtForMilestone(dueAt, daysBefore) {
  const d = new Date(`${dueAt}T09:00:00`)
  d.setDate(d.getDate() - daysBefore)
  return d
}

function fireAtMorning(isoDate) {
  const day = String(isoDate).slice(0, 10)
  return new Date(`${day}T09:00:00`)
}

function showBrowserNotification(title, body, tag) {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  try {
    const n = new Notification(title, {
      body,
      tag,
      lang: 'he',
      dir: 'rtl',
      icon: '/vite.svg',
    })
    n.onclick = () => {
      window.focus()
      n.close()
    }
  } catch {
    /* ignore unsupported */
  }
}

function markFired(petId, treatmentKey, milestone) {
  const store = loadStore()
  const slot = store.byPet[petId]?.[treatmentKey]
  if (!slot) return
  slot.fired = { ...(slot.fired || {}), [String(milestone)]: true }
  slot.updatedAt = new Date().toISOString()
  saveStore(store)
}

function armTimer(id, fireAt, onFire) {
  clearTimer(id)
  const ms = fireAt.getTime() - Date.now()
  if (ms <= 0) {
    onFire()
    return
  }
  // setTimeout max ~24.8 days; clamp and re-check later via refresh
  const MAX = 20 * 24 * 60 * 60 * 1000
  if (ms > MAX) {
    timerMap.set(
      id,
      setTimeout(() => armTimer(id, fireAt, onFire), MAX),
    )
    return
  }
  timerMap.set(
    id,
    setTimeout(() => {
      timerMap.delete(id)
      onFire()
    }, ms),
  )
}

function scheduleOne({
  petId,
  treatmentKey,
  milestone,
  fireAt,
  message,
  petName,
  treatmentName,
}) {
  const id = reminderKey(petId, treatmentKey, milestone)
  const store = loadStore()
  const slot = store.byPet[petId]?.[treatmentKey]
  if (!slot || slot.muted) return
  if (slot.fired?.[String(milestone)]) return

  const run = () => {
    markFired(petId, treatmentKey, milestone)
    showBrowserNotification('וט-בוק · תזכורת חיסון', message, id)
    window.dispatchEvent(
      new CustomEvent('vetbook:reminder', {
        detail: {
          petId,
          treatmentKey,
          milestone,
          message,
          petName,
          treatmentName,
        },
      }),
    )
  }

  armTimer(id, fireAt, run)
}

/**
 * Request browser notification permission.
 * @returns {Promise<'granted'|'denied'|'default'>}
 */
export async function requestNotificationPermission() {
  if (typeof Notification === 'undefined') {
    const store = loadStore()
    store.permission = 'denied'
    saveStore(store)
    return 'denied'
  }
  let permission = Notification.permission
  if (permission === 'default') {
    permission = await Notification.requestPermission()
  }
  const store = loadStore()
  store.permission = permission
  saveStore(store)
  return permission
}

export function getNotificationPermission() {
  if (typeof Notification !== 'undefined') {
    return Notification.permission
  }
  return loadStore().permission || 'default'
}

/**
 * Schedule 14d / 5d / 2d / due-day alerts for a pet's treatments.
 * vaccineData: { petName, treatments: [{ key, name, dueAt, muted?, appointmentAt? }] }
 */
export function schedulePetReminders(petId, vaccineData = {}) {
  if (!petId) return []

  const petName = vaccineData.petName || 'החיה'
  const treatments = vaccineData.treatments || []
  const store = loadStore()
  if (!store.byPet[petId]) store.byPet[petId] = {}

  const scheduled = []

  for (const t of treatments) {
    const treatmentKey = t.key || t.protocolKey
    if (!treatmentKey || !t.dueAt) continue
    if (t.notRequired || t.optionalEmpty) continue

    clearTreatmentTimers(petId, treatmentKey)

    const prev = store.byPet[petId][treatmentKey] || {}
    const dueChanged = prev.dueAt !== t.dueAt
    const muted = Boolean(t.muted ?? prev.muted)
    const appointmentAt = t.appointmentAt ?? prev.appointmentAt ?? null

    store.byPet[petId][treatmentKey] = {
      treatmentKey,
      treatmentName: t.name || t.treatmentName || treatmentKey,
      petName,
      dueAt: t.dueAt,
      muted,
      appointmentAt,
      fired: dueChanged ? {} : { ...(prev.fired || {}) },
      updatedAt: new Date().toISOString(),
    }

    const slot = store.byPet[petId][treatmentKey]
    const treatmentName = slot.treatmentName

    if (muted) continue

    // Appointment booked: mute intermediate 14/5/2, only morning of appointment
    if (appointmentAt) {
      const fireAt = fireAtMorning(appointmentAt)
      const message = buildMessage('appointment', treatmentName, petName)
      if (!slot.fired?.appointment) {
        scheduleOne({
          petId,
          treatmentKey,
          milestone: 'appointment',
          fireAt,
          message,
          petName,
          treatmentName,
        })
        scheduled.push({
          petId,
          treatmentKey,
          milestone: 'appointment',
          fireAt: fireAt.toISOString(),
          message,
        })
      }
      continue
    }

    for (const daysBefore of MILESTONES) {
      const fireAt = fireAtForMilestone(t.dueAt, daysBefore)
      // Skip milestones already more than 1 day past without catch-up spam
      // except fire immediately if within the same calendar day window or still upcoming
      const daysLate = (Date.now() - fireAt.getTime()) / 86400000
      if (daysLate > 1.5) {
        slot.fired[String(daysBefore)] = true
        continue
      }

      const message = buildMessage(daysBefore, treatmentName, petName)
      if (slot.fired?.[String(daysBefore)]) continue

      scheduleOne({
        petId,
        treatmentKey,
        milestone: daysBefore,
        fireAt,
        message,
        petName,
        treatmentName,
      })
      scheduled.push({
        petId,
        treatmentKey,
        milestone: daysBefore,
        fireAt: fireAt.toISOString(),
        message,
        daysRemaining: daysUntilDue(t.dueAt),
      })
    }
  }

  saveStore(store)
  return scheduled
}

/**
 * Mark treatment done today (or given date): renew cycle, cancel current reminders.
 */
export async function markTreatmentCompleted(
  petId,
  treatmentKey,
  completedDate = todayIso(),
  meta = {},
) {
  clearTreatmentTimers(petId, treatmentKey)

  const store = loadStore()
  if (store.byPet[petId]?.[treatmentKey]) {
    store.byPet[petId][treatmentKey] = {
      ...store.byPet[petId][treatmentKey],
      muted: false,
      appointmentAt: null,
      fired: {},
      dueAt: null,
      updatedAt: new Date().toISOString(),
    }
    saveStore(store)
  }

  const entry = await updateVaccineRecord(petId, {
    protocolKey: treatmentKey,
    administeredAt: completedDate,
    petType: meta.petType,
    birthDate: meta.birthDate,
    ageYears: meta.ageYears,
    ownerAddress: meta.ownerAddress,
    id: meta.recordId,
    forceSpirocerca: meta.forceSpirocerca,
    fleaProductKey: meta.fleaProductKey,
    customDueAt: meta.customDueAt,
    catRabiesMonths: meta.catRabiesMonths,
    appointmentAt: null,
    remindersMuted: false,
  })

  if (entry?.dueAt && meta.petName) {
    schedulePetReminders(petId, {
      petName: meta.petName,
      treatments: [
        {
          key: treatmentKey,
          name: entry.displayName || entry.name,
          dueAt: entry.dueAt,
          muted: false,
          appointmentAt: null,
        },
      ],
    })
  }

  return entry
}

/**
 * Book appointment: blue status, mute 14/5/2, alert on appointment morning.
 */
export async function markAppointmentBooked(
  petId,
  treatmentKey,
  appointmentDate,
  meta = {},
) {
  const day = String(appointmentDate).slice(0, 10)
  const store = loadStore()
  if (!store.byPet[petId]) store.byPet[petId] = {}
  const prev = store.byPet[petId][treatmentKey] || {}

  store.byPet[petId][treatmentKey] = {
    ...prev,
    treatmentKey,
    treatmentName: meta.treatmentName || prev.treatmentName || treatmentKey,
    petName: meta.petName || prev.petName || 'החיה',
    dueAt: meta.dueAt || prev.dueAt || null,
    muted: false,
    appointmentAt: day,
    fired: { ...(prev.fired || {}), '14': true, '5': true, '2': true },
    updatedAt: new Date().toISOString(),
  }
  saveStore(store)

  clearTreatmentTimers(petId, treatmentKey)

  // Persist on vaccine record when we have enough context
  let entry = null
  if (meta.syncRecord !== false) {
    entry = await updateVaccineRecord(petId, {
      protocolKey: treatmentKey,
      administeredAt: meta.administeredAt || prev.administeredAt || todayIso(),
      petType: meta.petType,
      birthDate: meta.birthDate,
      ageYears: meta.ageYears,
      ownerAddress: meta.ownerAddress,
      id: meta.recordId,
      forceSpirocerca: meta.forceSpirocerca,
      fleaProductKey: meta.fleaProductKey,
      customDueAt: meta.customDueAt,
      catRabiesMonths: meta.catRabiesMonths,
      dueAt: meta.dueAt || prev.dueAt,
      appointmentAt: day,
      remindersMuted: false,
      updateLatest: true,
      keepAdministeredAt: true,
    })
  }

  schedulePetReminders(petId, {
    petName: meta.petName || prev.petName || 'החיה',
    treatments: [
      {
        key: treatmentKey,
        name: meta.treatmentName || prev.treatmentName,
        dueAt: meta.dueAt || entry?.dueAt || prev.dueAt,
        appointmentAt: day,
        muted: false,
      },
    ],
  })

  return { appointmentAt: day, entry }
}

/** Mute all reminders for the current due cycle. */
export function muteRemindersForCycle(petId, treatmentKey) {
  clearTreatmentTimers(petId, treatmentKey)
  const store = loadStore()
  if (!store.byPet[petId]) store.byPet[petId] = {}
  const prev = store.byPet[petId][treatmentKey] || { treatmentKey }
  store.byPet[petId][treatmentKey] = {
    ...prev,
    muted: true,
    updatedAt: new Date().toISOString(),
  }
  saveStore(store)
  return store.byPet[petId][treatmentKey]
}

export async function muteTreatmentReminders(petId, treatmentKey, meta = {}) {
  muteRemindersForCycle(petId, treatmentKey)
  if (meta.syncRecord === false) return getActiveReminders(petId)
  await updateVaccineRecord(petId, {
    protocolKey: treatmentKey,
    administeredAt: meta.administeredAt || todayIso(),
    petType: meta.petType,
    birthDate: meta.birthDate,
    ageYears: meta.ageYears,
    ownerAddress: meta.ownerAddress,
    id: meta.recordId,
    forceSpirocerca: meta.forceSpirocerca,
    fleaProductKey: meta.fleaProductKey,
    customDueAt: meta.customDueAt,
    catRabiesMonths: meta.catRabiesMonths,
    dueAt: meta.dueAt,
    remindersMuted: true,
    updateLatest: true,
    keepAdministeredAt: true,
  })
  return getActiveReminders(petId)
}

export function getActiveReminders(petId) {
  const store = loadStore()
  const map = store.byPet[petId] || {}
  const now = Date.now()
  return Object.values(map)
    .filter((slot) => slot && !slot.muted && slot.dueAt)
    .map((slot) => {
      const pending = []
      if (slot.appointmentAt) {
        if (!slot.fired?.appointment) {
          const fireAt = fireAtMorning(slot.appointmentAt)
          pending.push({
            milestone: 'appointment',
            fireAt: fireAt.toISOString(),
            message: buildMessage(
              'appointment',
              slot.treatmentName,
              slot.petName,
            ),
            upcoming: fireAt.getTime() >= now - 86400000,
          })
        }
      } else {
        for (const daysBefore of MILESTONES) {
          if (slot.fired?.[String(daysBefore)]) continue
          const fireAt = fireAtForMilestone(slot.dueAt, daysBefore)
          if ((now - fireAt.getTime()) / 86400000 > 1.5) continue
          pending.push({
            milestone: daysBefore,
            fireAt: fireAt.toISOString(),
            message: buildMessage(daysBefore, slot.treatmentName, slot.petName),
            daysRemaining: daysUntilDue(slot.dueAt),
          })
        }
      }
      return {
        ...slot,
        daysRemaining: daysUntilDue(slot.dueAt),
        pending,
      }
    })
    .filter((s) => s.pending.length > 0 || s.appointmentAt)
}

export function getReminderMeta(petId, treatmentKey) {
  const store = loadStore()
  return store.byPet[petId]?.[treatmentKey] || null
}

/**
 * Build schedule payload from protocol rows and arm timers.
 */
export function syncRemindersFromProtocolRows(pet, protocolRows = []) {
  if (!pet?.id) return []
  const treatments = protocolRows
    .filter((row) => row.dueAt && !row.notRequired && !row.optionalEmpty)
    .map((row) => ({
      key: row.protocol.key,
      name:
        row.productLabel ||
        row.displayName ||
        row.protocol.name,
      dueAt: row.dueAt,
      muted: Boolean(row.record?.remindersMuted),
      appointmentAt: row.record?.appointmentAt || null,
      notRequired: row.notRequired,
      optionalEmpty: row.optionalEmpty,
    }))

  return schedulePetReminders(pet.id, {
    petName: pet.name,
    treatments,
  })
}
