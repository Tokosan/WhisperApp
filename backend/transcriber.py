import logging
from typing import Optional, Iterator
from faster_whisper import WhisperModel

logger = logging.getLogger(__name__)

DEVICE = "cuda"
COMPUTE_TYPE = "float16"
CPU_THREADS = 12

AVAILABLE_MODELS = {
    "tiny": {"description": "Más rápido, menor precisión", "vram_gb": 0.2},
    "base": {"description": "Rápido, buena precisión para habla clara", "vram_gb": 0.3},
    "small": {"description": "Balance velocidad/precisión", "vram_gb": 0.6},
    "medium": {"description": "Buena precisión general", "vram_gb": 1.5},
    "large-v2": {"description": "Alta precisión, modelo estable", "vram_gb": 3.0},
    "large-v3": {"description": "Máxima precisión", "vram_gb": 3.0},
    "large-v3-turbo": {"description": "Máxima precisión, mucho más rápido (recomendado)", "vram_gb": 1.6},
}

DEFAULT_MODEL = "large-v3-turbo"


class Transcriber:
    def __init__(self):
        self._model: Optional[WhisperModel] = None
        self._loaded_model_name: Optional[str] = None

    def load_model(self, model_name: str = DEFAULT_MODEL) -> None:
        if self._loaded_model_name == model_name:
            return

        logger.info(f"Cargando modelo '{model_name}' en {DEVICE} ({COMPUTE_TYPE})...")
        try:
            self._model = WhisperModel(
                model_name,
                device=DEVICE,
                compute_type=COMPUTE_TYPE,
                cpu_threads=CPU_THREADS,
            )
        except Exception as e:
            logger.warning(f"No se pudo cargar en GPU ({e}), usando CPU...")
            self._model = WhisperModel(
                model_name,
                device="cpu",
                compute_type="int8",
                cpu_threads=CPU_THREADS,
            )

        self._loaded_model_name = model_name
        logger.info(f"Modelo '{model_name}' listo.")

    def get_model(self, model_name: str = DEFAULT_MODEL) -> WhisperModel:
        self.load_model(model_name)
        return self._model

    @property
    def loaded_model(self) -> Optional[str]:
        return self._loaded_model_name

    @property
    def device(self) -> str:
        if self._model is None:
            return DEVICE
        return self._model.model.device

    @property
    def compute_type(self) -> str:
        if self._model is None:
            return COMPUTE_TYPE
        return self._model.model.compute_type

    def transcribe(
        self,
        audio_path: str,
        model_name: str = DEFAULT_MODEL,
        language: Optional[str] = None,
        task: str = "transcribe",
        word_timestamps: bool = False,
        vad_filter: bool = True,
    ) -> Iterator:
        model = self.get_model(model_name)
        segments, info = model.transcribe(
            audio_path,
            language=language,
            task=task,
            word_timestamps=word_timestamps,
            vad_filter=vad_filter,
            vad_parameters=dict(
                min_silence_duration_ms=500,   # silencio mínimo para cortar segmento
                speech_pad_ms=400,             # padding alrededor del habla detectada
            ),
            beam_size=5,
            condition_on_previous_text=False,
            no_repeat_ngram_size=3,
            repetition_penalty=1.2,
            log_prob_threshold=-1.0,
            compression_ratio_threshold=2.4,
        )
        return segments, info


_transcriber = Transcriber()


def get_transcriber() -> Transcriber:
    return _transcriber
