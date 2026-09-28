import { useEffect, useRef, useState } from "react"
import type { MetaPayload, SegmentPayload } from "../api"

interface Props {
  meta: MetaPayload | null
  segments: SegmentPayload[]
  loading: boolean
  fileName: string
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, "0")}`
}

function formatSrtTime(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  const ms = Math.round((s % 1) * 1000)
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`
}

function triggerDownload(content: string, name: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export default function TranscriptionView({ meta, segments, loading, fileName }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [segments.length])

  const fullText = segments.map((s) => s.text).join(" ")
  const baseName = fileName.replace(/\.[^.]+$/, "") || "transcripcion"

  function copyText() {
    navigator.clipboard.writeText(fullText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadTxt() {
    triggerDownload(fullText, `${baseName}.txt`, "text/plain;charset=utf-8")
  }

  function downloadSrt() {
    const srt = segments
      .map((seg, i) =>
        `${i + 1}\n${formatSrtTime(seg.start)} --> ${formatSrtTime(seg.end)}\n${seg.text.trim()}`
      )
      .join("\n\n")
    triggerDownload(srt, `${baseName}.srt`, "text/plain;charset=utf-8")
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de estado / metadata */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {fileName && (
            <span className="text-slate-400 text-sm flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z" />
              </svg>
              {fileName}
            </span>
          )}
          {meta && (
            <>
              <span className="bg-violet-900/40 border border-violet-700/50 text-violet-300 text-xs px-2.5 py-1 rounded-full font-medium uppercase tracking-wide">
                {meta.language} · {Math.round(meta.language_probability * 100)}%
              </span>
              <span className="text-slate-500 text-xs">{formatTime(meta.duration)}</span>
            </>
          )}
          {loading && (
            <span className="flex items-center gap-1.5 text-violet-400 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              Transcribiendo…
            </span>
          )}
        </div>

        {fullText && !loading && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={copyText}
              className={[
                "flex items-center gap-1.5 text-sm transition-all px-3 py-1.5 rounded-lg border",
                copied
                  ? "text-emerald-400 border-emerald-700/50 bg-emerald-950/30"
                  : "text-slate-400 hover:text-slate-200 border-transparent hover:border-slate-700 hover:bg-slate-800/50",
              ].join(" ")}
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  ¡Copiado!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                  </svg>
                  Copiar todo
                </>
              )}
            </button>

            <button
              onClick={downloadTxt}
              title="Descargar como texto plano (.txt)"
              className="flex items-center gap-1.5 text-sm transition-all px-3 py-1.5 rounded-lg border text-slate-400 hover:text-slate-200 border-transparent hover:border-slate-700 hover:bg-slate-800/50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              .txt
            </button>

            <button
              onClick={downloadSrt}
              title="Descargar como subtítulos (.srt)"
              className="flex items-center gap-1.5 text-sm transition-all px-3 py-1.5 rounded-lg border text-slate-400 hover:text-slate-200 border-transparent hover:border-slate-700 hover:bg-slate-800/50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              .srt
            </button>
          </div>
        )}
      </div>

      {/* Área de segmentos */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 min-h-48 max-h-[32rem] overflow-y-auto">
        {segments.length === 0 && !loading && (
          <p className="text-slate-600 text-center text-sm mt-8">Los segmentos aparecerán aquí…</p>
        )}

        <div className="flex flex-col gap-3">
          {segments.map((seg) => (
            <div key={seg.id} className="flex gap-3 group segment-enter">
              <span className="text-slate-600 text-xs font-mono pt-0.5 shrink-0 w-10 text-right">
                {formatTime(seg.start)}
              </span>
              <p className="text-slate-200 text-sm leading-relaxed">{seg.text}</p>
            </div>
          ))}

          {loading && segments.length > 0 && (
            <div className="flex gap-3">
              <span className="w-10 shrink-0" />
              <div className="flex gap-1 items-center pt-1">
                <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}
        </div>

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
