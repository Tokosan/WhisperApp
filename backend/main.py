import json
import logging
import os
import tempfile
from typing import Annotated, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .schemas import HealthResponse, ModelInfo, Segment, TranscriptionResponse, WordTimestamp
from .transcriber import AVAILABLE_MODELS, DEFAULT_MODEL, get_transcriber

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="WhisperApp API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPPORTED_FORMATS = {".mp3", ".mp4", ".wav", ".m4a", ".ogg", ".flac", ".webm", ".mkv", ".avi"}


@app.on_event("startup")
async def startup():
    logger.info(f"Precargando modelo por defecto: {DEFAULT_MODEL}")
    get_transcriber().load_model(DEFAULT_MODEL)


@app.get("/health", response_model=HealthResponse)
def health():
    t = get_transcriber()
    return HealthResponse(
        status="ok",
        loaded_model=t.loaded_model,
        device=t.device,
        compute_type=t.compute_type,
    )


@app.get("/models", response_model=list[ModelInfo])
def list_models():
    return [
        ModelInfo(id=k, description=v["description"], vram_required_gb=v["vram_gb"])
        for k, v in AVAILABLE_MODELS.items()
    ]


@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe(
    file: Annotated[UploadFile, File(description="Archivo de audio")],
    language: Annotated[Optional[str], Form()] = None,
    model: Annotated[str, Form()] = DEFAULT_MODEL,
    task: Annotated[str, Form()] = "transcribe",
    word_timestamps: Annotated[bool, Form()] = False,
    vad_filter: Annotated[bool, Form()] = True,
):
    if model not in AVAILABLE_MODELS:
        raise HTTPException(400, f"Modelo '{model}' no existe. Disponibles: {list(AVAILABLE_MODELS)}")
    if task not in ("transcribe", "translate"):
        raise HTTPException(400, "El parámetro 'task' debe ser 'transcribe' o 'translate'")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext and ext not in SUPPORTED_FORMATS:
        raise HTTPException(400, f"Formato '{ext}' no soportado. Formatos válidos: {SUPPORTED_FORMATS}")

    with tempfile.NamedTemporaryFile(suffix=ext or ".wav", delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        segments_gen, info = get_transcriber().transcribe(
            tmp_path,
            model_name=model,
            language=language,
            task=task,
            word_timestamps=word_timestamps,
            vad_filter=vad_filter,
        )

        segments = []
        full_text_parts = []

        for seg in segments_gen:
            words = None
            if word_timestamps and seg.words:
                words = [
                    WordTimestamp(
                        word=w.word,
                        start=w.start,
                        end=w.end,
                        probability=w.probability,
                    )
                    for w in seg.words
                ]
            segments.append(
                Segment(id=seg.id, start=seg.start, end=seg.end, text=seg.text.strip(), words=words)
            )
            full_text_parts.append(seg.text.strip())

        return TranscriptionResponse(
            text=" ".join(full_text_parts),
            language=info.language,
            language_probability=round(info.language_probability, 4),
            duration=round(info.duration, 2),
            segments=segments,
        )
    finally:
        os.unlink(tmp_path)


@app.post("/transcribe/stream")
async def transcribe_stream(
    file: Annotated[UploadFile, File(description="Archivo de audio")],
    language: Annotated[Optional[str], Form()] = None,
    model: Annotated[str, Form()] = DEFAULT_MODEL,
    task: Annotated[str, Form()] = "transcribe",
    word_timestamps: Annotated[bool, Form()] = False,
    vad_filter: Annotated[bool, Form()] = True,
):
    """Transcripción por streaming — devuelve segmentos via Server-Sent Events."""
    if model not in AVAILABLE_MODELS:
        raise HTTPException(400, f"Modelo '{model}' no existe.")

    ext = os.path.splitext(file.filename or "")[1].lower()
    with tempfile.NamedTemporaryFile(suffix=ext or ".wav", delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    async def event_stream():
        try:
            segments_gen, info = get_transcriber().transcribe(
                tmp_path,
                model_name=model,
                language=language,
                task=task,
                word_timestamps=word_timestamps,
                vad_filter=vad_filter,
            )

            meta = {"language": info.language, "language_probability": round(info.language_probability, 4), "duration": round(info.duration, 2)}
            yield f"event: meta\ndata: {json.dumps(meta)}\n\n"

            for seg in segments_gen:
                words = None
                if word_timestamps and seg.words:
                    words = [{"word": w.word, "start": w.start, "end": w.end, "probability": w.probability} for w in seg.words]
                payload = {"id": seg.id, "start": seg.start, "end": seg.end, "text": seg.text.strip(), "words": words}
                yield f"event: segment\ndata: {json.dumps(payload)}\n\n"

            yield "event: done\ndata: {}\n\n"
        finally:
            os.unlink(tmp_path)

    return StreamingResponse(event_stream(), media_type="text/event-stream")
