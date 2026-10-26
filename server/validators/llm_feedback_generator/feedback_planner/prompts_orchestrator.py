from __future__ import annotations

import os
from typing import Any

from .prompt_types import AnswerDraft, GenerationRequest, PromptMode
from .prompts_default import DefaultPromptMode, build_beautify_request
from .prompts_shortened import (
    ShortenedPromptMode,
    build_introduction_request,
    build_shortened_beautify_request,
)


_DEFAULT_MODE = DefaultPromptMode()
_SHORTENED_MODE = ShortenedPromptMode()
_MODES: dict[str, PromptMode] = {
    "default": _DEFAULT_MODE,
    "shortened": _SHORTENED_MODE,
}


def resolve_prompt_mode(value: str | None = None) -> PromptMode:
    raw = os.environ.get("FEEDBACK_GENERATOR_ANSWER_STYLE", "default") if value is None else value
    normalized = raw.strip().lower()
    return _MODES.get(normalized, _DEFAULT_MODE)


def build_generation_requests(
    plan: dict[str, Any],
    code: str,
    task_title: str | None = None,
    task_preview: str | None = None,
    *,
    task_analysis: dict[str, Any] | None = None,
    mode: PromptMode | None = None,
) -> list[GenerationRequest]:
    selected_mode = mode or resolve_prompt_mode()
    return selected_mode.build_generation_requests(
        plan,
        code,
        task_title,
        task_preview,
        task_analysis,
    )


def fallback_text(request: GenerationRequest, mode: PromptMode | None = None) -> str:
    selected_mode = mode or resolve_prompt_mode()
    return selected_mode.fallback_text(request)


__all__ = [
    "AnswerDraft",
    "GenerationRequest",
    "PromptMode",
    "build_generation_requests",
    "build_beautify_request",
    "build_introduction_request",
    "build_shortened_beautify_request",
    "fallback_text",
    "resolve_prompt_mode",
]