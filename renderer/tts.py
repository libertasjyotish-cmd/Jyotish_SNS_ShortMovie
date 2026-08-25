"""Per-sentence narration, so each line appears exactly when it is spoken."""

import os

from google.cloud import texttospeech

from text import apply_reading_hints

VOICES: dict[str, tuple[str, str]] = {
    "ja": ("ja-JP", "ja-JP-Chirp3-HD-Enceladus"),
    "en": ("en-US", "en-US-Neural2-F"),
    "es": ("es-ES", "es-ES-Neural2-A"),
    "pt": ("pt-BR", "pt-BR-Neural2-A"),
    "id": ("id-ID", "id-ID-Standard-A"),
    "ar": ("ar-XA", "ar-XA-Wavenet-A"),
}


class Narrator:
    def __init__(self) -> None:
        self._client = texttospeech.TextToSpeechClient()

    def synthesize(self, text: str, language: str, path: str) -> str:
        language_code, name = VOICES[language]
        language_code = os.environ.get(f"TTS_LANGUAGE_CODE_{language.upper()}", language_code)
        name = os.environ.get(f"TTS_VOICE_{language.upper()}", name)

        response = self._client.synthesize_speech(
            input=texttospeech.SynthesisInput(text=apply_reading_hints(text, language)),
            voice=texttospeech.VoiceSelectionParams(language_code=language_code, name=name),
            audio_config=texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3
            ),
        )
        with open(path, "wb") as file:
            file.write(response.audio_content)
        return path
