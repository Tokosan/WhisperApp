import type { HealthInfo } from "../api"
import { RefreshIcon, WaveIcon } from "./Icons"

interface Props {
  health: HealthInfo | null
  serverDown: boolean
  onRetry: () => void
}

export default function Header({ health, serverDown, onRetry }: Props) {
  return (
    <header className="flex items-center justify-between gap-4 py-5">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-accent text-on-accent flex items-center justify-center">
          <WaveIcon className="w-[18px] h-[18px]" strokeWidth={2.2} />
        </div>
        <span className="font-semibold tracking-tight text-fg">WhisperApp</span>
      </div>

      {serverDown ? (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 text-xs font-medium text-danger bg-danger-soft rounded-full pl-2.5 pr-3 py-1.5 hover:opacity-80 transition-opacity"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-danger" />
          Servidor sin conexión
          <RefreshIcon className="w-3.5 h-3.5" />
        </button>
      ) : health ? (
        <div
          className="flex items-center gap-2 text-xs text-muted bg-surface border border-line rounded-full pl-2.5 pr-3 py-1.5"
          title={`Tipo de cómputo: ${health.compute_type}`}
        >
          <span className="relative flex w-1.5 h-1.5">
            <span className="absolute inset-0 rounded-full bg-ok animate-ping opacity-60" />
            <span className="relative w-1.5 h-1.5 rounded-full bg-ok" />
          </span>
          <span className="font-medium text-fg uppercase">{health.device}</span>
          {health.loaded_model && (
            <>
              <span className="text-faint">·</span>
              <span className="font-mono">{health.loaded_model}</span>
            </>
          )}
        </div>
      ) : (
        <div className="text-xs text-faint">Conectando…</div>
      )}
    </header>
  )
}
