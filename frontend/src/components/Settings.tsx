import { DEFAULT_MODEL } from "../api"
import type { ModelInfo } from "../api"

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

interface Props {
  models: ModelInfo[]
  model: string
  language: string
  loadedModel: string | null
  onModel: (id: string) => void
  onLanguage: (code: string) => void
}

const selectClass =
  "w-full appearance-none bg-surface border border-line rounded-xl pl-3.5 pr-9 py-2.5 text-sm text-fg " +
  "hover:border-line-strong focus:outline-none focus:border-accent transition-colors cursor-pointer " +
  "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m7 10 5 5 5-5'/%3E%3C/svg%3E\")] " +
  "bg-no-repeat bg-[length:16px] bg-[position:right_12px_center]"

export default function Settings({ models, model, language, loadedModel, onModel, onLanguage }: Props) {
  const current = models.find((m) => m.id === model)
  const needsLoad = loadedModel !== null && loadedModel !== model

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">Modelo</span>
        <select value={model} onChange={(e) => onModel(e.target.value)} className={selectClass}>
          {models.length === 0 ? (
            <option value={DEFAULT_MODEL}>{DEFAULT_MODEL}</option>
          ) : (
            models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id}
                {m.id === DEFAULT_MODEL ? " (recomendado)" : ""}
              </option>
            ))
          )}
        </select>
        <span className="text-xs text-faint min-h-4">
          {current && (
            <>
              {current.description.replace(/\s*\(recomendado\)/, "")} · {current.vram_required_gb} GB VRAM
              {needsLoad && <span className="text-accent-fg"> · se cargará al iniciar</span>}
            </>
          )}
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">Idioma del audio</span>
        <select value={language} onChange={(e) => onLanguage(e.target.value)} className={selectClass}>
          {LANGUAGE_OPTIONS.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
        <span className="text-xs text-faint min-h-4">
          {language ? "Fijar el idioma evita errores de detección" : "Whisper lo identifica en los primeros segundos"}
        </span>
      </label>
    </div>
  )
}
