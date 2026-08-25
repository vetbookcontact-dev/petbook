/**
 * Clinical Emergency Triage Engine — rule-based decision matrix.
 * Based on veterinary emergency red-flag protocols.
 * NEVER advise measuring rectal temperature at home.
 */

const DISCLAIMER =
  'מערכת זו אינה מחליפה בדיקה וטרינרית. במקרה חירום יש לפנות מיד למרפאה'

const EMERGENCY_URGENCY = '🚨 רמת דחיפות: חירום רפואי מיידי'
const EMERGENCY_BANNER =
  'הסימנים שתוארו מחייבים בדיקה וטרינרית מיידית במרכז חירום. עיכוב עלול לסכן חיים.'
const CTA_EMERGENCY = 'חיוג מהיר למרכז חירום קרוב'

const URGENT_URGENCY = 'בדיקת וטרינר מומלצת'

function rx(...parts) {
  return new RegExp(parts.join('|'), 'i')
}

function hit(text, re) {
  return re.test(text)
}

function emergencyPayload({ name, category, focus, firstAid }) {
  return {
    urgency: EMERGENCY_URGENCY,
    color: 'red',
    isEmergency: true,
    isHighUrgency: true,
    category,
    banner: EMERGENCY_BANNER,
    ctaLabel: CTA_EMERGENCY,
    advice: `${focus} אצל ${name}. ${firstAid} גשו מיד למרפאת חירום 24/7 — אל תחכו לשיפור ספונטני.`,
    disclaimer: DISCLAIMER,
  }
}

/**
 * Evaluate clinical red flags and return triage result (sync).
 */
export function evaluateClinicalTriage({ petName, message, species = 'dog' }) {
  const text = String(message || '').toLowerCase()
  const name = petName || 'החיה'
  const isCat = species === 'cat' || /חתול/.test(String(species))

  // ── A. Respiratory distress & airway ──
  const openMouthCat =
    isCat &&
    hit(text, /נשימה\s*בפה\s*פתוח|פה\s*פתוח|נושם\s*בפה|open.?mouth/)
  const respiratory = hit(
    text,
    rx(
      'קשי[י]?י?\\s*נשימ',
      'קוצר\\s*נשימ',
      'מצוקה\\s*נשימת',
      'נשימה\\s*(כבדה|מהירה|קשה)',
      'מתנש[פף]',
      'נחנק',
      'חנק',
      'גסיס',
      'לא\\s*נושם',
      'דיספנ',
      'chok',
      'gasping',
      'dyspnea',
    ),
  )
  if (openMouthCat || respiratory) {
    return emergencyPayload({
      name,
      category: 'respiratory',
      focus: openMouthCat
        ? 'נשימה בפה פתוח בחתולים היא חירום חריף (מצוקה נשימתית)'
        : 'חשד למצוקה נשימתית / חנק / נשימה קשה',
      firstAid:
        'שמרו על החיה רגועה ככל האפשר בהעברה; הימנעו מלחיצה על החזה/צוואר. במרפאה יינתן חמצן תומך וטיפול מיידי.',
    })
  }

  // ── B. Trauma & external injuries ──
  const mvaTrauma = hit(
    text,
    rx(
      'פגיעה\\s*מרכב',
      'תאונת?\\s*דרכים',
      'נדרס',
      'נפגע\\s*מרכב',
      'mva',
      'hit\\s*by\\s*car',
    ),
  )
  const highRise = hit(
    text,
    rx('נפילה\\s*מגובה', 'נפל\\s*מגובה', 'high.?rise', 'נפילה\\s*מחלון', 'נפילה\\s*ממרפסת'),
  )
  const biteWound = hit(
    text,
    rx('פצע[י]?\\s*נשיכה', 'נשיכה\\s*(עמוקה|מפושטת|קשה)', 'נשך', 'נשיכת\\s*כלב', 'penetrating\\s*bite'),
  )
  const openFractureBleed = hit(
    text,
    rx(
      'שבר\\s*פתוח',
      'עצם\\s*בולטת',
      'דימום\\s*(עורקי|שלא\\s*נעצר|בלתי\\s*נשלט|חזק)',
      'דימום\\s*לא\\s*נעצר',
      'חתך\\s*(עמוק|רחב)',
      'קרע\\s*עמוק',
      'כוויה\\s*(קשה|עמוקה|נרחבת)',
      'burns?',
    ),
  )
  const proptosis = hit(
    text,
    rx('יציאת?\\s*עין', 'גלגל\\s*העין', 'עין\\s*בולטת', 'עין\\s*יצאה', 'proptosis'),
  )
  const traumaGeneral = hit(
    text,
    rx('טראומ', 'תאונה', 'פציעה\\s*קשה', 'פגיעה\\s*קשה'),
  )

  if (mvaTrauma || highRise || biteWound || openFractureBleed || proptosis || traumaGeneral) {
    let focus = 'חשד לטראומה / פציעה קשה'
    let firstAid =
      'ייצבו בעדינות על משטח קשיח בהעברה, הימנעו מתנועות מיותרות של צוואר/גב, עצרו דימום חיצוני בלחץ עדין עם פד נקי.'
    if (mvaTrauma || highRise) {
      focus =
        'פגיעה מרכב / נפילה מגובה מחייבת בדיקת נזק פנימי ופנאומותורקס גם אם החיה נראית בסדר'
      firstAid =
        'העבירו בזהירות מינימלית; אל תניחו שהיעדר סימנים חיצוניים שולל פגיעה פנימית.'
    } else if (biteWound) {
      focus =
        'פצעי נשיכה מפושטים — העור הוא "קצה הקרחון"; חשד לחדירה לבטן/חזה'
    } else if (proptosis) {
      focus = 'יציאת גלגל העין מערובת העין (פרופטוזיס) — חירום עיני'
      firstAid =
        'שמרו על העין לחה עם גזה סטרילית לחה במלח פיזיולוגי אם יש; אל תדחפו את העין פנימה.'
    } else if (openFractureBleed) {
      focus = 'שבר פתוח / דימום בלתי נשלט / פצע עמוק / כוויה קשה'
    }
    return emergencyPayload({ name, category: 'trauma', focus, firstAid })
  }

  // ── C. Neurological & acute collapse ──
  const seizures = hit(
    text,
    rx(
      'פרכוס',
      'פרכוסים',
      'עווית',
      'עוויתות',
      'התקף\\s*אפילפ',
      'seizure',
      'convulsion',
      'לא\\s*מתאושש\\s*מפרכוס',
    ),
  )
  const collapse = hit(
    text,
    rx(
      'התמוטט',
      'התמוטטות',
      'עילפון',
      'סינקופ',
      'חוסר\\s*הכרה',
      'לא\\s*מגיב',
      'אינו?\\s*מגיב',
      'syncope',
      'unresponsive',
    ),
  )
  const paralysis = hit(
    text,
    rx(
      'שיתוק\\s*פתאומ',
      'שיתוק',
      'גרירת\\s*רגל',
      'גורר\\s*רגליים',
      'רגליים\\s*אחוריות',
      'paresis',
      'paralysis',
      'לא\\s*יכול\\s*לעמוד',
    ),
  )
  const neuroVestibular = hit(
    text,
    rx(
      'אטקסיה',
      'חוסר\\s*שיווי\\s*משקל',
      'איבוד\\s*שיווי',
      'הטיית\\s*ראש',
      'וסטיבולר',
      'תנועה\\s*לא\\s*מתואמת',
      'מסתובב\\s*במעגל',
      'head\\s*tilt',
      'vestibular',
      'ataxia',
    ),
  )

  if (seizures || collapse || paralysis || neuroVestibular) {
    let focus = 'סימן נוירולוגי חריף / התמוטטות'
    let firstAid =
      'שמרו על סביבה שקטה ובטוחה; הרחיקו חפצים חדים; אל תכניסו יד לפה בזמן פרכוס.'
    if (seizures) {
      focus =
        'פרכוסים / עוויתות (במיוחד מעל ~2 דקות או ללא התאוששות מהירה) — חירום נוירולוגי'
    } else if (collapse) {
      focus = 'התמוטטות אקוטית / עילפון / חוסר הכרה'
    } else if (paralysis) {
      focus = 'שיתוק פתאומי / גרירת רגליים אחוריות'
      firstAid = 'העבירו על משטח קשיח; ייצבו עמוד שדרה ככל האפשר; הימנעו מכיפוף.'
    } else if (neuroVestibular) {
      focus = 'אטקסיה / הטיית ראש / תסמונת וסטיבולרית / אובדן שיווי משקל'
    }
    return emergencyPayload({ name, category: 'neuro', focus, firstAid })
  }

  // ── D. GI & abdominal ──
  const gdv = hit(
    text,
    rx(
      'היפוך\\s*קיבה',
      'gdv',
      'בטן\\s*תפוחה',
      'נפיחות\\s*בטנית',
      'הקא(ה|ות)\\s*יבש',
      'ניסיונות\\s*הקאה\\s*יבש',
      'הקאה\\s*לא\\s*פוריה',
      'retching',
    ),
  )
  const projectileVomit = hit(
    text,
    rx(
      'הקא(ה|ות)\\s*(מרובות|בלתי\\s*נשלטות|חזקות|טיל)',
      'הקאה\\s*טילית',
      'רגורגיטצ',
      'חשד\\s*לחסימת\\s*מעי',
      'projectile',
    ),
  )
  const linearFb =
    hit(
      text,
      rx('חוט(ים)?', 'שרוך', 'שרוכים', 'סרט(ים)?', 'צמר', 'ליניאר', 'ribbon', 'string', 'yarn'),
    ) &&
    (hit(text, rx('בלע', 'בליע', 'בלעה', 'גוף\\s*זר', 'בפה', 'מהפה', 'מהפי\\s*הטבעת', 'יוצא\\s*חוט', 'תקוע')) ||
      isCat)

  const foreignObject =
    hit(
      text,
      rx(
        'גוף\\s*זר',
        'צעצוע',
        'גרב',
        'גרביים',
        'בד',
        'פלסטיק',
        'אבן',
        'עצם\\s*תקוע',
        'עצמות',
        'בלע\\s*(משהו|חפץ)',
        'בליעת\\s*(חפץ|גוף)',
        'foreign\\s*body',
        'sock',
        'toy',
      ),
    ) ||
    (hit(text, /בלע|בליע|בלעה/) &&
      hit(text, /צעצוע|גרב|פלסטיק|אבן|בד|חפץ|עצם|כדור|מתכת|גומי/))

  const bloodyDiarrhea = hit(
    text,
    rx('שלשול\\s*דמי', 'צואה\\s*עם\\s*דם', 'דיזנטריה', 'דלקת\\s*מעיים\\s*דמית', 'bloody\\s*diarrhea', 'דם\\s*בצואה'),
  )
  const orificeBleed = hit(
    text,
    rx(
      'דימום\\s*(מהפה|מהאף|מהטוסיק|מהפי\\s*הטבעת)',
      'דם\\s*(מהפה|מהאף)',
      'דימום\\s*מפתחי\\s*הגוף',
    ),
  )

  if (linearFb) {
    return emergencyPayload({
      name,
      category: 'linear_foreign_body',
      focus:
        'חשד לבליעת גוף זר ליניארי (חוט/שרוך/סרט/צמר) — חירום כירורגי (קפל מעיים / נמק)',
      firstAid:
        'לעולם אל תמשכו חוט בולט מהפה או מהפי הטבעת — משיכה עלולה לקרוע את המעי. אל תגרמו להקאה.',
    })
  }

  if (gdv) {
    return emergencyPayload({
      name,
      category: 'gdv',
      focus: 'חשד להיפוך קיבה (GDV) — נפיחות בטנית / הקאות יבשות',
      firstAid: 'העבירו מיד ללא האכלה/שתייה נוספת; אל תנסו ללחוץ על הבטן.',
    })
  }

  if (projectileVomit || bloodyDiarrhea || orificeBleed) {
    let focus = 'חירום במערכת העיכול / דימום'
    if (projectileVomit) focus = 'הקאות בלתי נשלטות / חשד לחסימת מעיים או גוף זר'
    else if (bloodyDiarrhea) focus = 'שלשול דמי חריף / דלקת מעיים דמית'
    else if (orificeBleed) focus = 'דימום מפתחי הגוף (פה/אף/רקטום)'
    return emergencyPayload({
      name,
      category: 'gi_bleed',
      focus,
      firstAid: 'אל תתנו מזון או תרופות ללא הנחיית וטרינר; העבירו למרפאה בהקדם.',
    })
  }

  if (foreignObject) {
    return emergencyPayload({
      name,
      category: 'foreign_object',
      focus:
        'חשד לבליעת גוף זר שאינו מזון (צעצוע/גרב/פלסטיק/עצם וכו׳) — סיכון לחסימה/ניקוב',
      firstAid:
        'אין מעקב ביתי פסיבי. אל תגרמו להקאה ללא הנחיית וטרינר ישירה.',
    })
  }

  // ── E. Urological ──
  const urinaryBlock = hit(
    text,
    rx(
      'חוסר\\s*מתן\\s*שתן',
      'לא\\s*משתינ',
      'אינו?\\s*משתינ',
      'חסימת\\s*שתן',
      'סתימת\\s*שתן',
      'מאמץ\\s*(בארגז|להשתין)',
      'ארגז\\s*.*ללא\\s*שתן',
      'נכנס\\s*ויוצא\\s*מהארגז',
      'ילל.*שתן',
      'טיפות\\s*שתן',
      'רק\\s*טיפות',
      'מתאמץ\\s*להשתין',
      'urinary\\s*obstruct',
      'flutd',
    ),
  )
  if (urinaryBlock) {
    return emergencyPayload({
      name,
      category: 'urinary',
      focus: isCat
        ? 'חשד לחסימת שתן בחתול (FLUTD) — סיכון לקריסת כליות / הפרעות אלקטרוליטים תוך שעות'
        : 'חשד לחסימת שתן / מאמץ במתן שתן עם טפטוף בלבד',
      firstAid: 'אל תחכו — מדובר במצב מסכן חיים. העבירו מיד למרפאת חירום.',
    })
  }

  // ── E2. Paraphimosis & penile hemorrhage (male urogenital emergencies) ──
  const penisContext = hit(
    text,
    rx('פין', 'איבר\\s*מין', 'פראפימוזיס', 'paraphimosis', 'prepuce', 'penis', 'נדן'),
  )
  const failsRetract = hit(
    text,
    rx(
      'לא\\s*חוזר',
      'אינו?\\s*חוזר',
      'לא\\s*נכנס\\s*חזרה',
      'לא\\s*חוזר\\s*(פנימה|לנרתיק|לנדן)',
    ),
  )
  const paraphimosis =
    hit(
      text,
      rx(
        'פראפימוזיס',
        'paraphimosis',
        'יצא\\s*הפין',
        'הפין\\s*יצא',
        'פין\\s*בחוץ',
        'איבר\\s*מין\\s*בחוץ',
        'פין\\s*(נפוח|בולט|אדום|סגול|כחול)',
        'איבר\\s*מין\\s*(נפוח|בולט|אדום|סגול)',
        'פין\\s*שלא\\s*חוזר',
        'נדן\\s*.*לא\\s*חוזר',
        'prolapsed?\\s*penis',
        'penis\\s*(out|stuck|swollen|protrud)',
      ),
    ) ||
    (penisContext && failsRetract)

  const penileBleed = hit(
    text,
    rx(
      'דימום\\s*מהפין',
      'דם\\s*מהפין',
      'דם\\s*מאיבר\\s*המין',
      'דימום\\s*מאיבר\\s*המין(\\s*הזכרי)?',
      'דימום\\s*מהאיבר',
      'דם\\s*מהאיבר',
      'דימום\\s*אורתרל',
      'penile\\s*(bleed|hemorrh)',
      'bleeding\\s*from\\s*(the\\s*)?penis',
    ),
  )

  if (paraphimosis || penileBleed) {
    if (paraphimosis) {
      return emergencyPayload({
        name,
        category: 'paraphimosis',
        focus:
          'חשד לפראפימוזיס (פין בולט/נפוח שאינו חוזר לנרתיק) — חירום אורולוגי מיידי',
        firstAid:
          'שמרו על הרקמה החשופה לחה (מים סטריליים / ג׳ל מסיס במים כמו K-Y או קומפרסים לחים וקרים), מנעו ליקוק (קולר אליזבתי אם יש), וגשו מיד למרפאה. עיכוב גורם לחסימת ורידים, בצקת, איסכמיה ונמק — סיכון לנזק בלתי הפיך או קטיעה.',
      })
    }
    return emergencyPayload({
      name,
      category: 'penile_hemorrhage',
      focus:
        'דימום מהפין / מאיבר המין הזכרי — חירום מיידי (טראומה לשופכה, זיהום, קרע כלי דם או הפרעת קרישה)',
      firstAid:
        'לחצו בעדינות עם גזה נקייה אם יש דימום חיצוני נראה; אל תניחו חוסם עורקים. העבירו מיד למרפאת חירום — אין מעקב ביתי.',
    })
  }

  // ── F. Toxicities & envenomation ──
  const rodenticide = hit(
    text,
    rx('רעל\\s*עכבר', 'רעל\\s*עכברים', 'rodenticide', 'warfarin', 'ברומדיולון'),
  )
  const snailBait = hit(text, rx('רעל\\s*חלזון', 'רעל\\s*חלזונות', 'מטאלדהיד', 'snail\\s*bait', 'slug\\s*bait'))
  const toxicFood = hit(
    text,
    rx(
      'שוקולד',
      'ענב(ים)?',
      'צימוק(ים)?',
      'בצל',
      'שום',
      'קסיליטול',
      'xylitol',
      'מסטיק',
      'אבוקדו',
      'אגוזי\\s*מקדמיה',
      'macadamia',
    ),
  )
  const humanMedsChem = hit(
    text,
    rx(
      'תרופות?\\s*(של\\s*)?(אנשים|אדם|אנושי)',
      'איבופרופן',
      'אקמול',
      'פרצטמול',
      'אספירין',
      'חומר\\s*ניקוי',
      'אקונומיקה',
      'אנטיפריז',
      'אתילן\\s*גליקול',
      'הרעלת\\s*תרופות',
    ),
  )
  const snake = hit(
    text,
    rx('הכשת?\\s*נחש', 'נחש', 'הכשה', 'ארס', 'envenom', 'snake\\s*bite'),
  )

  if (rodenticide || snailBait || toxicFood || humanMedsChem || snake) {
    let focus = 'חשד להרעלה / חשיפה לרעלן'
    let firstAid =
      'אל תגרמו להקאה בבית ללא הנחיית וטרינר ישירה. הביאו אריזה/דגימה של החומר אם בטוח.'
    if (snake) {
      focus = 'חשד להכשת נחש — חירום מיידי'
      firstAid =
        'שמרו על החיה רגועה ומוגבלת בתנועה; אל תחתכו, אל תמצצו ארס ואל תניחו חוסם עורקים. אם בטוח — צלמו את הנחש מרחוק לזיהוי אנטי-ארס.'
    } else if (toxicFood) {
      focus =
        'חשד לבליעת מזון רעיל (שוקולד / ענבים-צימוקים / בצל-שום / קסיליטול ועוד)'
      firstAid =
        'הזמן קריטי — במרפאה יישקלו ריקון קיבה / השראת הקאה מבוקרת. אל תשראו הקאה בבית לבד.'
    } else if (rodenticide) {
      focus = 'חשד לחשיפה לרעל עכברים (רודנטיציד)'
    } else if (snailBait) {
      focus = 'חשד לחשיפה לרעל חלזונות'
    } else if (humanMedsChem) {
      focus = 'חשד לבליעת תרופות אנושיות / חומרי ניקוי / כימיקלים'
    }
    // fix typo תשראו -> תגרמו
    if (toxicFood) {
      firstAid =
        'הזמן קריטי — במרפאה יישקלו ריקון קיבה / השראת הקאה מבוקרת. אל תגרמו להקאה בבית ללא הנחיית וטרינר.'
    }
    return emergencyPayload({
      name,
      category: snake ? 'snake' : 'toxicity',
      focus,
      firstAid,
    })
  }

  // ── G1. Dystocia / obstructed labor (active whelping/queening) ──
  const dystocia = hit(
    text,
    rx(
      'דיסטוק',
      'המלטה\\s*תקועה',
      'קשי[י]?י?\\s*המלט',
      'לידה\\s*(קשה|ארוכה|תקועה)',
      'מתקשה\\s*ללדת',
      'גור\\s*תקוע',
      'צירים\\s*(מעל|ארוכים|ללא\\s*התקדמות|פעילים)',
      'dystocia',
      'obstructed\\s*labor',
    ),
  )
  if (dystocia) {
    return emergencyPayload({
      name,
      category: 'dystocia',
      focus:
        'חשד לדיסטוקיה / המלטה תקועה (צירים פעילים ממושכים ללא התקדמות או גור תקוע)',
      firstAid: 'אל תמשכו גורים; העבירו מיד למרפאה למיילדות דחופה.',
    })
  }

  // ── G2. Postpartum & maternal emergencies ──
  const postpartumContext = hit(
    text,
    rx(
      'אחרי\\s*המלט',
      'לאחר\\s*המלט',
      'המליטה',
      'המליטה\\s*',
      'אחרי\\s*לידה',
      'לאחר\\s*לידה',
      'פוסט.?פרט',
      'postpartum',
      'לאחר\\s*ההמלט',
      'אחרי\\s*שהמליטה',
      'אחרי\\s*שהמליט',
      'כלבה\\s*אחרי\\s*המלט',
      'חתולה\\s*אחרי\\s*המלט',
      'מטריטיס',
      'metritis',
      'קדחת\\s*חלב',
      'רעלת\\s*הריון',
      'eclamps',
      'hypocalc',
    ),
  )
  // Bare "המלטה" near maternal red flags also counts as postpartum window
  const recentWhelping =
    postpartumContext ||
    (hit(text, /המלט|המליט|לידה/) &&
      hit(
        text,
        rx(
          'הפרש',
          'מניק',
          'גורים',
          'גורי',
          'חלשים',
          'אפת',
          'רעד',
          'רעיד',
          'חום',
          'לא\\s*אוכל',
        ),
      ))

  const foulLochia = hit(
    text,
    rx(
      'הפרשות?\\s*(עם\\s*)?ריח\\s*רע',
      'ריח\\s*רע\\s*מהפות',
      'הפרשות?\\s*(מוגלתי|מסריח|חריג|לא\\s*תקינ|חום|חוםות)',
      'לוכיה',
      'lochia',
      'הפרשות?\\s*מהפות',
      'מוגלה\\s*מהפות',
      'הפרשה\\s*מוגלתית',
      'purulent',
    ),
  )
  const maternalWeakness = hit(
    text,
    rx(
      'חולשה',
      'חלשה',
      'חוסר\\s*חיוניות',
      'לתרג',
      'אפת',
      'אפאת',
      'רדום',
      'רעד',
      'רעיד',
      'רעידות',
      'חום',
      'tremor',
    ),
  )
  const refuseNurse = hit(
    text,
    rx(
      'לא\\s*מניק',
      'אינה?\\s*מניק',
      'חוסר\\s*רצון\\s*להניק',
      'מסרבת?\\s*להניק',
      'לא\\s*רוצה\\s*להניק',
      'הזנחת?\\s*הגורים',
      'לא\\s*מטפלת?\\s*בגורים',
      'refuse[sd]?\\s*to\\s*nurse',
    ),
  )
  const maternalAnorexia = hit(
    text,
    rx(
      'ירידה\\s*באכיל',
      'ירידה\\s*בשתי',
      'לא\\s*אוכל',
      'לא\\s*שות',
      'אנורקס',
      'מסרבת?\\s*לאכול',
      'חוסר\\s*תיאבון',
    ),
  )
  const maternalBehavior = hit(
    text,
    rx(
      'אי\\s*שקט',
      'אגרסיבי',
      'תוקפנ',
      'אפתיה\\s*קיצונ',
      'שינוי\\s*התנהגות',
      'בהלה',
      'הזנח',
    ),
  )
  const eclampsiaSigns = hit(
    text,
    rx(
      'רעד\\s*שריר',
      'רעידות?\\s*שריר',
      'הליכה\\s*נוקשה',
      'נוקשות',
      'טטני',
      'אי\\s*שקט',
      'restlessness',
      'stiff\\s*gait',
      'muscle\\s*tremor',
    ),
  )

  if (
    recentWhelping &&
    (foulLochia ||
      maternalWeakness ||
      refuseNurse ||
      maternalAnorexia ||
      maternalBehavior ||
      eclampsiaSigns)
  ) {
    let focus =
      'חירום אימהי לאחר המלטה — סיכון למטריטיס / אלח דם / קדחת חלב (אקלמפסיה)'
    let firstAid =
      'גשו מיד למרפאה. אל תחכו לשיפור: דלקת רחם לאחר המלטה עלולה להתדרדר לשוק ספטי תוך שעות. שמרו על הגורים חמים ובטוחים בהעברה.'
    if (foulLochia) {
      focus =
        'הפרשות עם ריח רע / מוגלתיות מהפות לאחר המלטה — חשד למטריטיס חריפה (סיכון לשוק ספטי)'
    } else if (eclampsiaSigns || (maternalWeakness && hit(text, /רעד|רעיד|חום|נוקש/))) {
      focus =
        'חשד לקדחת חלב / אקלמפסיה (היפוקלצמיה) לאחר המלטה — רעד, אי-שקט או הליכה נוקשה'
      firstAid =
        'צמצמו גירוי ושמרו על שקט בהעברה; זה חירום מיידי — במרפאה יינתן סידן תוך-ורידי בפיקוח.'
    } else if (refuseNurse) {
      focus =
        'חוסר רצון להניק / הזנחת גורים לאחר המלטה — סימן אזהרה אימהי חמור'
    }
    return emergencyPayload({
      name,
      category: 'postpartum',
      focus,
      firstAid,
    })
  }

  // ── G3. Neonatal / young puppy & kitten emergencies ──
  // Note: JS \b is ASCII-oriented and unreliable for Hebrew tokens.
  const neonatalContext = hit(
    text,
    rx(
      'גור(ים)?',
      'גורה',
      'גורי\\s',
      'חתלתול(ים)?',
      'neonat',
      'pupp(y|ies)',
      'kitten',
      'fading\\s*(puppy|kitten)',
      'גור\\s*צעיר',
      'גורים\\s*צעירים',
      'בן\\s*ימים',
      'בת\\s*ימים',
      'שבוע\\s*ראשון',
      'ניאטול',
    ),
  )
  const neonateNotEating = hit(
    text,
    rx(
      'גור\\s*לא\\s*אוכל',
      'גורים\\s*לא\\s*אוכל',
      'לא\\s*יונק',
      'אינו?\\s*יונק',
      'מסרב(ים)?\\s*לינוק',
      'מסרב(ים)?\\s*לאכול',
      'סירוב\\s*לינוק',
      'לא\\s*אוכל',
      'חוסר\\s*תיאבון',
      'inappeten',
      'not\\s*nursing',
    ),
  )
  const neonateGi = hit(
    text,
    rx(
      'גור\\s*משלשל',
      'גור\\s*מקיא',
      'גורים\\s*(מקיא|משלשל|עם\\s*שלשול)',
      'משלשל',
      'מקיא',
      'הקא',
      'שלשול',
      'diarrhea',
      'vomiting',
    ),
  )
  const neonateWeak = hit(
    text,
    rx(
      'גורים\\s*חלשים',
      'גור\\s*חלש',
      'אפאת',
      'אפת',
      'לתרג',
      'חלש',
      'שקט\\s*מדי',
      'בוכה\\s*ברציפות',
      'בוכים\\s*בלי\\s*הפסק',
      'היפותרמ',
      'קר\\s*למגע',
      'שינוי\\s*התנהגות',
      'hypotherm',
      'letharg',
    ),
  )

  if (neonatalContext && (neonateNotEating || neonateGi || neonateWeak)) {
    let focus =
      'חירום בגור/חתלתול צעיר — רזרבות פיזיולוגיות מינימליות; סכנת קריסה מהירה'
    let firstAid =
      'גשו מיד למרפאה. שמרו על חום גוף (עטיפה חמה, לא חימום יתר), אל תכפו האכלה בכוח בבית ללא הנחיה — סיכון לשאיפה.'
    if (neonateNotEating) {
      focus =
        'גור/חתלתול שאינו יונק או מסרב לאכול — סכנת היפוגליקמיה מהירה וקריסת מערכות (fading puppy/kitten)'
    } else if (neonateGi) {
      focus =
        'הקאות או שלשולים בגורים צעירים — סכנת התייבשות קיצונית והלם תוך שעות'
    } else if (neonateWeak) {
      focus =
        'גורים חלשים / אפאתיים / שקטים מדי או בוכים ברציפות — סימן לחירום נאונטלי'
    }
    return emergencyPayload({
      name,
      category: 'neonatal',
      focus,
      firstAid,
    })
  }

  // ── G4. Genitourinary / reproductive discharge (vulva / pyometra) ──
  // Penile bleeding is handled earlier as immediate emergency (E2).
  const genitalDischarge = hit(
    text,
    rx(
      'הפרשות?\\s*מהפות',
      'ריח\\s*רע\\s*מהפות',
      'הפרשה\\s*(מהפות|מהנרתיק)',
      'דימום\\s*(מהפות|מהנרתיק)',
      'דם\\s*מהפות',
      'פיומטרה',
      'pyometra',
      'הפרשות?\\s*מוגלתי',
      'דימום\\s*וגינל',
      'discharge\\s*from\\s*vulva',
    ),
  )
  const systemicWeak = hit(
    text,
    rx(
      'חולשה',
      'חלש',
      'חלשים',
      'לתרג',
      'אפת',
      'אפאת',
      'רדום',
      'חוסר\\s*חיוניות',
      'עייפ',
      'לא\\s*מגיב',
    ),
  )

  if (genitalDischarge && systemicWeak) {
    return emergencyPayload({
      name,
      category: 'pyometra_emergency',
      focus:
        'הפרשות/דימום מדרכי המין עם חולשה או אפתיה — חשד לפיומטרה סגורה / זיהום חמור עם סכנת חיים (שוק ספטי)',
      firstAid:
        'גשו מיד למרפאת חירום. פיומטרה וזיהום רחמי עלולים להתדרדר במהירות לקריסת מערכות.',
    })
  }

  if (genitalDischarge) {
    return {
      urgency: 'בדיקת וטרינר דחופה',
      color: 'orange',
      isEmergency: false,
      isHighUrgency: true,
      category: 'pyometra_urgent',
      banner:
        'הפרשות או דימום מדרכי המין מצדיקים בדיקה דחופה — חשד לפיומטרה, דלקת בדרכי השתן או זיהום.',
      ctaLabel: CTA_EMERGENCY,
      advice: `זוהו הפרשות עם ריח רע ו/או דימום מהפות אצל ${name}. זה חשד לפיומטרה או זיהום חמור — קבעו בדיקת וטרינר דחופה עוד היום. אם מופיעים חולשה, אפתיה או סירוב לאכול — זה הופך לחירום מיידי.`,
      disclaimer: DISCLAIMER,
    }
  }

  // ── H. Environmental & severe pain / acute behavior ──
  const heatstroke = hit(
    text,
    rx('מכת\\s*חום', 'היפרתרמ', 'התנשפות\\s*קיצונ', 'חום\\s*כבד', 'heat\\s*stroke'),
  )
  const severePain = hit(
    text,
    rx('כאב\\s*(חריף|בלתי\\s*נסבל|קשה)', 'ילל(ות|ת)?\\s*כאב', 'צועק\\s*מכא', 'סימני\\s*כאב\\s*חריפ'),
  )
  const acuteBehavior = hit(
    text,
    rx(
      'תוקפנות\\s*פתאומית',
      'אפתיה\\s*חריפה',
      'סטופור',
      'בהלה\\s*(קיצונית|פתאומית)',
      'שינוי\\s*התנהגות\\s*(קיצוני|פתאומי)',
      'פאניקה',
      'stupor',
    ),
  )
  const anorexiaCat =
    isCat &&
    hit(
      text,
      rx(
        'אנורקס',
        'חוסר\\s*אכילה\\s*מוחלט',
        'לא\\s*אוכל\\s*(כלום|כלל|מעל|כבר)',
        'מסרב\\s*לאכול',
        'סירוב\\s*לאכול',
      ),
    )

  if (heatstroke || severePain || acuteBehavior || anorexiaCat) {
    let focus = 'מצב חירום סביבתי / כאב / התנהגות חריפה'
    let firstAid = 'העבירו למרפאה מיד; הימנעו מתרופות ביתיות.'
    if (heatstroke) {
      focus = 'חשד למכת חום'
      firstAid =
        'העבירו לסביבה קרירה, הרטיבו בעדינות במים פושרים (לא קרח), והגיעו מיד למרפאה.'
    } else if (severePain) {
      focus = 'כאב חריף / בלתי נשלט'
    } else if (acuteBehavior) {
      focus = 'שינוי התנהגות קיצוני פתאומי (תוקפנות / סטופור / בהלה)'
    } else if (anorexiaCat) {
      focus = 'אנורקסיה / סירוב מוחלט לאכול בחתול — סיכון להיפטוזיס כבדי'
    }
    return emergencyPayload({ name, category: 'environment', focus, firstAid })
  }

  // ── Non-emergency urgent / home watch ──
  const apathy = hit(
    text,
    rx('אפת', 'אפאת', 'לתרג', 'עייפ(ות)?', 'ירידה\\s*.*חיוניות', 'רדום', 'שוכב\\s*כל\\s*היום'),
  )
  const inappetence = hit(
    text,
    rx('חוסר\\s*תיאבון', 'לא\\s*אוכל', 'לא\\s*שותה', 'ירידה\\s*באכיל', 'מיעוט\\s*שתי'),
  )
  const gi = hit(text, rx('הקא', 'שלשול', 'שלשולים', 'הקאות\\s*חוזר'))
  const limp = hit(text, rx('צליע', 'צלע', 'לא\\s*דורך', 'כאב\\s*ברגל', 'לימפ'))

  if (apathy) {
    return {
      urgency: URGENT_URGENCY,
      color: 'orange',
      isEmergency: false,
      isHighUrgency: false,
      category: 'apathy',
      banner: null,
      ctaLabel: null,
      advice: `אפתיה וירידה בחיוניות אצל ${name} דורשות בדיקת וטרינר בהקדם. עקבו אחרי שתייה ואכילה — אם הלתרגיה נמשכת או מחמירה, גשו למרפאה עוד היום.`,
      disclaimer: DISCLAIMER,
    }
  }

  if (gi || inappetence || limp) {
    let tip = `מומלץ לקבוע בדיקת וטרינר בהקדם עבור ${name}.`
    if (gi) {
      tip = `הקאות ו/או שלשולים אצל ${name}: שמרו על שתייה; אם נמשכים, יש דם, או מופיעה חולשה — גשו למרפאה בהקדם.`
    } else if (inappetence) {
      tip = `חוסר אכילה/שתייה אצל ${name} מצדיק בדיקת וטרינר בהקדם, במיוחד אם נמשך מעל יממה.`
    } else if (limp) {
      tip = `צליעה אצל ${name}: הגבילו פעילות. אם נמשך מעל 24 שעות או מלווה בכאב חזק — קבעו תור לווטרינר.`
    }
    return {
      urgency: URGENT_URGENCY,
      color: 'amber',
      isEmergency: false,
      isHighUrgency: false,
      category: 'urgent_general',
      banner: null,
      ctaLabel: null,
      advice: tip,
      disclaimer: DISCLAIMER,
    }
  }

  return {
    urgency: 'מעקב ביתי עם ערנות',
    color: 'teal',
    isEmergency: false,
    isHighUrgency: false,
    category: 'home_watch',
    banner: null,
    ctaLabel: null,
    advice: `מומלץ לעקוב אחרי מצב ${name}, לוודא שתייה ואכילה תקינות, ולפנות לווטרינר אם מופיעים אפתיה, קשיי נשימה, הקאות חוזרות, חשד לבליעת חפץ/רעל או החמרה. במצב חירום — גשו מיד למרפאה.`,
    disclaimer: DISCLAIMER,
  }
}
