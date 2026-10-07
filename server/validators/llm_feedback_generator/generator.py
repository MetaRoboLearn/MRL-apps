from __future__ import annotations

import re
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from .feedback_planner import (
    GenerationRequest,
    build_feedback_plan,
    build_generation_requests,
    fallback_text,
)
from .llm_provider import FeedbackProvider, ProviderError, get_provider


_NUMERIC_GRADE = re.compile(r"\b\d+(?:[.,]\d+)?\s*/\s*5\b|\b(?:ocjena|bodovi)\s*:?\s*\d+", re.IGNORECASE)


def _generate_one(
    arguments: tuple[FeedbackProvider, GenerationRequest],
) -> tuple[str, str | None]:
    provider, request = arguments
    try:
        return provider.generate_text(request.system_prompt, request.user_prompt), None
    except ProviderError as error:
        return "", error.kind


def _validated_text(request: GenerationRequest, text: str) -> str | None:
    normalized = text.strip()
    if not normalized or len(normalized) > 600 or "\n" in normalized:
        return None
    if _NUMERIC_GRADE.search(normalized):
        return None
    if request.kind == "reflection_question" and not normalized.endswith("?"):
        return None
    return normalized


def generate_feedback(
    code: str,
    task_analysis: dict[str, Any] | None,
    code_standard_analysis: dict[str, Any] | None = None,
    *,
    task_title: str | None = None,
    task_preview: str | None = None,
    provider: FeedbackProvider | None = None,
) -> dict[str, Any]:
    """Plan, generate, validate, and assemble one teacher-editable suggestion."""
    if not isinstance(code, str) or not code.strip():
        raise ValueError("code is required")

    feedback_plan = build_feedback_plan(task_analysis, code_standard_analysis)
    generation_requests = build_generation_requests(
        feedback_plan,
        code,
        task_title=task_title,
        task_preview=task_preview,
    )
    active_provider = provider
    if generation_requests and active_provider is None:
        active_provider = get_provider()
    answer: dict[str, Any] = {
        "praises": [],
        "completion_statement": feedback_plan.get("completion_statement"),
        "main_recommendation": None,
        "additional_recommendation": None,
        "reflection_question": None,
    }
    fallback_sections = []
    fallback_reasons = []

    if generation_requests:
        assert active_provider is not None
        worker_count = max(
            1,
            min(active_provider.max_concurrent_requests, len(generation_requests)),
        )
        with ThreadPoolExecutor(max_workers=worker_count, thread_name_prefix="feedback-section") as executor:
            generated_sections = list(executor.map(
                _generate_one,
                ((active_provider, request) for request in generation_requests),
            ))
    else:
        generated_sections = []

    for request, (generated, fallback_reason) in zip(generation_requests, generated_sections):

        text = _validated_text(request, generated) if isinstance(generated, str) else None
        if text is None:
            text = fallback_text(request)
            fallback_sections.append(request.kind)
            fallback_reasons.append({
                "section": request.kind,
                "reason": fallback_reason or "invalid_response",
            })

        if request.kind == "praise":
            answer["praises"].append(text)
        elif request.kind == "compatibility_comment":
            answer["main_recommendation"] = text
        else:
            answer[request.kind] = text

    suggestion_parts = [*answer["praises"]]
    if answer["completion_statement"]:
        suggestion_parts.append(answer["completion_statement"])
    suggestion_parts.extend(
        text
        for key in ("main_recommendation", "additional_recommendation", "reflection_question")
        if (text := answer[key])
    )

    return {
        "suggestion": "\n".join(suggestion_parts),
        "used_fallback": bool(fallback_sections),
        "fallback_sections": fallback_sections,
        "fallback_reasons": fallback_reasons,
    }