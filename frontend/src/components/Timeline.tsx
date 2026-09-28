import type { KeyboardEvent, PointerEvent } from "react"
import type { SegmentPayload } from "../api"
import { formatTime } from "../format"

interface Props {
  duration: number
  segments: SegmentPayload[]
  /** Hasta dónde llegó la transcripción (segundos). */
  processed?: number
  /** Posición actual del reproductor (segundos). */
  playhead?: number
  activeId?: number | null
  onSeek?: (time: number) => void
  height?: "sm" | "md"
}

/**
 * Pista del audio completo: cada barra es un segmento transcrito. Los huecos
 * son silencios que el VAD descartó.
 */
export default function Timeline({ duration, segments, processed, playhead, activeId, onSeek, height = "md" }: Props) {
  const pct = (t: number) => `${Math.min(100, Math.max(0, (t / duration) * 100))}%`
  const interactive = !!onSeek && duration > 0

  function seekFromPointer(e: PointerEvent<HTMLDivElement>) {
    if (!interactive) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    onSeek!(ratio * duration)
  }

  function handleKey(e: KeyboardEvent<HTMLDivElement>) {
    if (!interactive || playhead === undefined) return
    const step = e.shiftKey ? 30 : 5
    if (e.key === "ArrowRight") onSeek!(Math.min(duration, playhead + step))
    else if (e.key === "ArrowLeft") onSeek!(Math.max(0, playhead - step))
    else return
    e.preventDefault()
  }

  return (
    <div
      role={interactive ? "slider" : "img"}
      aria-label={interactive ? "Posición de reproducción" : "Progreso de la transcripción sobre el audio"}
      aria-valuemin={interactive ? 0 : undefined}
      aria-valuemax={interactive ? Math.round(duration) : undefined}
      aria-valuenow={interactive ? Math.round(playhead ?? 0) : undefined}
      aria-valuetext={interactive ? formatTime(playhead ?? 0) : undefined}
      tabIndex={interactive ? 0 : undefined}
      onPointerDown={(e) => {
        if (!interactive) return
        e.currentTarget.setPointerCapture(e.pointerId)
        seekFromPointer(e)
      }}
      onPointerMove={(e) => {
        if (e.buttons === 1) seekFromPointer(e)
      }}
      onKeyDown={handleKey}
      className={[
        "relative w-full rounded-md bg-surface-2 overflow-hidden touch-none select-none",
        height === "sm" ? "h-6" : "h-9",
        interactive ? "cursor-pointer" : "",
      ].join(" ")}
    >
      {processed !== undefined && (
        <div
          className="absolute inset-y-0 left-0 bg-accent-soft transition-[width] duration-500 ease-out"
          style={{ width: pct(processed) }}
        />
      )}

      {segments.map((seg) => (
        <div
          key={seg.id}
          className={[
            "absolute top-1/2 -translate-y-1/2 rounded-[2px] transition-colors",
            height === "sm" ? "h-3" : "h-5",
            seg.id === activeId ? "bg-accent-fg" : "bg-accent",
          ].join(" ")}
          style={{
            left: pct(seg.start),
            width: `max(2px, calc(${pct(seg.end - seg.start)} - 1px))`,
            opacity: seg.id === activeId ? 1 : 0.7,
          }}
        />
      ))}

      {playhead !== undefined && (
        <div className="absolute inset-y-0 w-0.5 -ml-px bg-fg pointer-events-none" style={{ left: pct(playhead) }} />
      )}
    </div>
  )
}
