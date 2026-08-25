/** Israeli veterinary protocol helpers (demo rules for owners — not a legal substitute). */

export const DOG_PROTOCOLS = [
  { key: 'dhppil', name: 'משושה', nameEn: 'DHPPiL', category: 'core' },
  { key: 'rabies', name: 'כלבת', nameEn: 'Rabies', category: 'core', mandatory: true },
  { key: 'spirocerca', name: 'תולעת הפארק', nameEn: 'Spirocerca Lupi', category: 'preventive' },
  { key: 'deworm', name: 'תילוע', nameEn: 'Deworming', category: 'preventive' },
  { key: 'flea_tick', name: 'פרעושים וקרציות', nameEn: 'Flea & Tick', category: 'preventive' },
]

export const CAT_PROTOCOLS = [
  { key: 'fvrcp', name: 'מרובע', nameEn: 'FVRCP', category: 'core' },
  { key: 'flea_tick', name: 'פרעושים וקרציות', nameEn: 'Flea & Tick', category: 'preventive' },
  { key: 'deworm', name: 'תילוע', nameEn: 'Deworming', category: 'preventive' },
  {
    key: 'rabies',
    name: 'כלבת',
    nameEn: 'Rabies',
    category: 'optional',
    mandatory: false,
    optionalBadge: 'חיסון רשות (אופציונלי)',
  },
]

/** Flea & tick products — duration drives next due date */
export const FLEA_TICK_PRODUCTS = [
  {
    key: 'bravecto',
    nameHe: 'ברבקטו',
    nameEn: 'Bravecto',
    label: 'ברבקטו (3 חודשים)',
    months: 3,
  },
  {
    key: 'nexgard',
    nameHe: 'נקסגארד',
    nameEn: 'NexGard',
    label: 'נקסגארד (חודשי)',
    months: 1,
  },
  {
    key: 'simparica',
    nameHe: 'סימפריקה',
    nameEn: 'Simparica',
    label: 'סימפריקה (חודשי)',
    months: 1,
  },
  {
    key: 'credelio',
    nameHe: 'קרדליו',
    nameEn: 'Credelio',
    label: 'קרדליו (חודשי)',
    months: 1,
  },
  {
    key: 'frontline',
    nameHe: 'פרונטליין',
    nameEn: 'Frontline',
    label: 'פרונטליין (חודשי)',
    months: 1,
  },
  {
    key: 'advantage',
    nameHe: 'אדוונטג׳',
    nameEn: 'Advantage',
    label: 'אדוונטג׳ (חודשי)',
    months: 1,
  },
  {
    key: 'advantix',
    nameHe: 'אדוונטיקס',
    nameEn: 'Advantix',
    label: 'אדוונטיקס (חודשי)',
    months: 1,
  },
  {
    key: 'seresto',
    nameHe: 'קולר סרסטו',
    nameEn: 'Seresto',
    label: 'קולר סרסטו (8 חודשים)',
    months: 8,
  },
  {
    key: 'custom',
    nameHe: 'מותאם אישית',
    nameEn: 'Custom',
    label: 'מותאם אישית',
    months: null,
  },
]

export const CAT_RABIES_INTERVALS = [
  { months: 12, label: '12 חודשים' },
  { months: 24, label: '24 חודשים' },
]

/** Cities / regions where Spirocerca prevention is typically not required */
const NON_ENDEMIC_KEYWORDS = [
  'אילת',
  'eilat',
  'ערבה',
  'arava',
  'ים המלח',
  'dead sea',
  'מצפה רמון',
  'רמון',
]

export function getProtocolsForPet(pet, { includeOptionalRabies = true } = {}) {
  if (pet?.type === 'cat') {
    if (includeOptionalRabies) return CAT_PROTOCOLS
    return CAT_PROTOCOLS.filter((p) => p.key !== 'rabies')
  }
  return DOG_PROTOCOLS
}

export function getFleaProduct(key) {
  return FLEA_TICK_PRODUCTS.find((p) => p.key === key) ?? null
}

export function addMonths(isoDate, months) {
  if (!isoDate) return null
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return null
  const day = d.getDate()
  d.setMonth(d.getMonth() + months)
  if (d.getDate() < day) d.setDate(0)
  return d.toISOString().slice(0, 10)
}

export function addDays(isoDate, days) {
  if (!isoDate) return null
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return null
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function daysUntil(dateStr) {
  if (!dateStr) return null
  const due = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24))
}

export function ageInWeeks(birthDate, asOf = new Date()) {
  if (!birthDate) return null
  const born = new Date(birthDate)
  if (Number.isNaN(born.getTime())) return null
  const ms = asOf.getTime() - born.getTime()
  if (ms < 0) return 0
  return Math.floor(ms / (7 * 24 * 60 * 60 * 1000))
}

export function isLikelyAdultPet(pet) {
  const weeks = ageInWeeks(pet?.birthDate)
  if (weeks != null) return weeks >= 52
  if (pet?.ageYears != null) return Number(pet.ageYears) >= 1
  return false
}

export function isSpirocercaEndemicRegion(address = '') {
  const text = String(address || '').trim().toLowerCase()
  if (!text) return true
  return !NON_ENDEMIC_KEYWORDS.some((k) => text.includes(k.toLowerCase()))
}

export function matchesProtocol(vaccine, protocol) {
  if (vaccine.protocolKey && vaccine.protocolKey === protocol.key) return true
  if (vaccine.name === protocol.name) return true
  if (vaccine.nameEn && vaccine.nameEn === protocol.nameEn) return true
  return false
}

export function getProtocolHistory(vaccines = [], protocol) {
  return vaccines
    .filter((v) => matchesProtocol(v, protocol))
    .sort((a, b) => (a.administeredAt || '').localeCompare(b.administeredAt || ''))
}

export function resolveDoseNumber({
  vaccines = [],
  protocol,
  recordId = null,
  administeredAt,
}) {
  const history = getProtocolHistory(vaccines, protocol)
  if (recordId) {
    const idx = history.findIndex((v) => v.id === recordId)
    if (idx >= 0) return idx + 1
  }
  if (!recordId) return history.length + 1
  const prior = history.filter(
    (v) => v.id !== recordId && (v.administeredAt || '') <= (administeredAt || '9999'),
  )
  return Math.max(1, prior.length + 1)
}

/**
 * Core Israeli schedule calculator for next due date + labels.
 */
export function computeVaccineOutcome({
  pet,
  protocolKey,
  administeredAt,
  vaccines = [],
  ownerAddress = '',
  recordId = null,
  forceSpirocerca = false,
  fleaProductKey = 'bravecto',
  customDueAt = null,
  catRabiesMonths = 12,
}) {
  const protocols = getProtocolsForPet(pet, { includeOptionalRabies: true })
  const protocol = protocols.find((p) => p.key === protocolKey)
  if (!protocol || !administeredAt) {
    return {
      dueAt: null,
      statusKey: 'missing',
      stageLabel: null,
      displayName: protocol?.name ?? 'חיסון',
      ruleText: '',
      notRequired: false,
      optional: false,
      doseNumber: null,
      productLabel: null,
    }
  }

  const doseNumber = resolveDoseNumber({
    vaccines,
    protocol,
    recordId,
    administeredAt,
  })
  const adult = isLikelyAdultPet(pet)
  const isCat = pet?.type === 'cat'

  // —— Flea & Tick ——
  if (protocolKey === 'flea_tick') {
    const product = getFleaProduct(fleaProductKey) ?? getFleaProduct('bravecto')
    let dueAt = null
    if (product.key === 'custom') {
      dueAt = customDueAt || null
    } else if (product.months) {
      dueAt = addMonths(administeredAt, product.months)
    }

    return {
      dueAt,
      statusKey: 'scheduled',
      stageLabel: product.label,
      displayName: `פרעושים וקרציות · ${product.label}`,
      ruleText:
        product.key === 'custom'
          ? 'טיפול נגד פרעושים וקרציות: בחרו תאריך יעד מותאם לפי הוראות היצרן.'
          : `טיפול נגד פרעושים וקרציות: ${product.label} — חישוב אוטומטי לפי משך הפעולה של התכשיר.`,
      notRequired: false,
      optional: false,
      doseNumber,
      productLabel: product.label,
      fleaProductKey: product.key,
    }
  }

  // —— Spirocerca (dogs only) ——
  if (protocolKey === 'spirocerca') {
    const endemic = isSpirocercaEndemicRegion(ownerAddress)
    if (!endemic && !forceSpirocerca) {
      return {
        dueAt: null,
        statusKey: 'not_required',
        stageLabel: 'לא נדרש באזור זה',
        displayName: protocol.name,
        ruleText:
          'תולעת הפארק: לא נדרש באזור זה (לפי כתובת המגורים). באזורים אנדמיים — מניעה כל 3 חודשים.',
        notRequired: true,
        optional: false,
        doseNumber,
        productLabel: null,
      }
    }
    return {
      dueAt: addMonths(administeredAt, 3),
      statusKey: 'scheduled',
      stageLabel: 'מניעה רבעונית',
      displayName: protocol.name,
      ruleText:
        'תולעת הפארק: מניעה רבעונית (+3 חודשים) באזורי סיכון (מרכז, שרון, צפון, שפלה, דרום).',
      notRequired: false,
      optional: false,
      doseNumber,
      productLabel: null,
    }
  }

  // —— Deworming ——
  if (protocolKey === 'deworm') {
    return {
      dueAt: addMonths(administeredAt, 6),
      statusKey: 'scheduled',
      stageLabel: 'מניעתי כל 6 חודשים או לפי הצורך',
      displayName: protocol.name,
      ruleText: 'תילוע: מניעתי כל 6 חודשים או לפי הצורך (+6 חודשים מהמנה האחרונה).',
      notRequired: false,
      optional: false,
      doseNumber,
      productLabel: null,
    }
  }

  // —— Rabies ——
  if (protocolKey === 'rabies') {
    if (isCat) {
      const months = catRabiesMonths === 24 ? 24 : 12
      return {
        dueAt: addMonths(administeredAt, months),
        statusKey: 'scheduled',
        stageLabel: `תוקף ${months} חודשים`,
        displayName: `כלבת · רשות (${months} חודשים)`,
        ruleText: `כלבת לחתולים: חיסון רשות (אופציונלי) בישראל — אינו חובה בחוק. אם בוצע, תוקף ל־${months} חודשים לפי סוג החיסון.`,
        notRequired: false,
        optional: true,
        doseNumber,
        productLabel: null,
      }
    }

    // Dogs — mandatory regulatory schedule
    if (!adult && doseNumber === 1) {
      return {
        dueAt: addMonths(administeredAt, 1),
        statusKey: 'scheduled',
        stageLabel: 'כלבת 1 מתוך 2',
        displayName: 'כלבת 1 מתוך 2',
        ruleText:
          'כלבת (חובה לכלבים): מנת יסוד ראשונה — המנה הבאה בעוד חודש. לאחר מכן תוקף ל־24 חודשים.',
        notRequired: false,
        optional: false,
        doseNumber,
        productLabel: null,
      }
    }
    if (!adult && doseNumber === 2) {
      return {
        dueAt: addMonths(administeredAt, 24),
        statusKey: 'scheduled',
        stageLabel: 'כלבת 2 מתוך 2',
        displayName: 'כלבת 2 מתוך 2',
        ruleText:
          'כלבת: חיסון בתוקף לשנתיים לפי פרוטוקול רגולטורי (+24 חודשים). אגרת רישיון עירוני — שנתית.',
        notRequired: false,
        optional: false,
        doseNumber,
        productLabel: null,
      }
    }
    return {
      dueAt: addMonths(administeredAt, 24),
      statusKey: 'scheduled',
      stageLabel: 'כלבת · תוקף שנתיים',
      displayName: protocol.name,
      ruleText:
        'כלבת לכלבים: חיסון בתוקף לשנתיים לפי חוק (+24 חודשים). אגרת רישיון עירוני משולמת לרוב מדי שנה.',
      notRequired: false,
      optional: false,
      doseNumber,
      productLabel: null,
    }
  }

  // —— DHPPiL (dogs) / FVRCP (cats) ——
  if (protocolKey === 'dhppil' || protocolKey === 'fvrcp') {
    const isFvrcp = protocolKey === 'fvrcp'
    const seriesWord = isFvrcp ? 'חתלתולים' : 'גורים'
    const annualLabel = isFvrcp ? 'מרובע שנתי' : `${protocol.name} שנתי`
    const inSeries = !adult && doseNumber < 3

    const seriesLabel = (n) =>
      isFvrcp ? `חיסון מרובע ${n} מתוך 3` : `${protocol.name} ${n} מתוך 3`

    if (inSeries && doseNumber === 1) {
      return {
        dueAt: addDays(administeredAt, 21),
        statusKey: 'scheduled',
        stageLabel: seriesLabel(1),
        displayName: seriesLabel(1),
        ruleText: `${isFvrcp ? 'מרובע' : protocol.name}: סדרת ${seriesWord} — מנה 1 מתוך 3 (החל מגיל ~חודשיים). המנה הבאה בעוד 3 שבועות.`,
        notRequired: false,
        optional: false,
        doseNumber,
        productLabel: null,
      }
    }
    if (inSeries && doseNumber === 2) {
      return {
        dueAt: addDays(administeredAt, 21),
        statusKey: 'scheduled',
        stageLabel: seriesLabel(2),
        displayName: seriesLabel(2),
        ruleText: `${isFvrcp ? 'מרובע' : protocol.name}: סדרת ${seriesWord} — מנה 2 מתוך 3. המנה הבאה בעוד 3 שבועות.`,
        notRequired: false,
        optional: false,
        doseNumber,
        productLabel: null,
      }
    }
    if (!adult && doseNumber === 3) {
      return {
        dueAt: addMonths(administeredAt, 12),
        statusKey: 'scheduled',
        stageLabel: seriesLabel(3),
        displayName: seriesLabel(3),
        ruleText: `${isFvrcp ? 'מרובע' : protocol.name}: השלמת סדרת ${seriesWord}. מכאן ואילך חיזוק שנתי (+12 חודשים).`,
        notRequired: false,
        optional: false,
        doseNumber,
        productLabel: null,
      }
    }
    return {
      dueAt: addMonths(administeredAt, 12),
      statusKey: 'scheduled',
      stageLabel: annualLabel,
      displayName: annualLabel,
      ruleText: `${isFvrcp ? 'מרובע' : protocol.name}: חיזוק שנתי למבוגרים (+12 חודשים) לאחר השלמת הסדרה.`,
      notRequired: false,
      optional: false,
      doseNumber,
      productLabel: null,
    }
  }

  return {
    dueAt: addMonths(administeredAt, 12),
    statusKey: 'scheduled',
    stageLabel: protocol.name,
    displayName: protocol.name,
    ruleText: 'לפי פרוטוקול סטנדרטי.',
    notRequired: false,
    optional: false,
    doseNumber,
    productLabel: null,
  }
}

export function clinicalStatus(dueAt, { notRequired = false, optionalEmpty = false } = {}) {
  if (notRequired) {
    return {
      label: 'לא נדרש באזור זה',
      tone: 'not_required',
      className: 'bg-sky-100 text-sky-800',
      days: null,
    }
  }
  if (optionalEmpty) {
    return {
      label: 'לא בוצע',
      tone: 'optional',
      className: 'bg-violet-100 text-violet-800',
      days: null,
    }
  }
  const days = daysUntil(dueAt)
  if (days === null) {
    return { label: 'חסר', tone: 'missing', className: 'bg-slate-100 text-slate-600', days: null }
  }
  if (days < 0) {
    return { label: 'פג תוקף', tone: 'expired', className: 'bg-red-100 text-red-700', days }
  }
  if (days <= 30) {
    return { label: 'נדרש חידוש', tone: 'soon', className: 'bg-amber-100 text-amber-800', days }
  }
  return { label: 'בתוקף', tone: 'valid', className: 'bg-emerald-100 text-emerald-700', days }
}

export function statusFromDueAt(dueAt, { notRequired = false } = {}) {
  const meta = clinicalStatus(dueAt, { notRequired })
  if (meta.tone === 'not_required') return 'not_required'
  if (meta.tone === 'expired') return 'expired'
  if (meta.tone === 'soon') return 'due_soon'
  if (meta.tone === 'missing') return 'missing'
  return 'valid'
}

/**
 * Merge protocol slots with latest record + Israeli schedule metadata.
 */
export function resolveProtocolRows(
  pet,
  vaccines = [],
  { ownerAddress = '', includeOptionalRabies = true } = {},
) {
  const protocols = getProtocolsForPet(pet, { includeOptionalRabies })
  const endemic = isSpirocercaEndemicRegion(ownerAddress)

  return protocols.map((protocol) => {
    const history = getProtocolHistory(vaccines, protocol)
    const record = history.length ? history[history.length - 1] : null

    const notRequired =
      protocol.key === 'spirocerca' && !endemic && !record?.forceSpirocerca

    const optionalEmpty =
      protocol.category === 'optional' && !record && pet?.type === 'cat'

    let dueAt = record?.dueAt ?? null
    let stageLabel = record?.stageLabel ?? null
    let displayName = protocol.name
    let ruleText = ''
    let productLabel = record?.productLabel ?? null

    if (notRequired && !record) {
      stageLabel = 'לא נדרש באזור זה'
      ruleText =
        'לא נדרש באזור זה (לפי כתובת המגורים). ניתן לעדכן ידנית אם הטיפול בוצע בכל זאת.'
    } else if (optionalEmpty) {
      stageLabel = null
      ruleText =
        'כלבת לחתולים אינה חובה בחוק בישראל. ניתן לתעד אם בחרתם לחסן.'
      displayName = protocol.name
    } else if (record) {
      const outcome = computeVaccineOutcome({
        pet,
        protocolKey: protocol.key,
        administeredAt: record.administeredAt,
        vaccines,
        ownerAddress,
        recordId: record.id,
        forceSpirocerca: Boolean(record.forceSpirocerca),
        fleaProductKey: record.fleaProductKey || 'bravecto',
        customDueAt: record.customDueAt || record.dueAt,
        catRabiesMonths: record.catRabiesMonths || 12,
      })
      dueAt = outcome.dueAt
      stageLabel = record.stageLabel || outcome.stageLabel
      displayName = record.displayName || outcome.displayName || protocol.name
      ruleText = outcome.ruleText
      productLabel = record.productLabel || outcome.productLabel
    } else {
      const preview = computeVaccineOutcome({
        pet,
        protocolKey: protocol.key,
        administeredAt: new Date().toISOString().slice(0, 10),
        vaccines,
        ownerAddress,
      })
      ruleText = preview.ruleText
      stageLabel =
        protocol.key === 'deworm'
          ? 'מניעתי כל 6 חודשים או לפי הצורך'
          : null
    }

    const status = clinicalStatus(dueAt, {
      notRequired: notRequired && !record,
      optionalEmpty,
    })

    return {
      protocol,
      record: record ?? null,
      administeredAt: record?.administeredAt ?? null,
      dueAt,
      status,
      stageLabel,
      displayName,
      ruleText,
      notRequired,
      optionalEmpty,
      productLabel,
      doseCount: history.length,
    }
  })
}

export function findProtocolByKey(key, pet) {
  return getProtocolsForPet(pet, { includeOptionalRabies: true }).find(
    (p) => p.key === key,
  ) ?? null
}

export function isProtocolVaccine(vaccine, pet) {
  const protocols = getProtocolsForPet(pet, { includeOptionalRabies: true })
  return protocols.some((p) => matchesProtocol(vaccine, p))
}
