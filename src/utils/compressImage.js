const MAX_WIDTH = 400
const MAX_BYTES = 100 * 1024
const START_QUALITY = 0.7
const MIN_QUALITY = 0.4

function approxBytes(dataUrl) {
  const base64 = String(dataUrl).split(',')[1] || ''
  return Math.ceil((base64.length * 3) / 4)
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('שגיאה בקריאת התמונה'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('שגיאה בטעינת התמונה'))
    img.src = src
  })
}

/**
 * Resize to max 400px width and JPEG quality 0.7.
 * If still over ~100KB, step quality down toward 0.4.
 * http(s) URLs (e.g. Google avatar) are returned unchanged.
 */
export async function compressImage(source) {
  if (!source) return ''
  if (typeof source === 'string' && /^https?:\/\//i.test(source)) return source

  const dataUrl = source instanceof Blob ? await fileToDataUrl(source) : String(source)
  const img = await loadImage(dataUrl)
  const scale = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('שגיאה בעיבוד התמונה')
  ctx.drawImage(img, 0, 0, width, height)

  let quality = START_QUALITY
  let result = canvas.toDataURL('image/jpeg', quality)
  while (approxBytes(result) > MAX_BYTES && quality > MIN_QUALITY + 0.01) {
    quality = Math.max(MIN_QUALITY, Math.round((quality - 0.1) * 10) / 10)
    result = canvas.toDataURL('image/jpeg', quality)
  }
  return result
}
