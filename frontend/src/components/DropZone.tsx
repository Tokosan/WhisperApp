import { useRef, useState } from "react"
import { UploadIcon } from "./Icons"

interface Props {
  onFile: (file: File) => void
}

const EXTENSIONS = ["mp3", "mp4", "wav", "m4a", "ogg", "flac", "webm", "mkv", "avi"]
const ACCEPT = EXTENSIONS.map((e) => `.${e}`).join(",")

export default function DropZone({ onFile }: Props) {
  const [dragging, setDragging] = useState(false)
  const [rejected, setRejected] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  function accept(file: File | undefined) {
    if (!file) return
    const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
    if (!EXTENSIONS.includes(ext)) {
      setRejected(`«${file.name}» no es un formato soportado`)
      return
    }
    setRejected("")
    onFile(file)
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          accept(e.dataTransfer.files[0])
        }}
        className={[
          "group relative w-full rounded-2xl border border-dashed transition-all duration-200 cursor-pointer",
          "flex flex-col items-center justify-center gap-5 py-14 px-6",
          dragging
            ? "border-accent bg-accent-soft scale-[1.01]"
            : "border-line-strong bg-surface hover:border-accent hover:bg-accent-soft/50",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            accept(e.target.files?.[0])
            e.target.value = ""
          }}
        />

        <div
          className={[
            "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200",
            dragging
              ? "bg-accent text-on-accent -translate-y-1"
              : "bg-surface-2 text-accent-fg group-hover:bg-accent group-hover:text-on-accent group-hover:-translate-y-0.5",
          ].join(" ")}
        >
          <UploadIcon className="w-6 h-6" />
        </div>

        <div className="text-center">
          <p className="text-fg text-base font-medium">
            {dragging ? "Suelta para empezar a transcribir" : "Arrastra un archivo de audio o video"}
          </p>
          <p className="text-muted text-sm mt-1">
            o <span className="text-accent-fg font-medium underline underline-offset-4 decoration-accent/40">elige uno desde tu equipo</span>
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-1.5">
          {EXTENSIONS.map((ext) => (
            <span key={ext} className="font-mono text-[11px] uppercase text-faint border border-line rounded-md px-1.5 py-0.5">
              {ext}
            </span>
          ))}
        </div>
      </button>

      {rejected && (
        <p role="alert" className="text-sm text-danger text-center fade-up">
          {rejected}. Usa uno de los formatos de la lista.
        </p>
      )}
    </div>
  )
}
