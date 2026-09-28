const BASE_URL = "http://100.64.0.11:8000";

export interface SegmentPayload {
  id: number;
  start: number;
  end: number;
  text: string;
  words?: { word: string; start: number; end: number; probability: number }[];
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

export async function fetchModels(): Promise<ModelInfo[]> {
  const res = await fetch(`${BASE_URL}/models`);
  if (!res.ok) throw new Error("No se pudo obtener la lista de modelos");
  return res.json();
}

export interface TranscribeStreamOptions {
  file: File;
  model: string;
  language: string;
  onMeta: (meta: MetaPayload) => void;
  onSegment: (segment: SegmentPayload) => void;
  onDone: () => void;
  onError: (err: Error) => void;
  signal: AbortSignal;
}

export async function transcribeStream(
  opts: TranscribeStreamOptions,
): Promise<void> {
  const form = new FormData();
  form.append("file", opts.file);
  form.append("model", opts.model);
  if (opts.language) form.append("language", opts.language);

  const res = await fetch(`${BASE_URL}/transcribe/stream`, {
    method: "POST",
    body: form,
    signal: opts.signal,
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail?.detail ?? `Error ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    let eventType = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        eventType = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        const data = JSON.parse(line.slice(6));
        if (eventType === "meta") opts.onMeta(data);
        else if (eventType === "segment") opts.onSegment(data);
        else if (eventType === "done") opts.onDone();
        eventType = "";
      }
    }
  }
}
