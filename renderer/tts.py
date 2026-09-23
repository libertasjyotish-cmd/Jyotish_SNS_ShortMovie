"""Per-sentence narration, so each line appears exactly when it is spoken."""

import os

from google.cloud import texttospeech

from text import apply_reading_hints, split_for_speech

VOICES: dict[str, tuple[str, str]] = {
    "ja": ("ja-JP", "ja-JP-Chirp3-HD-Enceladus"),
    "en": ("en-US", "en-US-Chirp3-HD-Enceladus"),
    "es": ("es-ES", "es-ES-Neural2-A"),
    "pt": ("pt-BR", "pt-BR-Neural2-A"),
    "id": ("id-ID", "id-ID-Standard-A"),
    "ar": ("ar-XA", "ar-XA-Wavenet-A"),
    "fr": ("fr-FR", "fr-FR-Chirp3-HD-Enceladus"),
    "de": ("de-DE", "de-DE-Chirp3-HD-Enceladus"),
}

# The speech API rejects a sentence it considers too long; Japanese reaches that first.
SENTENCE_LIMIT: dict[str, int] = {"ja": 80, "default": 280}


class Narrator:
    def __init__(self) -> None:
        self._client = texttospeech.TextToSpeechClient()

    def synthesize(self, text: str, language: str, path: str, speaking_rate: float = 1.0) -> str:
        """Speed is set on the voice itself; ffmpeg's `atempo` mangles the timestamps mixing needs."""
        language_code, name = VOICES[language]
        language_code = os.environ.get(f"TTS_LANGUAGE_CODE_{language.upper()}", language_code)
        name = os.environ.get(f"TTS_VOICE_{language.upper()}", name)

        voice = texttospeech.VoiceSelectionParams(language_code=language_code, name=name)
        config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3, speaking_rate=speaking_rate
        )
        limit = SENTENCE_LIMIT.get(language, SENTENCE_LIMIT["default"])
        audio = b""
        for piece in split_for_speech(apply_reading_hints(text, language), limit):
            response = self._client.synthesize_speech(
                input=texttospeech.SynthesisInput(text=piece), voice=voice, audio_config=config
            )
            audio += response.audio_content
        with open(path, "wb") as file:
            file.write(audio)
        return path
