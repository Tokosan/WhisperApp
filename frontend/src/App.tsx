import { useEffect, useRef, useState } from "react"
import { fetchModels, transcribeStream } from "./api"
import type { MetaPayload, ModelInfo, SegmentPayload } from "./api"
import DropZone from "./components/DropZone"
import TranscriptionView from "./components/TranscriptionView"
import "./index.css"

type Status = "idle" | "uploading" | "transcribing" | "done" | "error"

const LANGUAGE_OPTIONS = [
  { value: "", label: "Detectar automáticamente" },
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
  { value: "pt", label: "Português" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
  { value: "zh", label: "中文" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
]

export default function App() {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [selectedModel, setSelectedModel] = useState("large-v3-turbo")
  const [selectedLang, setSelectedLang] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [error, setError] = useState("")
  const [meta, setMeta] = useState<MetaPayload | null>(null)
  const [segments, setSegments] = useState<SegmentPayload[]>([])
  const [fileName, setFileName] = useState("")
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    fetchModels()
      .then(setModels)
      .catch(() => {})
  }, [])

  async function handleFile(file: File) {
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setFileName(file.name)
    setMeta(null)
    setSegments([])
    setError("")
    setStatus("uploading")

    try {
      setStatus("transcribing")
      await transcribeStream({
        file,
        model: selectedModel,
        language: selectedLang,
        onMeta: (m) => setMeta(m),
        onSegment: (s) => setSegments((prev) => [...prev, s]),
        onDone: () => setStatus("done"),
        onError: (e) => { setError(e.message); setStatus("error") },
        signal: abortRef.current.signal,
      })
      setStatus("done")
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return
      setError(e instanceof Error ? e.message : "Error desconocido")
      setStatus("error")
    }
  }

  function handleCancel() {
    abortRef.current?.abort()
    setStatus("idle")
  }

  const isLoading = status === "uploading" || status === "transcribing"
  const showResult = segments.length > 0 || isLoading

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-100 flex flex-col">
      <div className={[
        "max-w-2xl w-full mx-auto px-6 flex flex-col gap-6",
        showResult ? "py-12" : "flex-1 justify-center py-10",
      ].join(" ")}>

        {/* Header */}
        <header className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-500/30 mb-4">
            <svg className="w-7 h-7 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold text-slate-100 tracking-tight">WhisperApp</h1>
          <p className="text-slate-500 mt-1.5 text-sm">Transcripción de audio con faster-whisper</p>
        </header>

        {/* Opciones */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-500 font-medium uppercase tracking-wide">Modelo</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={isLoading}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-violet-500 disabled:opacity-50 cursor-pointer"
            >
              {models.length === 0 ? (
                <option value="large-v3-turbo">large-v3-turbo (recomendado)</option>
              ) : (
                models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id} — {m.description}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-500 font-medium uppercase tracking-wide">Idioma</label>
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              disabled={isLoading}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-violet-500 disabled:opacity-50 cursor-pointer"
            >
              {LANGUAGE_OPTIONS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Drop zone o estado de carga */}
        {!isLoading ? (
          <DropZone onFile={handleFile} disabled={isLoading} />
        ) : (
          <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 py-10 px-8 flex flex-col items-center gap-5">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-slate-700" />
              <div className="absolute inset-0 rounded-full border-2 border-t-violet-500 animate-spin" />
              <div className="absolute inset-[6px] rounded-full bg-violet-600/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                </svg>
              </div>
            </div>

            <div className="text-center">
              <p className="text-slate-300 font-medium">
                {status === "uploading" ? "Enviando archivo…" : "Transcribiendo…"}
              </p>
              <p className="text-slate-600 text-sm mt-1 max-w-xs truncate">{fileName}</p>
            </div>

            <button
              onClick={handleCancel}
              className="text-slate-500 hover:text-slate-300 text-sm transition-colors underline underline-offset-2"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="flex items-start gap-3 bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-3 text-sm text-red-300">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            {error}
          </div>
        )}

        {/* Vista de transcripción */}
        {showResult && (
          <TranscriptionView
            meta={meta}
            segments={segments}
            loading={isLoading}
            fileName={fileName}
          />
        )}

        {/* Botón nueva transcripción */}
        {status === "done" && (
          <button
            onClick={() => { setStatus("idle"); setSegments([]); setMeta(null); setFileName("") }}
            className="self-center flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-sm font-medium transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Transcribir otro archivo
          </button>
        )}

      </div>
    </div>
  )
}
