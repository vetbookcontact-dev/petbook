const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

const DISCLAIMER =
  'מערכת זו אינה מחליפה בדיקה וטרינרית. במקרה חירום יש לפנות מיד למרפאה'

const SYSTEM_PROMPT = `אתה עוזר טריאז׳ וטרינרי באפליקציית וט-בוק.
ענה בעברית קצרה וברורה (4–8 משפטים).
כללים:
- אינך מחליף וטרינר. אל תאבחן בוודאות.
- לעולם אל תמליץ למדוד חום רקטלי בבית.
- אם יש סימני חירום (קשיי נשימה, פרכוסים, דימום חזק, בליעת רעל, חולשה קיצונית) — הנחה לפנות מיד למרפאת חירום.
- אחרת תן מעקב ביתי זהיר ומתי לפנות לווטרינר.
- אל תמציא תרופות או מינונים.`

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders() }
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return json(503, { error: 'GEMINI_API_KEY is not configured' })
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return json(400, { error: 'Invalid JSON' })
  }

  const message = String(body.message || '').trim().slice(0, 2000)
  if (!message) {
    return json(400, { error: 'message is required' })
  }

  const petName = String(body.petName || 'החיה').slice(0, 80)
  const species = body.species === 'cat' ? 'חתול' : 'כלב'

  const prompt = `${SYSTEM_PROMPT}

חיה: ${petName} (${species})
תיאור הבעלים: ${message}`

  try {
    const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      return json(502, { error: data?.error?.message || 'Gemini request failed' })
    }

    const advice = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join('\n')
      .trim()

    if (!advice) {
      return json(502, { error: 'Empty Gemini response' })
    }

    return json(200, {
      advice: `${advice}\n\n${DISCLAIMER}`,
      disclaimer: DISCLAIMER,
      category: 'gemini',
    })
  } catch {
    return json(502, { error: 'Gemini request failed' })
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function json(statusCode, payload) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    body: JSON.stringify(payload),
  }
}
