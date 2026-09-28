import { useEffect, useRef, useState } from "react"
import type { SegmentPayload } from "../api"
import { countWords, formatTime, toSrt, toVtt } from "../format"
import { CheckIcon, CopyIcon, DownloadIcon, PauseIcon, PlayIcon } from "./Icons"
import Timeline from "./Timeline"

interface Props {
  segments: SegmentPayload[]
  loading: boolean
  fileName: string
  audioUrl: string | null
  duration: number
}

const RATES = [1, 1.25, 1.5, 2]

function triggerDownload(content: string, name: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export default function TranscriptionView({ segments, loading, fileName, audioUrl, duration }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)
  const [copied, setCopied] = useState(false)
  const [view, setView] = useState<"segments" | "text">("segments")
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [rate, setRate] = useState(1)
  const [playable, setPlayable] = useState(true)

  const fullText = segments.map((s) => s.text).join(" ")
  const baseName = fileName.replace(/\.[^.]+$/, "") || "transcripcion"
  const active = segments.find((s) => currentTime >= s.start && currentTime < s.end) ?? null
  const activeId = active?.id ?? null

  // Mientras llegan segmentos, seguir el final solo si el usuario no subió a leer
  useEffect(() => {
    const el = listRef.current
    if (loading && el && stickToBottom.current) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [segments.length, loading])

  // Durante la reproducción, mantener visible el segmento activo
  useEffect(() => {
    if (!playing || activeId === null) return
    const el = listRef.current?.querySelector<HTMLElement>(`[data-seg="${activeId}"]`)
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [activeId, playing])

  function seek(time: number, play = false) {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = time
    setCurrentTime(time)
    if (play) audio.play()
  }

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) audio.play()
    else audio.pause()
  }

  function cycleRate() {
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length]
    setRate(next)
    if (audioRef.current) audioRef.current.playbackRate = next
  }

  function copyText() {
    navigator.clipboard.writeText(fullText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const showPlayer = audioUrl && playable && duration > 0
  const tabClass = (on: boolean) =>
    ["px-3 py-1 rounded-md text-xs font-medium transition-colors", on ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"].join(" ")
  const actionClass =
    "flex items-center gap-1.5 text-xs font-medium text-muted hover:text-fg hover:bg-surface-2 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-40 disabled:pointer-events-none"

  return (
    <section className="bg-surface border border-line rounded-2xl overflow-hidden fade-up">
      {/* Barra de herramientas */}
      <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="flex bg-surface-2 rounded-lg p-0.5">
            <button className={tabClass(view === "segments")} onClick={() => setView("segments")}>Segmentos</button>
            <button className={tabClass(view === "text")} onClick={() => setView("text")}>Texto</button>
          </div>
          <span className="text-xs text-faint tabular-nums hidden sm:inline">
            {countWords(fullText).toLocaleString("es")} palabras
          </span>
        </div>

        <div className="flex items-center gap-0.5">
          <button onClick={copyText} disabled={!fullText} className={[actionClass, copied ? "!text-ok" : ""].join(" ")}>
            {copied ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
          <span className="w-px h-4 bg-line mx-1" />
          <DownloadIcon className="w-3.5 h-3.5 text-faint mx-1" />
          {[
            { ext: "txt", make: () => fullText },
            { ext: "srt", make: () => toSrt(segments) },
            { ext: "vtt", make: () => toVtt(segments) },
          ].map(({ ext, make }) => (
            <button
              key={ext}
              disabled={!fullText || loading}
              onClick={() => triggerDownload(make(), `${baseName}.${ext}`)}
              title={loading ? "Disponible al terminar" : `Descargar .${ext}`}
              className={[actionClass, "font-mono uppercase"].join(" ")}
            >
              {ext}
            </button>
          ))}
        </div>
      </div>

      {/* Reproductor */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onError={() => setPlayable(false)}
          className="hidden"
        />
      )}
      {showPlayer && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-line bg-surface-2/40">
          <button
            onClick={togglePlay}
            aria-label={playing ? "Pausar" : "Reproducir"}
            className="w-9 h-9 rounded-full bg-fg text-bg flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition-transform"
          >
            {playing ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4 ml-0.5" />}
          </button>
          <span className="font-mono text-xs text-muted tabular-nums w-11 text-right shrink-0">{formatTime(currentTime)}</span>
          <div className="flex-1 min-w-0">
            <Timeline
              duration={duration}
              segments={segments}
              playhead={currentTime}
              activeId={activeId}
              onSeek={(t) => seek(t)}
              height="sm"
            />
          </div>
          <span className="font-mono text-xs text-faint tabular-nums w-11 shrink-0">{formatTime(duration)}</span>
          <button
            onClick={cycleRate}
            className="font-mono text-xs font-medium text-muted hover:text-fg border border-line rounded-md w-11 py-1 shrink-0 transition-colors"
            aria-label="Velocidad de reproducción"
          >
            {rate}×
          </button>
        </div>
      )}

      {/* Contenido */}
      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
        className="max-h-[34rem] min-h-40 overflow-y-auto px-2 py-3"
      >
        {segments.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-faint">
            <div className="flex items-center gap-1 h-6">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} className="w-1 h-full rounded-full bg-accent/50 bar-dance" style={{ animationDelay: `${i * 120}ms` }} />
              ))}
            </div>
            <p className="text-sm">Los primeros segmentos aparecerán aquí</p>
          </div>
        )}

        {view === "segments" ? (
          <div className="flex flex-col">
            {segments.map((seg) => {
              const isActive = activeId === seg.id
              return (
                <button
                  key={seg.id}
                  data-seg={seg.id}
                  onClick={() => showPlayer && seek(seg.start, true)}
                  className={[
                    "segment-enter group flex gap-4 text-left rounded-xl px-3 py-2 transition-colors",
                    showPlayer ? "cursor-pointer hover:bg-surface-2" : "cursor-text",
                    isActive ? "bg-accent-soft" : "",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "font-mono text-xs pt-[3px] shrink-0 w-12 text-right tabular-nums transition-colors",
                      isActive ? "text-accent-fg" : "text-faint group-hover:text-accent-fg",
                    ].join(" ")}
                  >
                    {formatTime(seg.start)}
                  </span>
                  <span className={["text-[15px] leading-relaxed", isActive ? "text-fg" : "text-fg/85"].join(" ")}>
                    {seg.text}
                  </span>
                </button>
              )
            })}
          </div>
        ) : (
          segments.length > 0 && (
            <p className="px-3 py-1 text-[15px] leading-7 text-fg/90 whitespace-pre-wrap">
              {segments.map((seg) => (
                <span key={seg.id} className={activeId === seg.id ? "bg-accent-soft text-fg rounded" : ""}>
                  {seg.text}{" "}
                </span>
              ))}
            </p>
          )
        )}

        {loading && segments.length > 0 && (
          <div className="flex gap-4 px-3 py-2">
            <span className="w-12 shrink-0" />
            <div className="flex gap-1 items-center h-6">
              {[0, 150, 300].map((d) => (
                <span key={d} className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
