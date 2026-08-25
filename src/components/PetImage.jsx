import { useEffect, useState } from 'react'
import { PawPrint } from 'lucide-react'

/**
 * Safe pet image with fixed box sizing — never expands beyond className dimensions.
 */
export default function PetImage({
  src,
  alt = '',
  className = '',
  iconClassName = 'h-5 w-5 text-brand-400',
  fallbackClassName = 'bg-gradient-to-br from-brand-100 to-teal-100 text-brand-700',
}) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  const showImage = Boolean(src) && !failed

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden ${
        showImage ? 'bg-slate-100' : fallbackClassName
      } ${className}`}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={!alt}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <PawPrint className={iconClassName} />
      )}
    </span>
  )
}
