from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from typing import Any

from .feedback_planner import (
    GenerationRequest,
    build_feedback_plan,
    fallback_text,
    resolve_prompt_mode,
)
from .feedback_planner.prompt_types import AnswerDraft, PromptMode
from .feedback_planner.response_validation import validate_safety_text
from .llm_provider import FeedbackProvider, ProviderError, get_provider


def _generate_one(
    arguments: tuple[FeedbackProvider, GenerationRequest],
) -> tuple[str, str | None]:
    """Send one request to its provider and convert provider errors to result data.

    Args:
        arguments: Provider/request pair; the request supplies both prompts to send.

    Returns:
        Generated text and no error kind, or empty text and the provider error kind.
    """
    provider, request = arguments
    try:
        return provider.generate_text(request.system_prompt, request.user_prompt), None
    except ProviderError as error:
        return "", error.kind


def _validated_section(
    request: GenerationRequest,
    text: str,
    mode: PromptMode,
) -> str | None:
    """Apply shared section safeguards followed by the selected mode's checks.

    Args:
        request: Section kind and context used for mode-specific validation.
        text: Raw provider response to normalize and validate.
        mode: Strategy whose section contract applies to this request.

    Returns:
        Accepted normalized section text, or None when either validation layer rejects it.
    """
    normalized = validate_safety_text(text, max_length=600, reject_newlines=True)
    if normalized is None:
        return None
    return mode.validate_section_response(request, normalized)


def _validated_final(
    text: str,
    draft: AnswerDraft,
    mode: PromptMode,
) -> str | None:
    """Apply shared final-response safeguards and mode-specific draft validation.

    Args:
        text: Raw final-pass output from the provider.
        draft: Original assembled answer and context needed to check edits.
        mode: Strategy defining the final response's structure and content rules.

    Returns:
        Accepted normalized final text, or None so the caller retains the draft suggestion.
    """
    normalized = validate_safety_text(
        text,
        max_length=2500,
        reject_newlines=not draft.allow_newlines,
    )
    if normalized is None:
        return None
    return mode.validate_final_response(normalized, draft)


def generate_feedback(
    code: str,
    task_analysis: dict[str, Any] | None,
    code_standard_analysis: dict[str, Any] | None = None,
    *,
    task_title: str | None = None,
    task_preview: str | None = None,
    provider: FeedbackProvider | None = None,
    answer_style: str | None = None,
) -> dict[str, Any]:
    """Create a teacher-editable suggestion from code analysis and one prompt strategy.

    Args:
        code: Submitted source being reviewed; blank or non-string input is rejected.
        task_analysis: Expected elements, evidence, weighted coverage, and syntax findings.
        code_standard_analysis: Optional compatibility findings used when no task plan exists.
        task_title: Optional task name passed to prompts for goal-aware wording.
        task_preview: Optional task description passed as behavior context.
        provider: Optional provider override, primarily for tests or controlled callers.
        answer_style: Optional explicit mode; otherwise read from backend configuration.

    Returns:
        Suggestion text and metadata describing any section/final-pass fallbacks.
    """
    if not isinstance(code, str) or not code.strip():
        raise ValueError("code is required")

    mode = resolve_prompt_mode(answer_style)
    feedback_plan = build_feedback_plan(task_analysis, code_standard_analysis)
    early_response = mode.early_response(feedback_plan)
    if early_response is not None:
        return early_response

    generation_requests = mode.build_generation_requests(
        feedback_plan,
        code,
        task_title,
        task_preview,
        task_analysis,
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
        "introduction": None,
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

        text = _validated_section(request, generated, mode) if isinstance(generated, str) else None
        if text is None:
            text = fallback_text(request, mode)
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

    draft = mode.build_answer_draft(answer, feedback_plan)
    suggestion = draft.suggestion
    if draft.final_request is not None:
        assert active_provider is not None
        beautified, beautify_reason = _generate_one((active_provider, draft.final_request))
        validated_beautified = (
            _validated_final(beautified, draft, mode)
            if isinstance(beautified, str) else None
        )
        if validated_beautified is not None:
            suggestion = validated_beautified
        else:
            fallback_sections.append(draft.final_request.kind)
            fallback_reasons.append({
                "section": draft.final_request.kind,
                "reason": beautify_reason or "invalid_response",
            })

    return {
        "suggestion": suggestion,
        "used_fallback": bool(fallback_sections),
        "fallback_sections": fallback_sections,
        "fallback_reasons": fallback_reasons,
    }