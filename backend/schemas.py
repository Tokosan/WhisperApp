from pydantic import BaseModel
from typing import Optional


class WordTimestamp(BaseModel):
    word: str
    start: float
    end: float
    probability: float


class Segment(BaseModel):
    id: int
    start: float
    end: float
    text: str
    words: Optional[list[WordTimestamp]] = None


class TranscriptionResponse(BaseModel):
    text: str
    language: str
    language_probability: float
    duration: float
    segments: list[Segment]


class ModelInfo(BaseModel):
    id: str
    description: str
    vram_required_gb: float


class HealthResponse(BaseModel):
    status: str
    loaded_model: Optional[str]
    device: str
    compute_type: str
