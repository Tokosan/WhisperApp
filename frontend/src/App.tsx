import { useCallback, useEffect, useRef, useState } from "react"
import { BASE_URL, DEFAULT_MODEL, fetchHealth, fetchModels, transcribeStream } from "./api"
import type { HealthInfo, MetaPayload, ModelInfo, SegmentPayload } from "./api"
import DropZone from "./components/DropZone"
import Header from "./components/Header"
import { AlertIcon } from "./components/Icons"
import ProgressPanel from "./components/ProgressPanel"
import type { Phase, Timings } from "./components/ProgressPanel"
import Settings from "./components/Settings"
import TranscriptionView from "./components/TranscriptionView"

function useNow(active: boolean, interval = 500) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(id)
  }, [active, interval])
  return now
}

export default function App() {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [health, setHealth] = useState<HealthInfo | null>(null)
  const [serverDown, setServerDown] = useState(false)
  const [model, setModel] = useState(DEFAULT_MODEL)
  const [language, setLanguage] = useState("")

  const [phase, setPhase] = useState<Phase>("idle")
  const [file, setFile] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [upload, setUpload] = useState(0)
  const [meta, setMeta] = useState<MetaPayload | null>(null)
  const [segments, setSegments] = useState<SegmentPayload[]>([])
  const [timings, setTimings] = useState<Timings | null>(null)
  const [modelWasLoaded, setModelWasLoaded] = useState(true)
  const [cancelled, setCancelled] = useState(false)
  const [error, setError] = useState("")
  const abortRef = useRef<AbortController | null>(null)

  const active = phase === "uploading" || phase === "preparing" || phase === "transcribing"
  const now = useNow(active)

  const refreshHealth = useCallback(() => {
    Promise.all([fetchHealth(), fetchModels()]).then(
      ([h, m]) => {
        setHealth(h)
        setModels(m)
        setServerDown(false)
      },
      () => setServerDown(true),
    )
  }, [])

  useEffect(refreshHealth, [refreshHealth])

  // Progreso en el título de la pestaña, útil si el usuario cambia de pestaña
  useEffect(() => {
    const duration = meta?.duration ?? 0
    const processed = segments.at(-1)?.end ?? 0
    if (phase === "uploading") document.title = `↑ ${Math.floor(upload * 100)}% · WhisperApp`
    else if (phase === "preparing") document.title = "Preparando… · WhisperApp"
    else if (phase === "transcribing") document.title = `${duration ? Math.floor((processed / duration) * 100) : 0}% · WhisperApp`
    else if (phase === "done") document.title = "✓ Listo · WhisperApp"
    else if (phase === "error") document.title = "Error · WhisperApp"
    else document.title = "WhisperApp"
  }, [phase, upload, meta, segments])

  useEffect(() => {
    if (!active) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [active])

  async function start(f: File) {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setFile(f)
    setAudioUrl(URL.createObjectURL(f))
    setMeta(null)
    setSegments([])
    setUpload(0)
    setError("")
    setCancelled(false)
    setModelWasLoaded(health?.loaded_model === model)
    setTimings({ start: Date.now() })
    setPhase("uploading")

    try {
      await transcribeStream({
        file: f,
        model,
        language,
        signal: controller.signal,
        onUploadProgress: (loaded, total) => setUpload(loaded / total),
        onUploaded: () => {
          setUpload(1)
          setPhase("preparing")
          setTimings((t) => t && { ...t, uploaded: Date.now() })
        },
        onMeta: (m) => {
          setMeta(m)
          setPhase("transcribing")
          setTimings((t) => t && { ...t, meta: Date.now() })
        },
        onSegment: (s) => setSegments((prev) => [...prev, s]),
      })
      setTimings((t) => t && { ...t, end: Date.now() })
      setPhase("done")
    } catch (e) {
      if (controller.signal.aborted) return
      setError(e instanceof Error ? e.message : "Error desconocido")
      setTimings((t) => t && { ...t, end: Date.now() })
      setPhase("error")
    } finally {
      if (abortRef.current === controller) refreshHealth()
    }
  }

  function cancel() {
    abortRef.current?.abort()
    if (segments.length > 0) {
      setCancelled(true)
      setTimings((t) => t && { ...t, end: Date.now() })
      setPhase("done")
    } else {
      reset()
    }
  }

  function reset() {
    abortRef.current?.abort()
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setFile(null)
    setAudioUrl(null)
    setMeta(null)
    setSegments([])
    setTimings(null)
    setError("")
    setCancelled(false)
    setPhase("idle")
  }

  const idle = phase === "idle" || !file || !timings

  return (
    <div className="min-h-screen flex flex-col">
      <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 flex flex-col flex-1">
        <Header health={health} serverDown={serverDown} onRetry={refreshHealth} />

        {idle ? (
          <main className="flex-1 flex flex-col justify-center gap-8 pb-16 pt-6">
            <div className="text-center fade-up">
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-fg text-balance">
                Convierte audio en texto
              </h1>
              <p className="text-muted mt-3 text-balance">
                Transcripción local con faster-whisper, con marcas de tiempo y subtítulos listos para descargar.
              </p>
            </div>

            <div className="flex flex-col gap-5 fade-up" style={{ animationDelay: "60ms" }}>
              {serverDown && (
                <div className="flex items-start gap-3 bg-danger-soft rounded-xl px-4 py-3 text-sm">
                  <AlertIcon className="w-5 h-5 text-danger shrink-0" />
                  <p className="text-muted">
                    <span className="font-medium text-danger">No hay conexión con el servidor.</span>{" "}
                    Revisa que el backend esté corriendo en <span className="font-mono text-fg">{BASE_URL}</span>.
                  </p>
                </div>
              )}
              <Settings
                models={models}
                model={model}
                language={language}
                loadedModel={health?.loaded_model ?? null}
                onModel={setModel}
                onLanguage={setLanguage}
              />
              <DropZone onFile={start} />
            </div>
          </main>
        ) : (
          <main className="flex flex-col gap-4 pt-2 pb-16">
            <ProgressPanel
              phase={phase}
              file={file}
              model={model}
              modelWasLoaded={modelWasLoaded}
              upload={upload}
              meta={meta}
              segments={segments}
              timings={timings}
              now={now}
              cancelled={cancelled}
              error={error}
              onCancel={cancel}
              onRetry={() => start(file)}
              onReset={reset}
            />
            {(phase === "transcribing" || segments.length > 0) && (
              <TranscriptionView
                segments={segments}
                loading={phase === "transcribing"}
                fileName={file.name}
                audioUrl={audioUrl}
                duration={meta?.duration ?? 0}
              />
            )}
          </main>
        )}
      </div>
    </div>
  )
}
