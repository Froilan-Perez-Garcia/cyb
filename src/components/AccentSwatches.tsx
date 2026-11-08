import { useState } from 'react'
import { Check, Pipette } from 'lucide-react'
import { hueFromHex, hueToHex, presets, readHue, saveHue } from '../lib/accent'

const swatch = (hue: number) => `hsl(${hue} 70% 48%)`

export function AccentSwatches({ className = 'flex flex-wrap gap-3' }: { className?: string }) {
  const [hue, setHue] = useState(readHue)
  const custom = !presets.some((preset) => preset.hue === hue)

  const choose = (next: number) => {
    setHue(next)
    saveHue(next)
  }

  return (
    <div className={className}>
      {presets.map((preset) => (
        <button
          key={preset.hue}
          type="button"
          onClick={() => choose(preset.hue)}
          aria-label={preset.name}
          aria-pressed={hue === preset.hue}
          title={preset.name}
          style={{ backgroundColor: swatch(preset.hue) }}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white shadow-card ring-offset-2 ring-offset-surface transition-transform duration-200 hover:scale-110 active:scale-95 aria-pressed:ring-2 aria-pressed:ring-text"
        >
          {hue === preset.hue && <Check size={18} strokeWidth={2.5} />}
        </button>
      ))}
      <label
        title="Color personalizado"
        style={custom ? { backgroundColor: swatch(hue) } : undefined}
        className={`relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-border shadow-card ring-offset-2 ring-offset-surface transition-transform duration-200 hover:scale-110 active:scale-95 focus-within:ring-2 focus-within:ring-accent ${
          custom ? 'text-white ring-2 ring-text' : 'bg-raised text-muted'
        }`}
      >
        {custom ? <Check size={18} strokeWidth={2.5} /> : <Pipette size={16} strokeWidth={1.75} />}
        <input
          type="color"
          aria-label="Color personalizado"
          value={hueToHex(hue)}
          onChange={(event) => choose(hueFromHex(event.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  )
}
