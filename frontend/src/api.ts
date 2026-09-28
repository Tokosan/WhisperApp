export const BASE_URL = import.meta.env.VITE_API_URL ?? "http://100.64.0.11:8000";
export const DEFAULT_MODEL = "large-v3-turbo";

export interface SegmentPayload {
  id: number;
  start: number;
  end: number;
  text: string;
  words?: { word: string; start: number; end: number; probability: number }[] | null;
}

export interface MetaPayload {
  language: string;
  language_probability: number;
  duration: number;
}

export interface ModelInfo {
  id: string;
  description: string;
  vram_required_gb: number;
}

export interface HealthInfo {
  status: string;
  loaded_model: string | null;
  device: string;
  compute_type: string;
}

export async function fetchModels(): Promise<ModelInfo[]> {
  const res = await fetch(`${BASE_URL}/models`);
  if (!res.ok) throw new Error("No se pudo obtener la lista de modelos");
  return res.json();
}

export async function fetchHealth(): Promise<HealthInfo> {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error("Servidor no disponible");
  return res.json();
}

export interface TranscribeStreamOptions {
  file: File;
  model: string;
  language: string;
  onUploadProgress: (loaded: number, total: number) => void;
  onUploaded: () => void;
  onMeta: (meta: MetaPayload) => void;
  onSegment: (segment: SegmentPayload) => void;
  signal: AbortSignal;
}

function errorDetail(body: string, status: number): string {
  try {
    const detail = JSON.parse(body)?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  } catch {
    // respuesta no JSON
  }
  return `El servidor respondió con error ${status}`;
}

/**
 * Usa XMLHttpRequest en vez de fetch porque es la única forma de conocer el
 * progreso de subida. La respuesta SSE se va parseando a medida que llega.
 */
export function transcribeStream(opts: TranscribeStreamOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", opts.file);
    form.append("model", opts.model);
    if (opts.language) form.append("language", opts.language);

    const xhr = new XMLHttpRequest();
    let cursor = 0;
    let eventType = "";
    let finished = false;
    let streamError = "";

    function parse() {
      const text = xhr.responseText;
      const end = text.lastIndexOf("\n");
      if (end < cursor) return;
      const lines = text.slice(cursor, end).split("\n");
      cursor = end + 1;

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          const data = JSON.parse(line.slice(6));
          if (eventType === "meta") opts.onMeta(data);
          else if (eventType === "segment") opts.onSegment(data);
          else if (eventType === "done") finished = true;
          else if (eventType === "error") streamError = data.detail ?? "Error durante la transcripción";
          eventType = "";
        }
      }
    }

    xhr.open("POST", `${BASE_URL}/transcribe/stream`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onUploadProgress(e.loaded, e.total);
    };
    xhr.upload.onload = () => opts.onUploaded();
    xhr.onprogress = () => {
      if (xhr.status === 200) parse();
    };
    xhr.onload = () => {
      if (xhr.status !== 200) {
        reject(new Error(errorDetail(xhr.responseText, xhr.status)));
        return;
      }
      parse();
      if (streamError) reject(new Error(streamError));
      else if (!finished) reject(new Error("La conexión se cortó antes de terminar la transcripción"));
      else resolve();
    };
    xhr.onerror = () => reject(new Error(`No se pudo conectar con el servidor (${BASE_URL})`));
    xhr.onabort = () => reject(new DOMException("Cancelado", "AbortError"));

    if (opts.signal.aborted) {
      reject(new DOMException("Cancelado", "AbortError"));
      return;
    }
    opts.signal.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(form);
  });
}
