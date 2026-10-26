from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal, Mapping, Protocol


GenerationKind = Literal[
    "praise",
    "main_recommendation",
    "additional_recommendation",
    "reflection_question",
    "compatibility_comment",
    "beautify",
    "introduction",
    "beautify_variant_2",
]


@dataclass(frozen=True)
class GenerationRequest:
    kind: GenerationKind
    system_prompt: str
    user_prompt: str
    context: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class AnswerDraft:
    suggestion: str
    final_request: GenerationRequest | None = None
    validation_context: Mapping[str, Any] = field(default_factory=dict)
    allow_newlines: bool = False


class PromptMode(Protocol):
    name: str

    def build_generation_requests(
        self,
        plan: dict[str, Any],
        code: str,
        task_title: str | None,
        task_preview: str | None,
        task_analysis: dict[str, Any] | None,
        *,
        additional_instructions: Mapping[GenerationKind, str] | None = None,
    ) -> list[GenerationRequest]: ...

    def fallback_text(self, request: GenerationRequest) -> str: ...

    def validate_section_response(
        self,
        request: GenerationRequest,
        normalized: str,
    ) -> str | None: ...

    def early_response(self, plan: dict[str, Any]) -> dict[str, Any] | None: ...

    def build_answer_draft(
        self,
        answer: dict[str, Any],
        plan: dict[str, Any],
    ) -> AnswerDraft: ...

    def validate_final_response(
        self,
        normalized: str,
        draft: AnswerDraft,
    ) -> str | None: ...