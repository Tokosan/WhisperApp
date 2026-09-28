import type { MetaPayload, SegmentPayload } from "../api"
import { countWords, formatBytes, formatDuration, formatTime, languageName } from "../format"
import { AlertIcon, CheckIcon, FileAudioIcon, RefreshIcon, XIcon } from "./Icons"
import Timeline from "./Timeline"

export type Phase = "idle" | "uploading" | "preparing" | "transcribing" | "done" | "error"

export interface Timings {
  start: number
  uploaded?: number
  meta?: number
  end?: number
}

interface Props {
  phase: Phase
  file: File
  model: string
  modelWasLoaded: boolean
  upload: number
  meta: MetaPayload | null
  segments: SegmentPayload[]
  timings: Timings
  now: number
  cancelled: boolean
  error: string
  onCancel: () => void
  onRetry: () => void
  onReset: () => void
}

const STEPS = [
  { key: "uploading", label: "Subida" },
  { key: "preparing", label: "Preparación" },
  { key: "transcribing", label: "Transcripción" },
] as const

function stepState(step: (typeof STEPS)[number]["key"], phase: Phase, t: Timings) {
  const reached = { uploading: true, preparing: !!t.uploaded, transcribing: !!t.meta }[step]
  const finished = { uploading: !!t.uploaded, preparing: !!t.meta, transcribing: phase === "done" }[step]
  if (finished) return "done"
  if (phase === "error" && reached) return "error"
  if (phase === step) return "active"
  return "pending"
}

export default function ProgressPanel(props: Props) {
  const { phase, file, model, modelWasLoaded, upload, meta, segments, timings, now, cancelled, error } = props
  const active = phase === "uploading" || phase === "preparing" || phase === "transcribing"
  const t = timings.end ?? now

  const processed = segments.at(-1)?.end ?? 0
  const duration = meta?.duration ?? 0
  const transcribePct = duration > 0 ? Math.min(1, processed / duration) : 0
  const transcribeElapsed = timings.meta ? (t - timings.meta) / 1000 : 0
  const speed = transcribeElapsed > 1 && processed > 0 ? processed / transcribeElapsed : null
  const eta = speed ? (duration - processed) / speed : null

  const totalMs = t - timings.start
  const words = countWords(segments.map((s) => s.text).join(" "))

  let headline = ""
  let detail = ""
  let pct: number | null = null

  if (phase === "uploading") {
    headline = "Subiendo archivo"
    detail = `${formatBytes(upload * file.size)} de ${formatBytes(file.size)}`
    pct = upload
  } else if (phase === "preparing") {
    headline = modelWasLoaded ? "Analizando el audio" : `Cargando modelo ${model}`
    detail = modelWasLoaded
      ? "Detectando voz e idioma"
      : "La primera vez con un modelo puede tardar más porque hay que descargarlo"
    detail += ` · ${formatDuration(now - (timings.uploaded ?? now))}`
  } else if (phase === "transcribing") {
    headline = "Transcribiendo"
    pct = transcribePct
    detail = `${formatTime(processed)} de ${formatTime(duration)}`
    if (speed) detail += ` · ${speed.toFixed(1)}× tiempo real`
    if (eta !== null && eta > 0) detail += ` · quedan ~${formatDuration(eta * 1000)}`
  }

  return (
    <section className="bg-surface border border-line rounded-2xl overflow-hidden fade-up">
      {/* Archivo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-line">
        <div className="w-10 h-10 rounded-xl bg-surface-2 text-muted flex items-center justify-center shrink-0">
          <FileAudioIcon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-fg truncate" title={file.name}>{file.name}</p>
          <p className="text-xs text-faint mt-0.5">
            {formatBytes(file.size)}
            {meta && <> · {formatTime(meta.duration)} de audio</>}
            <> · <span className="font-mono">{model}</span></>
          </p>
        </div>
        {active && (
          <button
            onClick={props.onCancel}
            className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-danger hover:bg-danger-soft rounded-lg px-2.5 py-1.5 transition-colors"
          >
            <XIcon className="w-3.5 h-3.5" />
            Cancelar
          </button>
        )}
      </div>

      {/* Etapas */}
      <ol className="flex items-center gap-2 px-5 pt-4">
        {STEPS.map((step, i) => {
          const s = stepState(step.key, phase, timings)
          return (
            <li key={step.key} className="flex items-center gap-2 flex-1 last:flex-none min-w-0">
              <span
                className={[
                  "w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-semibold transition-colors",
                  s === "done" && "bg-ok text-on-accent",
                  s === "active" && "bg-accent text-on-accent ring-4 ring-accent-soft",
                  s === "error" && "bg-danger text-on-accent",
                  s === "pending" && "bg-surface-2 text-faint",
                ].filter(Boolean).join(" ")}
              >
                {s === "done" ? <CheckIcon className="w-3 h-3" /> : s === "error" ? <XIcon className="w-3 h-3" /> : i + 1}
              </span>
              <span className={["text-xs font-medium truncate", s === "pending" ? "text-faint" : "text-fg"].join(" ")}>
                {step.label}
              </span>
              {i < STEPS.length - 1 && (
                <span className="h-px flex-1 bg-line min-w-3 relative overflow-hidden">
                  <span
                    className="absolute inset-0 bg-ok origin-left transition-transform duration-500"
                    style={{ transform: `scaleX(${s === "done" ? 1 : 0})` }}
                  />
                </span>
              )}
            </li>
          )
        })}
      </ol>

      <div className="px-5 pt-5 pb-5">
        {active && (
          <>
            <div className="flex items-end justify-between gap-4" aria-live="polite">
              <div className="min-w-0">
                <p className="text-lg font-semibold tracking-tight text-fg">{headline}</p>
                <p className="text-sm text-muted mt-0.5 tabular-nums">{detail}</p>
              </div>
              {pct !== null && (
                <span className="text-3xl font-semibold tracking-tight tabular-nums text-fg shrink-0">
                  {Math.floor(pct * 100)}
                  <span className="text-lg text-faint">%</span>
                </span>
              )}
            </div>

            <div className="mt-4">
              {phase === "transcribing" && duration > 0 ? (
                <Timeline duration={duration} segments={segments} processed={processed} />
              ) : (
                <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                  {pct !== null ? (
                    <div
                      className="h-full bg-accent rounded-full transition-[width] duration-300 ease-out"
                      style={{ width: `${pct * 100}%` }}
                    />
                  ) : (
                    <div className="h-full w-2/5 bg-accent rounded-full indeterminate" />
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {phase === "done" && meta && (
          <div className="fade-up">
            <div className="flex items-center gap-3">
              <div className={["w-9 h-9 rounded-full flex items-center justify-center", cancelled ? "bg-surface-2 text-muted" : "bg-ok-soft text-ok"].join(" ")}>
                {cancelled ? <XIcon className="w-4 h-4" /> : <CheckIcon className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-fg">{cancelled ? "Transcripción cancelada" : "Transcripción completa"}</p>
                <p className="text-sm text-muted">
                  {cancelled
                    ? `Se conservó lo transcrito hasta ${formatTime(processed)}`
                    : `Terminó en ${formatDuration(totalMs)}`}
                </p>
              </div>
              <button
                onClick={props.onReset}
                className="flex items-center gap-2 text-sm font-medium bg-accent text-on-accent rounded-xl px-3.5 py-2 hover:opacity-90 transition-opacity shrink-0"
              >
                <RefreshIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Nuevo archivo</span>
              </button>
            </div>

            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-line rounded-xl overflow-hidden mt-5 border border-line">
              {[
                { label: "Idioma", value: languageName(meta.language), sub: `${Math.round(meta.language_probability * 100)}% de confianza` },
                { label: "Audio", value: formatTime(meta.duration), sub: `${segments.length} segmentos` },
                { label: "Palabras", value: words.toLocaleString("es"), sub: `${Math.round(words / Math.max(meta.duration / 60, 1 / 60))} por minuto` },
                {
                  label: "Velocidad",
                  value: `${(meta.duration / Math.max(totalMs / 1000, 0.001)).toFixed(1)}×`,
                  sub: `${formatDuration(totalMs)} en total`,
                },
              ].map((s) => (
                <div key={s.label} className="bg-surface px-4 py-3">
                  <dt className="text-xs text-faint">{s.label}</dt>
                  <dd className="text-lg font-semibold text-fg tabular-nums mt-0.5">{s.value}</dd>
                  <dd className="text-xs text-muted">{s.sub}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {phase === "error" && (
          <div className="fade-up">
            <div className="flex items-start gap-3 bg-danger-soft rounded-xl px-4 py-3">
              <AlertIcon className="w-5 h-5 text-danger shrink-0 mt-px" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-danger">No se pudo completar la transcripción</p>
                <p className="text-sm text-muted mt-0.5 break-words">{error}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={props.onRetry}
                className="flex items-center gap-2 text-sm font-medium bg-accent text-on-accent rounded-xl px-3.5 py-2 hover:opacity-90 transition-opacity"
              >
                <RefreshIcon className="w-4 h-4" />
                Reintentar
              </button>
              <button
                onClick={props.onReset}
                className="text-sm font-medium text-muted hover:text-fg border border-line hover:border-line-strong rounded-xl px-3.5 py-2 transition-colors"
              >
                Elegir otro archivo
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
