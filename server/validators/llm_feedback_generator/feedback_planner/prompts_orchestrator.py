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
from .prompts_compact import CompactPromptMode


_DEFAULT_MODE = DefaultPromptMode()
_SHORTENED_MODE = ShortenedPromptMode()
_COMPACT_MODE = CompactPromptMode()
_MODES: dict[str, PromptMode] = {
    "default": _DEFAULT_MODE,
    "shortened": _SHORTENED_MODE,
    "compact": _COMPACT_MODE,
}


def resolve_prompt_mode(value: str | None = None) -> PromptMode:
    """Select a registered mode from an argument or backend environment setting.

    Args:
        value: Optional explicit mode name; when omitted, read
            ``FEEDBACK_GENERATOR_ANSWER_STYLE`` from the environment.

    Returns:
        The matching strategy, or the default strategy for missing or unknown names.
    """
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
    """Delegate request construction to an explicit or configured prompt strategy.

    Args:
        plan: Selected sections and evidence produced by the feedback planner.
        code: Submitted source used by strategies to extract relevant evidence.
        task_title: Optional task name used to align prompt wording to the goal.
        task_preview: Optional task description used to clarify expected behavior.
        task_analysis: Optional analysis containing coverage and syntax status.
        mode: Optional already-resolved strategy, useful for consistent multi-step calls.

    Returns:
        The generation requests created by the selected strategy.
    """
    selected_mode = mode or resolve_prompt_mode()
    return selected_mode.build_generation_requests(
        plan,
        code,
        task_title,
        task_preview,
        task_analysis,
    )


def fallback_text(request: GenerationRequest, mode: PromptMode | None = None) -> str:
    """Delegate a failed request's fallback wording to its selected strategy.

    Args:
        request: Failed generation request, including kind and structured context.
        mode: Optional already-resolved strategy; otherwise use configured mode selection.

    Returns:
        Deterministic user-facing fallback text.
    """
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