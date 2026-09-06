import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import {
  dogParks,
  emergencyClinics,
  onDutyVeterinarian,
  seedParkReports,
  seedParkVisitors,
  toxicFoods,
  veterinaryClinics,
  vetConsultFlags,
  vetVerdictLevels,
} from '../data/mockData'
import {
  computeVaccineOutcome,
  getProtocolsForPet,
  statusFromDueAt,
} from '../data/vaccineProtocols'
import { db } from '../lib/firebase'
import { compressImage } from '../utils/compressImage'
import { evaluateClinicalTriage } from './triageEngine'

/** Used only for remaining mock localStorage features (parks / consults). */
export const MOCK_USER_ID = 'mock-user-123'

/** Keep first occurrence of each pet id (guards seed/store/React state duplicates). */
export function uniqueById(items = []) {
  const seen = new Set()
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

const delay = (ms = 280) => new Promise((resolve) => setTimeout(resolve, ms))

const SPECIES_HE = { dog: 'כלב', cat: 'חתול', other: 'אחר' }
const SEX_HE = { male: 'זכר', female: 'נקבה' }

function requireDb() {
  if (!db) {
    throw new Error('Firebase לא מוגדר. מלאו את משתני VITE_FIREBASE_* בקובץ .env')
  }
}

function ageYearsFromBirthDate(birthDate) {
  if (!birthDate) return null
  const born = new Date(birthDate)
  const now = new Date()
  let years = now.getFullYear() - born.getFullYear()
  const m = now.getMonth() - born.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < born.getDate())) years -= 1
  return Math.max(0, Math.round(years * 10) / 10)
}

function withoutUndefined(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  )
}

function omitId(value) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'id'))
}

async function prepareImageForFirestore(value) {
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  return compressImage(value)
}

function withPetId(snap) {
  const data = snap.data()
  return {
    id: snap.id,
    ...data,
    ageYears: ageYearsFromBirthDate(data.birthDate) ?? data.ageYears ?? null,
    image: data.image || data.photoURL || '',
  }
}

function withVaccineId(snap) {
  return { id: snap.id, ...snap.data() }
}

function requireUserId(userId) {
  if (!userId) throw new Error('משתמש לא מחובר')
  return userId
}

function petsCol(userId) {
  return collection(db, 'users', userId, 'pets')
}

function petDocRef(userId, petId) {
  return doc(db, 'users', userId, 'pets', petId)
}

function vaccinesCol(userId, petId) {
  return collection(db, 'users', userId, 'pets', petId, 'vaccines')
}

function vaccineDocRef(userId, petId, vaccineId) {
  return doc(db, 'users', userId, 'pets', petId, 'vaccines', vaccineId)
}

function sortPets(list) {
  return uniqueById(list).sort((a, b) =>
    String(a.createdAt || '').localeCompare(String(b.createdAt || '')),
  )
}

async function getLegacyVaccineDocs(userId) {
  try {
    const vaxSnap = await getDocs(
      query(collection(db, 'vaccines'), where('userId', '==', userId)),
    )
    return vaxSnap.docs
  } catch {
    return []
  }
}

/** Copy leftover top-level pets/vaccines under users/{uid} once. */
async function migrateLegacyPets(userId) {
  const nestedSnap = await getDocs(petsCol(userId))
  if (!nestedSnap.empty) return

  const legacySnap = await getDocs(
    query(collection(db, 'pets'), where('userId', '==', userId)),
  )
  if (legacySnap.empty) return

  const legacyVaccines = await getLegacyVaccineDocs(userId)

  for (const snap of legacySnap.docs) {
    await setDoc(petDocRef(userId, snap.id), snap.data())
    const forPet = legacyVaccines.filter((vax) => vax.data().petId === snap.id)
    await Promise.all(
      forPet.map((vax) => setDoc(vaccineDocRef(userId, snap.id, vax.id), vax.data())),
    )
  }
}

export async function getPets(userId) {
  requireDb()
  if (!userId) return []
  try {
    await migrateLegacyPets(userId)
  } catch {
    /* keep loading nested pets even if legacy copy fails */
  }
  const snap = await getDocs(petsCol(userId))
  return sortPets(snap.docs.map(withPetId))
}

export async function getPetById(userId, petId) {
  requireDb()
  requireUserId(userId)
  const snap = await getDoc(petDocRef(userId, petId))
  if (!snap.exists()) throw new Error('החיה לא נמצאה')
  return withPetId(snap)
}

export async function addPet(userId, petData) {
  requireDb()
  requireUserId(userId)
  const now = new Date().toISOString()
  const type = petData.type ?? 'other'
  const sex = petData.sex ?? 'male'

  const image = await prepareImageForFirestore(petData.image)
  const payload = withoutUndefined({
    userId,
    name: petData.name,
    type,
    speciesHe: SPECIES_HE[type] ?? 'אחר',
    breed: petData.breed ?? '',
    sex,
    sexHe: SEX_HE[sex] ?? 'זכר',
    sterilized: Boolean(petData.sterilized),
    birthDate: petData.birthDate ?? null,
    ageYears: ageYearsFromBirthDate(petData.birthDate),
    weightKg:
      petData.weightKg == null || petData.weightKg === ''
        ? null
        : Number(petData.weightKg) || null,
    chip: petData.chip ?? '',
    image,
    photoURL: image,
    color: petData.color ?? '',
    createdAt: now,
    updatedAt: now,
  })

  const petRef = await addDoc(petsCol(userId), payload)
  return { id: petRef.id, ...payload }
}

export async function updatePet(userId, petId, updatedData) {
  requireDb()
  const current = await getPetById(userId, petId)
  const type = updatedData.type ?? current.type
  const sex = updatedData.sex ?? current.sex
  const birthDate =
    updatedData.birthDate !== undefined ? updatedData.birthDate : current.birthDate

  let image =
    updatedData.image !== undefined ? updatedData.image || '' : current.image || ''
  image = await prepareImageForFirestore(image)

  const next = withoutUndefined({
    ...current,
    ...updatedData,
    userId,
    type,
    speciesHe: SPECIES_HE[type] ?? current.speciesHe ?? 'אחר',
    sex,
    sexHe: SEX_HE[sex] ?? current.sexHe ?? 'זכר',
    sterilized:
      updatedData.sterilized !== undefined
        ? Boolean(updatedData.sterilized)
        : current.sterilized,
    birthDate,
    ageYears: ageYearsFromBirthDate(birthDate),
    weightKg:
      updatedData.weightKg !== undefined
        ? updatedData.weightKg == null || updatedData.weightKg === ''
          ? null
          : Number(updatedData.weightKg) || null
        : current.weightKg,
    chip: updatedData.chip !== undefined ? updatedData.chip ?? '' : current.chip,
    image,
    photoURL: image,
    updatedAt: new Date().toISOString(),
  })

  await updateDoc(petDocRef(userId, petId), omitId(next))
  return { ...next, id: petId }
}

export async function deletePet(userId, petId) {
  requireDb()
  requireUserId(userId)
  if (!petId) throw new Error('חסר מזהה חיה')

  const vaxSnap = await getDocs(vaccinesCol(userId, petId))
  const batch = writeBatch(db)
  vaxSnap.docs.forEach((item) => batch.delete(item.ref))
  batch.delete(petDocRef(userId, petId))
  await batch.commit()
}

export async function getUserProfile(userId) {
  requireDb()
  if (!userId) return null
  const snap = await getDoc(doc(db, 'users', userId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export async function updateUserProfile(profileData, userId) {
  requireDb()
  if (!userId) throw new Error('משתמש לא מחובר')
  const existing = await getUserProfile(userId)
  const now = new Date().toISOString()

  let photoURL =
    profileData.photoURL !== undefined
      ? profileData.photoURL || ''
      : existing?.photoURL ?? existing?.avatar ?? ''
  photoURL = await prepareImageForFirestore(photoURL)

  const profile = {
    id: userId,
    fullName: profileData.fullName?.trim() ?? existing?.fullName ?? '',
    phone: profileData.phone?.trim() ?? existing?.phone ?? '',
    address: profileData.address?.trim() ?? existing?.address ?? '',
    email: profileData.email?.trim() ?? existing?.email ?? '',
    photoURL,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    onboardingComplete: true,
  }

  await setDoc(doc(db, 'users', userId), profile, { merge: true })
  return profile
}

export async function getVaccines(petId, userId) {
  requireDb()
  if (!petId || !userId) return []
  const snap = await getDocs(vaccinesCol(userId, petId))
  return snap.docs
    .map(withVaccineId)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

export async function addVaccine(petId, vaccineData, userId) {
  requireDb()
  const uid = requireUserId(userId || vaccineData.userId)
  const pet = await getPetById(uid, petId)
  const now = new Date().toISOString()
  const image = await prepareImageForFirestore(vaccineData.image)
  const payload = withoutUndefined({
    status: 'valid',
    clinic: vaccineData.clinic ?? 'מרפאת וט-קר, תל אביב',
    administeredAt: vaccineData.administeredAt ?? now.slice(0, 10),
    dueAt: vaccineData.dueAt ?? null,
    batch: vaccineData.batch ?? 'MANUAL-UPLOAD',
    notes: vaccineData.notes ?? 'הועלה מצילום מדבקת חיסון',
    ...vaccineData,
    petId,
    userId: pet.userId || uid,
    image,
    createdAt: now,
    updatedAt: now,
  })

  const vaccineRef = await addDoc(vaccinesCol(uid, petId), payload)
  return { id: vaccineRef.id, ...payload }
}

/**
 * Upserts by id; otherwise appends a new dose so puppy/primary series history is preserved.
 * Recalculates dueAt + status using Israeli protocol rules.
 */
export async function updateVaccineRecord(petId, vaccineData, userId) {
  requireDb()
  const uid = requireUserId(userId || vaccineData.userId)
  const pet = await getPetById(uid, petId)
  const list = await getVaccines(petId, uid)
  const petType = vaccineData.petType ?? pet.type ?? 'dog'
  const protocols = getProtocolsForPet({ type: petType })
  const protocol =
    protocols.find((p) => p.key === vaccineData.protocolKey) ||
    protocols.find((p) => p.name === vaccineData.name)

  const administeredAt =
    vaccineData.administeredAt ?? new Date().toISOString().slice(0, 10)

  const petHint = {
    type: petType,
    birthDate: vaccineData.birthDate ?? pet.birthDate ?? null,
    ageYears: vaccineData.ageYears ?? pet.ageYears ?? null,
  }

  const outcome = computeVaccineOutcome({
    pet: petHint,
    protocolKey: protocol?.key ?? vaccineData.protocolKey,
    administeredAt,
    vaccines: list,
    ownerAddress: vaccineData.ownerAddress ?? '',
    recordId: vaccineData.id ?? null,
    forceSpirocerca: Boolean(vaccineData.forceSpirocerca),
    fleaProductKey: vaccineData.fleaProductKey || 'bravecto',
    customDueAt: vaccineData.customDueAt || null,
    catRabiesMonths: vaccineData.catRabiesMonths || 12,
  })

  const dueAt = vaccineData.dueAt ?? outcome.dueAt
  const notRequired = outcome.notRequired && !vaccineData.forceSpirocerca
  const status = statusFromDueAt(dueAt, { notRequired })

  const base = {
    petId,
    userId: pet.userId || uid,
    name: protocol?.name ?? vaccineData.name ?? 'חיסון',
    nameEn: protocol?.nameEn ?? vaccineData.nameEn ?? '',
    protocolKey: protocol?.key ?? vaccineData.protocolKey ?? null,
    administeredAt,
    dueAt,
    status,
    stageLabel: outcome.stageLabel ?? null,
    displayName: outcome.displayName ?? null,
    productLabel: outcome.productLabel || vaccineData.productLabel || null,
    fleaProductKey: vaccineData.fleaProductKey || null,
    customDueAt: vaccineData.customDueAt || null,
    catRabiesMonths: vaccineData.catRabiesMonths || null,
    doseNumber: outcome.doseNumber ?? null,
    forceSpirocerca: Boolean(vaccineData.forceSpirocerca),
    clinic: vaccineData.clinic?.trim() || 'מרפאת וט-קר, תל אביב',
    notes: vaccineData.notes?.trim() || '',
    batch: vaccineData.batch || `UPD-${Date.now().toString().slice(-6)}`,
    updatedAt: new Date().toISOString(),
  }

  if (vaccineData.appointmentAt !== undefined) {
    base.appointmentAt = vaccineData.appointmentAt
  }
  if (vaccineData.remindersMuted !== undefined) {
    base.remindersMuted = Boolean(vaccineData.remindersMuted)
  }

  let matchIndex = vaccineData.id
    ? list.findIndex((v) => v.id === vaccineData.id)
    : -1

  if (
    matchIndex < 0 &&
    vaccineData.protocolKey &&
    vaccineData.updateLatest === true
  ) {
    matchIndex = list.findIndex(
      (v) =>
        v.protocolKey === vaccineData.protocolKey ||
        (protocol && (v.name === protocol.name || v.nameEn === protocol.nameEn)),
    )
  }

  const matched = matchIndex >= 0 ? list[matchIndex] : null
  let image = vaccineData.image !== undefined ? vaccineData.image || '' : matched?.image || ''
  image = await prepareImageForFirestore(image)
  base.image = image || ''

  let entry
  if (matched) {
    entry = withoutUndefined({
      ...matched,
      ...base,
      id: matched.id,
      administeredAt: vaccineData.keepAdministeredAt
        ? matched.administeredAt
        : administeredAt,
      dueAt: vaccineData.dueAt ?? matched.dueAt ?? dueAt,
    })
    if (vaccineData.appointmentAt === null) entry.appointmentAt = null
    await updateDoc(vaccineDocRef(uid, petId, matched.id), omitId(entry))
  } else {
    entry = withoutUndefined({
      createdAt: new Date().toISOString(),
      ...base,
    })
    const vaccineRef = await addDoc(vaccinesCol(uid, petId), entry)
    entry = { ...entry, id: vaccineRef.id }
  }

  return entry
}

export async function getToxicFoods({ category, query } = {}) {
  await delay(200)
  let list = structuredClone(toxicFoods)

  if (category === 'danger' || category === 'safe') {
    list = list.filter((item) => item.category === category)
  }

  if (query?.trim()) {
    const q = query.trim().toLowerCase()
    list = list.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.note.toLowerCase().includes(q),
    )
  }

  return list
}

/**
 * Haversine distance in km between two WGS84 points.
 */
function distanceKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const R = 6371
  const dLat = toRad(b.latitude - a.latitude)
  const dLon = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

/**
 * 24/7 emergency clinics by city keyword (legacy / city fallback).
 */
export async function getEmergencyClinics(ownerCity = '') {
  await delay(200)
  const list = structuredClone(emergencyClinics)
  const text = String(ownerCity || '').trim().toLowerCase()
  if (!text) return list

  const tokens = text.split(/[\s,/-]+/).filter((t) => t.length > 1)
  const score = (c) => {
    const hay = [c.city, c.address, c.location, ...(c.regionTags || [])]
      .join(' ')
      .toLowerCase()
    let s = 0
    if (hay.includes(text)) s += 10
    for (const token of tokens) {
      if (hay.includes(token)) s += 3
    }
    if (c.isMajorReferral) s += 1
    return s
  }

  return list.sort((a, b) => score(b) - score(a))
}

function parseHmToMinutes(hm) {
  const [h, m] = String(hm).split(':').map(Number)
  return h * 60 + (m || 0)
}

function dayLabelHe(dayIndex) {
  return ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'][dayIndex] || ''
}

function findNextOpen(schedule, fromDate) {
  for (let offset = 0; offset < 8; offset++) {
    const d = new Date(fromDate.getTime() + offset * 24 * 60 * 60 * 1000)
    const day = d.getDay()
    const slot = schedule?.days?.[day]
    if (!slot) continue
    if (offset === 0) {
      const nowMin = fromDate.getHours() * 60 + fromDate.getMinutes()
      const openMin = parseHmToMinutes(slot.open)
      if (nowMin < openMin) {
        return { time: slot.open, dayOffset: 0, day }
      }
      continue
    }
    return { time: slot.open, dayOffset: offset, day }
  }
  return { time: '08:30', dayOffset: 1, day: (fromDate.getDay() + 1) % 7 }
}

/**
 * Dynamic open/closed status from clinic.hoursSchedule / isOpen24h.
 */
export function getClinicOpenStatus(clinic, now = new Date()) {
  const schedule = clinic?.hoursSchedule
  const always =
    clinic?.isOpen24h ||
    clinic?.hours === '24/7' ||
    schedule?.openAlways === true

  if (always) {
    return {
      isOpen: true,
      is24h: true,
      label: 'פתוח 24/7',
      color: 'emerald',
      closesAt: null,
      opensAt: null,
    }
  }

  const days = schedule?.days || {}
  const day = now.getDay()
  const slot = days[day]
  const nowMin = now.getHours() * 60 + now.getMinutes()

  if (slot) {
    const openMin = parseHmToMinutes(slot.open)
    const closeMin = parseHmToMinutes(slot.close)
    if (nowMin >= openMin && nowMin < closeMin) {
      return {
        isOpen: true,
        is24h: false,
        label: `פתוח כעת (עד ${slot.close})`,
        color: 'emerald',
        closesAt: slot.close,
        opensAt: slot.open,
      }
    }
  }

  const next = findNextOpen(schedule, now)
  const when =
    next.dayOffset === 0
      ? next.time
      : next.dayOffset === 1
        ? `${next.time} מחר`
        : `${next.time} ביום ${dayLabelHe(next.day)}`

  return {
    isOpen: false,
    is24h: false,
    label: `סגור כעת (נפתח ב-${when})`,
    color: 'rose',
    closesAt: null,
    opensAt: next.time,
  }
}

function withClinicMeta(clinic, userCoords, hasGps) {
  let km = null
  if (hasGps && Number.isFinite(clinic.lat) && Number.isFinite(clinic.lng)) {
    km =
      Math.round(
        distanceKm(userCoords, {
          latitude: clinic.lat,
          longitude: clinic.lng,
        }) * 10,
      ) / 10
  }
  const openStatus = getClinicOpenStatus(clinic)
  return {
    ...clinic,
    distanceKm: km,
    openStatus,
    isEmergency: Boolean(clinic.isEmergency || clinic.isOpen24h || clinic.hours === '24/7'),
  }
}

function byDistanceAsc(a, b) {
  if (a.distanceKm == null && b.distanceKm == null) return 0
  if (a.distanceKm == null) return 1
  if (b.distanceKm == null) return -1
  return a.distanceKm - b.distanceKm
}

function scoreClinicCity(clinic, token) {
  if (!token) return 0
  const hay = [clinic.city, clinic.address, clinic.location, ...(clinic.regionTags || [])]
    .join(' ')
    .toLowerCase()
  return hay.includes(token) ? 10 : 0
}

/**
 * All nearby clinics: pinned majors + regional emergency + general day clinics.
 * filters: { openNow?: boolean, emergencyOnly?: boolean, city?: string }
 */
export async function getNearbyVeterinaryClinics(userCoords = null, filters = {}) {
  await delay(180)
  const hasGps =
    userCoords &&
    Number.isFinite(userCoords.latitude) &&
    Number.isFinite(userCoords.longitude)

  const emergency = structuredClone(emergencyClinics).map((c) =>
    withClinicMeta(c, userCoords, hasGps),
  )
  const general = structuredClone(veterinaryClinics).map((c) =>
    withClinicMeta(
      {
        ...c,
        isMajorReferral: false,
        isEmergency: false,
        isOpen24h: false,
      },
      userCoords,
      hasGps,
    ),
  )

  const majors = emergency
    .filter((c) => c.isMajorReferral)
    .sort((a, b) => (a.pinOrder ?? 99) - (b.pinOrder ?? 99))

  let nearby = [...emergency.filter((c) => !c.isMajorReferral), ...general]

  if (filters.emergencyOnly) {
    nearby = nearby.filter((c) => c.isEmergency || c.isOpen24h)
  }
  if (filters.openNow) {
    nearby = nearby.filter((c) => c.openStatus?.isOpen)
  }

  const city = String(filters.city || '').trim().toLowerCase()
  if (city && !hasGps) {
    nearby = [...nearby].sort(
      (a, b) => scoreClinicCity(b, city) - scoreClinicCity(a, city),
    )
  } else if (hasGps) {
    nearby.sort(byDistanceAsc)
  }

  return [...majors, ...nearby]
}

/**
 * Top 3 major referral hospitals stay pinned; includes general clinics nearby.
 */
export async function getSortedEmergencyClinics(userCoords = null) {
  return getNearbyVeterinaryClinics(userCoords, {})
}

/**
 * Dog parks sorted by ascending GPS distance when coords are available.
 * Without GPS: default list order; distanceKm = null.
 */
export async function getSortedDogParks(userCoords = null) {
  await delay(160)
  const hasGps =
    userCoords &&
    Number.isFinite(userCoords.latitude) &&
    Number.isFinite(userCoords.longitude)

  const withDistance = structuredClone(dogParks).map((park) => {
    let km = null
    if (hasGps && Number.isFinite(park.lat) && Number.isFinite(park.lng)) {
      km =
        Math.round(
          distanceKm(userCoords, {
            latitude: park.lat,
            longitude: park.lng,
          }) * 10,
        ) / 10
    }
    return { ...park, distanceKm: km }
  })

  if (!hasGps) return withDistance

  return withDistance.sort((a, b) => {
    if (a.distanceKm == null && b.distanceKm == null) return 0
    if (a.distanceKm == null) return 1
    if (b.distanceKm == null) return -1
    return a.distanceKm - b.distanceKm
  })
}

const PARK_VISITORS_KEY = `vetbook-park-visitors-${MOCK_USER_ID}`
const CHECK_IN_TTL_MS = 60 * 60 * 1000

export const PARK_TIME_WINDOWS = [
  { id: 'afternoon', label: 'אחה״צ 16:00–18:00', plannedLabel: 'בין 16:00 ל-18:00', window: '16:00-18:00' },
  { id: 'evening', label: 'ערב 18:00–20:00', plannedLabel: 'בין 18:00 ל-20:00', window: '18:00-20:00' },
  { id: 'night', label: 'לילה 20:00–22:00', plannedLabel: 'בין 20:00 ל-22:00', window: '20:00-22:00' },
]

export const PARK_NOTE_CHIPS = ['משחק בכדור', 'חברותי מאוד', 'רגיש לזכרים', 'רגוע היום', 'אוהב ריצה']

function hydrateSeedVisitor(seed) {
  const now = Date.now()
  const base = {
    id: seed.id,
    parkId: seed.parkId,
    petId: seed.petId,
    petName: seed.petName,
    breed: seed.breed,
    sex: seed.sex,
    sexHe: seed.sexHe,
    neutered: seed.neutered,
    neuteredHe: seed.neuteredHe,
    photoURL: seed.photoURL || '',
    tags: seed.tags || [],
    status: seed.status,
    note: seed.note || '',
    isMock: true,
  }

  if (seed.status === 'here') {
    const ago = (seed.checkedInAgoMinutes ?? 10) * 60 * 1000
    const checkedInAt = new Date(now - ago).toISOString()
    return {
      ...base,
      checkedInAt,
      expiresAt: new Date(now - ago + CHECK_IN_TTL_MS).toISOString(),
      plannedWindow: null,
      plannedLabel: null,
    }
  }

  return {
    ...base,
    checkedInAt: null,
    expiresAt: null,
    plannedWindow: seed.plannedWindow || null,
    plannedLabel: seed.plannedLabel || null,
  }
}

function loadParkVisitorsRaw() {
  try {
    const raw = localStorage.getItem(PARK_VISITORS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  const seeded = seedParkVisitors.map(hydrateSeedVisitor)
  localStorage.setItem(PARK_VISITORS_KEY, JSON.stringify(seeded))
  return seeded
}

function saveParkVisitors(list) {
  localStorage.setItem(PARK_VISITORS_KEY, JSON.stringify(list))
}

function pruneExpiredVisitors(list) {
  const now = Date.now()
  return list.filter((v) => {
    if (v.status !== 'here') return true
    if (!v.expiresAt) return true
    return new Date(v.expiresAt).getTime() > now
  })
}

function enrichVisitorLabels(visitor) {
  if (visitor.status === 'here' && visitor.checkedInAt) {
    const mins = Math.max(
      1,
      Math.round((Date.now() - new Date(visitor.checkedInAt).getTime()) / 60000),
    )
    return { ...visitor, arrivalLabel: `הגיע לפני ${mins} דק׳` }
  }
  return {
    ...visitor,
    arrivalLabel: visitor.plannedLabel || visitor.plannedWindow || 'מתכנן/ת להגיע היום',
  }
}

/** Active + planning visitors for a park (expired check-ins pruned). */
export async function getParkVisitors(parkId) {
  await delay(120)
  let list = pruneExpiredVisitors(loadParkVisitorsRaw())
  saveParkVisitors(list)
  return structuredClone(
    list.filter((v) => v.parkId === parkId).map(enrichVisitorLabels),
  )
}

/** Snapshot of visitor counts for all parks (for card badges). */
export async function getParkVisitorSummaries() {
  await delay(100)
  let list = pruneExpiredVisitors(loadParkVisitorsRaw())
  saveParkVisitors(list)
  const byPark = {}
  for (const park of dogParks) {
    const visitors = list.filter((v) => v.parkId === park.id)
    const here = visitors.filter((v) => v.status === 'here')
    const planning = visitors.filter((v) => v.status === 'planning')
    byPark[park.id] = {
      hereCount: here.length,
      planningCount: planning.length,
      hereAvatars: here.slice(0, 4).map((v) => ({
        id: v.id,
        photoURL: v.photoURL,
        petName: v.petName,
      })),
      planningAvatars: planning.slice(0, 4).map((v) => ({
        id: v.id,
        photoURL: v.photoURL,
        petName: v.petName,
      })),
    }
  }
  return byPark
}

/**
 * Check-in / plan arrival. statusData: { status: 'here'|'planning', plannedWindowId?, note?, petSnapshot }
 * Check-in stays active for 60 minutes.
 */
export async function checkInToPark(parkId, petId, statusData = {}) {
  await delay(180)
  const status = statusData.status === 'planning' ? 'planning' : 'here'
  let list = pruneExpiredVisitors(loadParkVisitorsRaw())

  // One active presence per pet across parks
  list = list.filter((v) => v.petId !== petId)

  const snap = statusData.petSnapshot || {}
  const windowMeta =
    PARK_TIME_WINDOWS.find((w) => w.id === statusData.plannedWindowId) ||
    PARK_TIME_WINDOWS[1]

  const now = Date.now()
  const entry = {
    id: `vis-user-${petId}-${now}`,
    parkId,
    petId,
    petName: snap.name || 'הכלב שלי',
    breed: snap.breed || '',
    sex: snap.sex || 'male',
    sexHe: snap.sexHe || (snap.sex === 'female' ? 'נקבה' : 'זכר'),
    neutered: snap.neutered ?? true,
    neuteredHe:
      snap.neuteredHe ||
      (snap.sex === 'female' ? 'מעוקרת' : 'מסורס'),
    photoURL: snap.image || snap.photoURL || '',
    tags: snap.tags || statusData.tags || ['חברותי'],
    status,
    note: statusData.note || '',
    isMock: false,
    checkedInAt: status === 'here' ? new Date(now).toISOString() : null,
    expiresAt:
      status === 'here' ? new Date(now + CHECK_IN_TTL_MS).toISOString() : null,
    plannedWindow: status === 'planning' ? windowMeta.window : null,
    plannedLabel: status === 'planning' ? windowMeta.plannedLabel : null,
  }

  list.push(entry)
  saveParkVisitors(list)
  return enrichVisitorLabels(structuredClone(entry))
}

export async function checkOutOfPark(parkId, petId) {
  await delay(120)
  let list = pruneExpiredVisitors(loadParkVisitorsRaw())
  list = list.filter((v) => !(v.parkId === parkId && v.petId === petId))
  // Also clear pet from other parks if checking out globally
  list = list.filter((v) => v.petId !== petId)
  saveParkVisitors(list)
  return { ok: true }
}

const PARK_REPORTS_KEY = `vetbook-park-reports-${MOCK_USER_ID}`
const TTL_LIVE_MS = 90 * 60 * 1000 // crowd + inspectors / live hazards
const TTL_STRUCTURAL_MS = 12 * 60 * 60 * 1000 // gate / water / lighting

export const PARK_CROWD_LEVELS = [
  {
    id: 'calm',
    emoji: '🟢',
    label: 'רגוע ופנוי',
    badge: 'רגוע / מעט כלבים',
    hint: '0–2 כלבים',
    tone: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  {
    id: 'moderate',
    emoji: '🟡',
    label: 'עומס בינוני',
    badge: 'בינוני / תנועה סבירה',
    hint: '3–6 כלבים',
    tone: 'bg-amber-50 text-amber-900 border-amber-200',
  },
  {
    id: 'busy',
    emoji: '🔴',
    label: 'עמוס מאוד',
    badge: 'עמוס מאוד',
    hint: '7+ כלבים',
    tone: 'bg-red-50 text-red-800 border-red-200',
  },
]

export const PARK_ALERT_TYPES = {
  inspectors: {
    id: 'inspectors',
    emoji: '👮',
    label: 'פקחים באזור',
    modalLabel: 'נוכחות פקחים בגינה / בסביבה',
    kind: 'live',
    pulse: true,
  },
  water_broken: {
    id: 'water_broken',
    emoji: '💧',
    label: 'ברזיית מים תקולה / אין מים',
    modalLabel: 'ברזיית מים מקולקלת',
    kind: 'structural',
    pulse: false,
  },
  gate_issue: {
    id: 'gate_issue',
    emoji: '🚪',
    label: 'שער לא נסגר / בעיית גידור',
    modalLabel: 'שער פגום / בעיית בטיחות',
    kind: 'structural',
    pulse: false,
  },
  lighting_out: {
    id: 'lighting_out',
    emoji: '💡',
    label: 'תאורה חשוכה / נורות שרופות',
    modalLabel: 'תאורה חשוכה / נורות שרופות',
    kind: 'structural',
    pulse: false,
  },
  aggressive_dog: {
    id: 'aggressive_dog',
    emoji: '⚠️',
    label: 'כלב אגרסיבי במתחם',
    modalLabel: 'כלב אגרסיבי במתחם',
    kind: 'live',
    pulse: true,
  },
  dogs_offleash: {
    id: 'dogs_offleash',
    emoji: '🐕‍🦺',
    label: 'כלבים משוחררים מחוץ למתחם',
    modalLabel: 'כלבים משוחררים מחוץ למתחם',
    kind: 'live',
    pulse: false,
  },
}

/** Alerts shown in the report modal (multi-select). */
export const PARK_REPORT_MODAL_ALERTS = [
  'inspectors',
  'water_broken',
  'gate_issue',
  'dogs_offleash',
]

function ttlForAlert(alertId) {
  const meta = PARK_ALERT_TYPES[alertId]
  if (meta?.kind === 'structural') return TTL_STRUCTURAL_MS
  return TTL_LIVE_MS
}

function ttlForCrowd() {
  return TTL_LIVE_MS
}

export function formatRelativeHe(iso) {
  if (!iso) return ''
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `לפני ${mins} דק׳`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `לפני ${hours} שע׳`
  return `לפני ${Math.round(hours / 24)} ימים`
}

export function authorInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2)
  return (parts[0][0] + parts[1][0]).slice(0, 2)
}

function hydrateSeedReport(seed) {
  const ago = (seed.reportedAgoMinutes ?? 10) * 60 * 1000
  const createdAt = new Date(Date.now() - ago).toISOString()
  return {
    id: seed.id,
    parkId: seed.parkId,
    crowdLevel: seed.crowdLevel || null,
    alerts: seed.alerts || [],
    note: seed.note || '',
    authorName: seed.authorName || 'מבקר/ת',
    createdAt,
    isMock: true,
  }
}

function loadParkReportsRaw() {
  try {
    const raw = localStorage.getItem(PARK_REPORTS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  const seeded = seedParkReports.map(hydrateSeedReport)
  localStorage.setItem(PARK_REPORTS_KEY, JSON.stringify(seeded))
  return seeded
}

function saveParkReports(list) {
  localStorage.setItem(PARK_REPORTS_KEY, JSON.stringify(list))
}

function isReportPartActive(report, now = Date.now()) {
  const created = new Date(report.createdAt).getTime()
  const age = now - created
  const crowdActive = report.crowdLevel && age <= ttlForCrowd()
  const activeAlerts = (report.alerts || []).filter((id) => age <= ttlForAlert(id))
  return crowdActive || activeAlerts.length > 0
}

function pruneExpiredReports(list) {
  const now = Date.now()
  return list.filter((r) => isReportPartActive(r, now))
}

function enrichReport(report) {
  const age = Date.now() - new Date(report.createdAt).getTime()
  const activeAlerts = (report.alerts || []).filter((id) => age <= ttlForAlert(id))
  const crowdActive = report.crowdLevel && age <= ttlForCrowd()
  return {
    ...report,
    alerts: activeAlerts,
    crowdLevel: crowdActive ? report.crowdLevel : null,
    relativeTime: formatRelativeHe(report.createdAt),
    authorInitials: authorInitials(report.authorName),
  }
}

/** Active reports for a park (decayed parts stripped). */
export async function getParkReports(parkId) {
  await delay(100)
  let list = pruneExpiredReports(loadParkReportsRaw())
  saveParkReports(list)
  return structuredClone(
    list
      .filter((r) => r.parkId === parkId)
      .map(enrichReport)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  )
}

/**
 * Aggregated live view for park cards: latest crowd + unique active alerts.
 */
export async function getParkReportSummaries() {
  await delay(100)
  let list = pruneExpiredReports(loadParkReportsRaw())
  saveParkReports(list)
  const now = Date.now()
  const byPark = {}

  for (const park of dogParks) {
    const reports = list
      .filter((r) => r.parkId === park.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    let crowd = null
    for (const r of reports) {
      const age = now - new Date(r.createdAt).getTime()
      if (r.crowdLevel && age <= ttlForCrowd()) {
        const meta = PARK_CROWD_LEVELS.find((c) => c.id === r.crowdLevel)
        crowd = {
          level: r.crowdLevel,
          emoji: meta?.emoji || '🟢',
          badge: meta?.badge || r.crowdLevel,
          tone: meta?.tone || '',
          authorName: r.authorName,
          relativeTime: formatRelativeHe(r.createdAt),
          createdAt: r.createdAt,
        }
        break
      }
    }

    const alertMap = new Map()
    for (const r of reports) {
      const age = now - new Date(r.createdAt).getTime()
      for (const alertId of r.alerts || []) {
        if (age > ttlForAlert(alertId)) continue
        if (alertMap.has(alertId)) continue
        const meta = PARK_ALERT_TYPES[alertId]
        if (!meta) continue
        alertMap.set(alertId, {
          id: alertId,
          emoji: meta.emoji,
          label: meta.label,
          pulse: Boolean(meta.pulse),
          authorName: r.authorName,
          relativeTime: formatRelativeHe(r.createdAt),
          createdAt: r.createdAt,
        })
      }
    }

    byPark[park.id] = {
      crowd,
      alerts: [...alertMap.values()],
    }
  }

  return byPark
}

/**
 * Submit a community report.
 * reportData: { crowdLevel, alerts[], note, authorName }
 */
export async function addParkReport(parkId, reportData = {}) {
  await delay(160)
  let list = pruneExpiredReports(loadParkReportsRaw())
  const createdAt = new Date().toISOString()
  const entry = {
    id: `rep-${parkId}-${Date.now()}`,
    parkId,
    crowdLevel: reportData.crowdLevel || null,
    alerts: Array.isArray(reportData.alerts) ? reportData.alerts : [],
    note: String(reportData.note || '').trim().slice(0, 160),
    authorName: String(reportData.authorName || 'אורח/ת').trim() || 'אורח/ת',
    createdAt,
    isMock: false,
  }
  list.unshift(entry)
  saveParkReports(list)
  return enrichReport(structuredClone(entry))
}

export async function getPrimaryClinic({ clinicName } = {}) {
  await delay(150)
  if (clinicName) {
    const match = veterinaryClinics.find(
      (c) => c.name === clinicName || c.name.includes(clinicName) || clinicName.includes(c.name),
    )
    if (match) return structuredClone(match)
  }
  const primary =
    veterinaryClinics.find((c) => c.isPrimaryDefault) || veterinaryClinics[0]
  return structuredClone(primary)
}

/**
 * Nearby clinics by owner address / city keywords.
 * Falls back to Center (גוש דן) clinics when address is empty.
 */
export async function getNearbyClinics(ownerAddress = '', { excludeId } = {}) {
  await delay(200)
  const text = String(ownerAddress || '').trim().toLowerCase()
  let list = veterinaryClinics.filter((c) => c.id !== excludeId)

  if (text) {
    const filtered = list.filter((c) => {
      const hay = [c.city, c.address, ...(c.regionTags || [])]
        .join(' ')
        .toLowerCase()
      return (
        hay.includes(text) ||
        text.split(/[\s,/-]+/).some((token) => token.length > 1 && hay.includes(token))
      )
    })
    if (filtered.length) list = filtered
  } else {
    list = list.filter((c) =>
      (c.regionTags || []).some((t) =>
        ['תל אביב', 'גוש דן', 'מרכז', 'רמת גן'].includes(t),
      ),
    )
  }

  return structuredClone(list.slice(0, 5))
}

export function buildClinicWhatsAppUrl(clinic, petName) {
  const phone = clinic.whatsapp || ''
  const msg = encodeURIComponent(
    `שלום, ברצוני לתאם תור לחיסון/ביקורת עבור ${petName || 'החיה שלי'}`,
  )
  return `https://wa.me/${phone}?text=${msg}`
}

/**
 * Clinical triage: local red-flag matrix first, then Gemini when available.
 * Never advises measuring rectal temperature at home.
 */
export async function assessSymptoms(input) {
  const local = evaluateClinicalTriage(input)
  if (local.isEmergency || local.color === 'red') {
    return local
  }

  try {
    const res = await fetch('/.netlify/functions/triage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: input.message,
        petName: input.petName,
        species: input.species,
      }),
    })
    if (!res.ok) return local
    const data = await res.json()
    if (!data?.advice) return local
    return {
      ...local,
      advice: data.advice,
      disclaimer: data.disclaimer || local.disclaimer,
      category: data.category || 'gemini',
    }
  } catch {
    return local
  }
}

/* ── Live on-duty veterinarian consult (mock queue) ── */

const VET_CONSULT_KEY = `vetbook-vet-consults-${MOCK_USER_ID}`

export { vetConsultFlags, onDutyVeterinarian, vetVerdictLevels }

function loadConsultQueue() {
  try {
    const raw = localStorage.getItem(VET_CONSULT_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return []
}

function saveConsultQueue(list) {
  localStorage.setItem(VET_CONSULT_KEY, JSON.stringify(list))
}

function buildVetClinicalNotes(verdictId, flags, petName) {
  const name = petName || 'החיה'
  const flagSet = new Set(flags || [])

  if (verdictId === 'emergency') {
    const tips = []
    if (flagSet.has('dyspnea')) {
      tips.push(
        'שמרו על שקט והימנעו מלחיצה על בית החזה; הובלה עדינה למרכז חירום עם חלון פתוח / מזגן.',
      )
    }
    if (flagSet.has('urine')) {
      tips.push(
        'חשד לחסימת שתן — מצב מסכן חיים תוך שעות. אל תמתינו למתן שתן ספונטני.',
      )
    }
    if (flagSet.has('toxin')) {
      tips.push(
        'אל תגרמו להקאה בבית ללא הנחיית וטרינר. הביאו אריזה/שאריות של החומר שנבלע אם אפשר.',
      )
    }
    if (flagSet.has('bleed')) {
      tips.push(
        'לחצו בעדינות עם גזה נקייה על דימום חיצוני; אל תסירו קריש שנוצר.',
      )
    }
    if (flagSet.has('collapse')) {
      tips.push('הימנעו מהזזה מיותרת; שמרו על דרכי נשימה פתוחות והגיעו מיד.')
    }
    if (!tips.length) {
      tips.push(
        'לפי התיאור והדגלים — סיווג כחירום. אל תעכבו את ההגעה למרכז חירום.',
      )
    }
    return `שלום, בחנתי את הפנייה לגבי ${name}. ${tips.join(' ')} אנחנו זמינים בחזרה בטלפון אם צריך הכוונה בדרך.`
  }

  if (verdictId === 'urgent') {
    return `שלום, לגבי ${name}: לפי הדיווח מומלצת בדיקה במרפאה בשעות הקרובות. השגיחו על אכילה/שתיה, הקאות חוזרות, חולשה או החמרה — ואם מופיעים קשיי נשימה, קריסה או דימום פנו מיד לחירום.`
  }

  return `שלום, לגבי ${name}: לפי המידע שסופק כרגע אינו נראה חירום מיידי. המשיכו השגחה בבית, הציעו מים, הגבילו מאמץ, ועקבו אחרי אכילה והתנהגות. בכל החמרה — פנו למרפאה או שלחו פנייה חוזרת.`
}

/**
 * Classify inquiry using checkbox flags + clinical keyword engine.
 */
function classifyVetInquiry({ symptoms, flags, species }) {
  const flagIds = flags || []
  const hasEmergencyFlag = flagIds.some((id) => {
    const meta = vetConsultFlags.find((f) => f.id === id)
    return meta?.severity === 'emergency'
  })
  const hasUrgentFlag = flagIds.some((id) => {
    const meta = vetConsultFlags.find((f) => f.id === id)
    return meta?.severity === 'urgent'
  })

  const engine = evaluateClinicalTriage({
    petName: 'החיה',
    message: symptoms || '',
    species: species || 'dog',
  })

  if (hasEmergencyFlag || engine.isEmergency || engine.color === 'red') {
    return vetVerdictLevels.emergency
  }
  if (hasUrgentFlag || engine.isHighUrgency || engine.color === 'orange' || engine.color === 'amber') {
    return vetVerdictLevels.urgent
  }
  return vetVerdictLevels.monitor
}

/**
 * Submit structured emergency inquiry to on-duty vet queue.
 * Auto-simulates a stamped veterinarian response after a short delay.
 */
export async function submitVetConsultInquiry(payload) {
  await delay(450)

  const now = new Date().toISOString()
  const id = `consult-${Date.now()}`
  const inquiry = {
    id,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    pet: {
      id: payload.pet?.id ?? null,
      name: payload.pet?.name ?? 'החיה',
      type: payload.pet?.type ?? 'dog',
      speciesHe: payload.pet?.speciesHe ?? (payload.pet?.type === 'cat' ? 'חתול' : 'כלב'),
      breed: payload.pet?.breed ?? '',
      ageYears: payload.pet?.ageYears ?? null,
      weightKg: payload.pet?.weightKg ?? null,
    },
    symptoms: String(payload.symptoms || '').trim(),
    flags: Array.isArray(payload.flags) ? payload.flags : [],
    flagLabels: (payload.flags || [])
      .map((fid) => vetConsultFlags.find((f) => f.id === fid)?.label)
      .filter(Boolean),
    media: payload.media
      ? {
          name: payload.media.name,
          type: payload.media.type,
          dataUrl: payload.media.dataUrl,
        }
      : null,
    contact: {
      phone: String(payload.contact?.phone || '').trim(),
      whatsapp: String(payload.contact?.whatsapp || payload.contact?.phone || '').trim(),
      ownerName: String(payload.contact?.ownerName || '').trim(),
    },
    response: null,
  }

  const queue = loadConsultQueue()
  queue.unshift(inquiry)
  saveConsultQueue(queue)

  // Simulate on-duty vet review + stamped verdict
  setTimeout(() => {
    const list = loadConsultQueue()
    const idx = list.findIndex((item) => item.id === id)
    if (idx < 0) return

    const verdict = classifyVetInquiry({
      symptoms: inquiry.symptoms,
      flags: inquiry.flags,
      species: inquiry.pet.type,
    })
    const respondedAt = new Date().toISOString()
    list[idx] = {
      ...list[idx],
      status: 'answered',
      updatedAt: respondedAt,
      response: {
        verdictId: verdict.id,
        color: verdict.color,
        badge: verdict.badge,
        banner: verdict.banner,
        clinicalNotes: buildVetClinicalNotes(
          verdict.id,
          inquiry.flags,
          inquiry.pet.name,
        ),
        vet: { ...onDutyVeterinarian },
        stampLabel: `${onDutyVeterinarian.stampLabel} • ${formatRelativeHe(respondedAt)}`,
        respondedAt,
      },
    }
    saveConsultQueue(list)
  }, 2200)

  return structuredClone(inquiry)
}

export async function getVetConsultInquiries() {
  await delay(120)
  const list = loadConsultQueue().map((item) => {
    if (item.response?.respondedAt) {
      return {
        ...item,
        response: {
          ...item.response,
          stampLabel: `${item.response.vet?.stampLabel || onDutyVeterinarian.stampLabel} • ${formatRelativeHe(item.response.respondedAt)}`,
        },
      }
    }
    return item
  })
  return structuredClone(list)
}

export async function getVetConsultInquiry(id) {
  await delay(80)
  const item = loadConsultQueue().find((q) => q.id === id)
  return item ? structuredClone(item) : null
}
