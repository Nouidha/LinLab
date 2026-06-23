import { useState, useRef, useEffect } from 'react'

function fmt(v) {
  const r = Math.round(v * 1000) / 1000
  return Number.isInteger(r) ? String(r) : r.toFixed(3).replace(/0+$/, '')
}

// Controlled number input that allows intermediate states like "-" or "1." while typing.
// External value changes (e.g. from animation) update the display only when the field is not focused.
export default function NumInput({ value, onChange, className, style, ...props }) {
  const [raw, setRaw] = useState(() => fmt(value ?? 0))
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) setRaw(fmt(value ?? 0))
  }, [value])

  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      className={className}
      style={style}
      value={raw}
      onFocus={() => { focused.current = true }}
      onChange={e => {
        const str = e.target.value
        setRaw(str)
        const n = parseFloat(str)
        if (!isNaN(n)) onChange(n)
      }}
      onBlur={() => {
        focused.current = false
        const n = parseFloat(raw)
        if (isNaN(n)) {
          setRaw(fmt(value ?? 0))
        } else {
          onChange(n)
          setRaw(fmt(n))
        }
      }}
    />
  )
}
