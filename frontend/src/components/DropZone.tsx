import { useRef, useState } from "react"

interface Props {
  onFile: (file: File) => void
  disabled: boolean
}

const ACCEPTED = ".mp3,.mp4,.wav,.m4a,.ogg,.flac,.webm,.mkv"

export default function DropZone({ onFile, disabled }: Props) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onFile(file)
    e.target.value = ""
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={[
        "w-full rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer",
        "flex flex-col items-center justify-center gap-4 py-16 px-8",
        "focus:outline-none",
        disabled
          ? "opacity-40 cursor-not-allowed border-slate-700 bg-slate-900"
          : dragging
          ? "border-violet-400 bg-violet-950/30 scale-[1.01]"
          : "border-slate-600 bg-slate-900/60 hover:border-violet-500 hover:bg-violet-950/20",
      ].join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />

      <div className={[
        "w-16 h-16 rounded-full flex items-center justify-center transition-colors",
        dragging ? "bg-violet-500/30" : "bg-slate-800",
      ].join(" ")}>
        <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
        </svg>
      </div>

      <div className="text-center">
        <p className="text-slate-200 text-lg font-medium">
          {dragging ? "Suelta el archivo aquí" : "Arrastra un archivo de audio"}
        </p>
        <p className="text-slate-500 text-sm mt-1">o haz clic para seleccionar</p>
        <p className="text-slate-600 text-xs mt-3">MP3 · MP4 · WAV · M4A · OGG · FLAC · WEBM</p>
      </div>
    </button>
  )
}
