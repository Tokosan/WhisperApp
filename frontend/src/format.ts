import type { SegmentPayload } from "./api"

export function formatTime(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  const mm = h > 0 ? m.toString().padStart(2, "0") : m.toString()
  return `${h > 0 ? `${h}:` : ""}${mm}:${sec.toString().padStart(2, "0")}`
}

export function formatDuration(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min ${s % 60} s`
  return `${Math.floor(m / 60)} h ${m % 60} min`
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

function stamp(s: number, sep: "," | ".") {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  const ms = Math.floor((s % 1) * 1000)
  const p = (n: number, l = 2) => n.toString().padStart(l, "0")
  return `${p(h)}:${p(m)}:${p(sec)}${sep}${p(ms, 3)}`
}

export function toSrt(segments: SegmentPayload[]) {
  return segments
    .map((seg, i) => `${i + 1}\n${stamp(seg.start, ",")} --> ${stamp(seg.end, ",")}\n${seg.text.trim()}`)
    .join("\n\n")
}

export function toVtt(segments: SegmentPayload[]) {
  return (
    "WEBVTT\n\n" +
    segments.map((seg) => `${stamp(seg.start, ".")} --> ${stamp(seg.end, ".")}\n${seg.text.trim()}`).join("\n\n")
  )
}

const languageNames = new Intl.DisplayNames(["es"], { type: "language" })

export function languageName(code: string) {
  try {
    const name = languageNames.of(code) ?? code
    return name.charAt(0).toUpperCase() + name.slice(1)
  } catch {
    return code
  }
}

export function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}
