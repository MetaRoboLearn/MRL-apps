from __future__ import annotations

import os
import re
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from .feedback_planner import (
    GenerationRequest,
    build_beautify_request,
    build_feedback_plan,
    build_generation_requests,
    build_introduction_request,
    build_shortened_beautify_request,
    fallback_text,
)
from .llm_provider import FeedbackProvider, ProviderError, get_provider


_NUMERIC_GRADE = re.compile(r"\b\d+(?:[.,]\d+)?\s*/\s*5\b|\b(?:ocjena|bodovi)\s*:?\s*\d+", re.IGNORECASE)
_SENTENCE_END = re.compile(r"[.!?](?=\s|$)")
_WORD = re.compile(r"\w+")
_ANSWER_STYLES = frozenset({"default", "shortened"})
_SHORTENED_SOURCES = frozenset({"task_analysis", "all_not_detected"})
_SHORT_CODE_MAX_LINES = 5
_SHORTENED_PRAISE_HEADING = "Ovo si dobro napravio:"
_SHORTENED_SUGGESTION_HEADING = "Ovo bi mogao bolje provjeriti:"
_SHORTENED_CONNECTORS = frozenset({
    "pa", "ali", "zato", "jer", "ipak", "još", "osim", "toga", "kako", "bi", "nego",
})
_ALL_NOT_DETECTED_MESSAGE = (
    "Svaki pokušaj je važan! 😊 U tvojem programu još nisu pronađene naredbe i dijelovi "
    "koda koji se očekuju u ovom zadatku. Pogledaj ponovno upute i razmisli kako možeš "
    "poboljšati svoje rješenje. Što bi mogao dodati ili promijeniti u svojem programu "
    "kako bi robot uspješno izvršio zadatak?"
)


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
    if request.kind == "introduction" and not normalized.endswith("!"):
        return None
    return normalized


def _validated_beautify(text: str, reflection_question: str | None) -> str | None:
    normalized = text.strip()
    if not normalized or len(normalized) > 2500:
        return None
    if len(_SENTENCE_END.findall(normalized)) < 2:
        return None
    if _NUMERIC_GRADE.search(normalized):
        return None
    if reflection_question and not normalized.endswith("?"):
        return None
    return normalized


def _resolve_answer_style(value: str | None) -> str:
    raw = os.environ.get("FEEDBACK_GENERATOR_ANSWER_STYLE", "default") if value is None else value
    normalized = raw.strip().lower()
    return normalized if normalized in _ANSWER_STYLES else "default"


def _non_empty_line_count(code: str) -> int:
    return sum(1 for line in code.splitlines() if line.strip())


def _opening_category(feedback_plan: dict[str, Any], code: str) -> str:
    if feedback_plan.get("source") == "all_not_detected":
        if _non_empty_line_count(code) <= _SHORT_CODE_MAX_LINES:
            return "short_not_detected"
        return "incomplete"
    if (
        feedback_plan.get("completion_statement")
        and feedback_plan.get("main_recommendation") is None
        and feedback_plan.get("additional_recommendation") is None
    ):
        return "all_detected"
    return "incomplete"


def _only_connectors_added(original: str, candidate: str) -> bool:
    expected = _WORD.findall(original.lower())
    tokens = _WORD.findall(candidate.lower())
    position = 0
    added = 0
    for index, token in enumerate(tokens):
        if position < len(expected) and token == expected[position]:
            position += 1
        elif token in _SHORTENED_CONNECTORS and index > 0:
            added += 1
        else:
            return False
    return position == len(expected) and added <= 1


def _validated_shortened_beautify(
    text: str,
    skeleton: str,
    reflection_index: int | None,
) -> str | None:
    normalized = text.strip()
    if not normalized or len(normalized) > 2500 or _NUMERIC_GRADE.search(normalized):
        return None
    output_lines = normalized.split("\n")
    skeleton_lines = skeleton.split("\n")
    if len(output_lines) != len(skeleton_lines):
        return None
    for index, (output_line, skeleton_line) in enumerate(zip(output_lines, skeleton_lines)):
        output_line = output_line.strip()
        if index == 0 or skeleton_line in ("", _SHORTENED_PRAISE_HEADING, _SHORTENED_SUGGESTION_HEADING):
            if output_line != skeleton_line:
                return None
        elif index == reflection_index:
            if not output_line.endswith("?") or not _only_connectors_added(skeleton_line, output_line):
                return None
        elif not output_line.startswith("- ") or not _only_connectors_added(skeleton_line[2:], output_line[2:]):
            return None
    return normalized


def _assemble_shortened(
    answer: dict[str, Any],
    fallback_sections: list[str],
    fallback_reasons: list[dict[str, str]],
    provider: FeedbackProvider,
) -> dict[str, Any]:
    praises = answer["praises"]
    suggestions = [
        text for key in ("main_recommendation", "additional_recommendation")
        if (text := answer[key])
    ]
    reflection = answer["reflection_question"]

    lines = [answer["introduction"]]
    if praises:
        lines += ["", _SHORTENED_PRAISE_HEADING, *(f"- {text}" for text in praises)]
    if suggestions:
        lines += ["", _SHORTENED_SUGGESTION_HEADING, *(f"- {text}" for text in suggestions)]
    reflection_index = None
    if reflection:
        lines += ["", reflection]
        reflection_index = len(lines) - 1
    skeleton = "\n".join(lines)

    suggestion = skeleton
    if len(praises) + len(suggestions) + (1 if reflection else 0) > 1:
        beautified, beautify_reason = _generate_one((provider, build_shortened_beautify_request(skeleton)))
        validated = (
            _validated_shortened_beautify(beautified, skeleton, reflection_index)
            if isinstance(beautified, str) else None
        )
        if validated is not None:
            suggestion = validated
        else:
            fallback_sections.append("beautify_variant_2")
            fallback_reasons.append({
                "section": "beautify_variant_2",
                "reason": beautify_reason or "invalid_response",
            })

    return {
        "suggestion": suggestion,
        "used_fallback": bool(fallback_sections),
        "fallback_sections": fallback_sections,
        "fallback_reasons": fallback_reasons,
    }


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
    """Plan, generate, validate, and assemble one teacher-editable suggestion."""
    if not isinstance(code, str) or not code.strip():
        raise ValueError("code is required")

    style = _resolve_answer_style(answer_style)
    feedback_plan = build_feedback_plan(
        task_analysis,
        code_standard_analysis,
        include_all_not_detected_guidance=style == "shortened",
    )
    shortened = style == "shortened" and feedback_plan.get("source") in _SHORTENED_SOURCES
    if feedback_plan.get("source") == "all_not_detected" and not shortened:
        return {
            "suggestion": _ALL_NOT_DETECTED_MESSAGE,
            "used_fallback": False,
            "fallback_sections": [],
            "fallback_reasons": [],
        }

    generation_requests = build_generation_requests(
        feedback_plan,
        code,
        task_title=task_title,
        task_preview=task_preview,
        concise=shortened,
    )
    if shortened:
        generation_requests.insert(
            0,
            build_introduction_request(_opening_category(feedback_plan, code)),
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

    if shortened:
        assert active_provider is not None
        return _assemble_shortened(answer, fallback_sections, fallback_reasons, active_provider)

    suggestion_parts = [*answer["praises"]]
    if answer["completion_statement"]:
        suggestion_parts.append(answer["completion_statement"])
    suggestion_parts.extend(
        text
        for key in ("main_recommendation", "additional_recommendation", "reflection_question")
        if (text := answer[key])
    )
    assembled_suggestion = "\n".join(suggestion_parts)
    suggestion = assembled_suggestion

    should_beautify = (
        feedback_plan.get("source") == "task_analysis"
        and len(suggestion_parts) > 1
    )
    if should_beautify:
        beautify_request = build_beautify_request({
            "praises": answer["praises"],
            "completion_statement": answer["completion_statement"],
            "main_recommendation": answer["main_recommendation"],
            "additional_recommendation": answer["additional_recommendation"],
            "reflection_question": answer["reflection_question"],
        })
        assert active_provider is not None
        beautified, beautify_reason = _generate_one((active_provider, beautify_request))
        validated_beautified = _validated_beautify(
            beautified,
            answer["reflection_question"],
        ) if isinstance(beautified, str) else None
        if validated_beautified is not None:
            suggestion = validated_beautified
        else:
            fallback_sections.append("beautify")
            fallback_reasons.append({
                "section": "beautify",
                "reason": beautify_reason or "invalid_response",
            })

    return {
        "suggestion": suggestion,
        "used_fallback": bool(fallback_sections),
        "fallback_sections": fallback_sections,
        "fallback_reasons": fallback_reasons,
    }