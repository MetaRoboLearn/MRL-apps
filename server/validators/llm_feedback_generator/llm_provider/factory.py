from __future__ import annotations

import os
from functools import lru_cache
from typing import Mapping

from .google_ai_studio import GoogleAiStudioProvider
from .local_lm_studio import LocalLmStudioProvider
from .protocol import FeedbackProvider, ProviderConfigurationError


def create_provider(environ: Mapping[str, str] | None = None) -> FeedbackProvider:
    settings = os.environ if environ is None else environ
    mode = settings.get("LLM_FEEDBACK_PROVIDER", "local").strip().lower()

    if mode == "local":
        return LocalLmStudioProvider(
            api_base=settings.get(
                "LLM_FEEDBACK_LOCAL_API_BASE",
                "http://localhost:1234/v1",
            ),
            model=settings.get(
                "LLM_FEEDBACK_LOCAL_MODEL",
                "google/gemma-4-26b-a4b-qat",
            ),
        )

    if mode == "remote":
        api_key = settings.get("LLM_FEEDBACK_GEMINI_API_KEY", "").strip()
        model = settings.get("LLM_FEEDBACK_GEMINI_MODEL", "").strip()
        if not api_key or not model:
            raise ProviderConfigurationError(
                "Remote feedback requires Gemini API key and model configuration"
            )
        return GoogleAiStudioProvider(
            api_key=api_key,
            model=model,
        )

    raise ProviderConfigurationError("LLM_FEEDBACK_PROVIDER must be 'local' or 'remote'")


@lru_cache(maxsize=1)
def get_provider() -> FeedbackProvider:
    """Return one environment-configured provider per backend worker process."""
    return create_provider()