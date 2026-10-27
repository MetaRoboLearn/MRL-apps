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
    "compact_feedback",
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
    ) -> list[GenerationRequest]:
        """Build section requests using the supplied plan and mode-specific wording.

        Args:
            plan: Selected plan items that determine which sections are requested.
            code: Submitted source used to extract evidence for request context.
            task_title: Optional title used to ground wording in the task goal.
            task_preview: Optional description used to clarify the expected behavior.
            task_analysis: Coverage and syntax data used by modes that need it.
            additional_instructions: Optional extra system instructions keyed by request kind.

        Returns:
            Requests for the sections this mode chooses to generate.
        """
        ...

    def fallback_text(self, request: GenerationRequest) -> str:
        """Return deterministic wording when the provider output cannot be used.

        Args:
            request: Failed request, including its kind and structured input context.

        Returns:
            User-facing fallback text appropriate to this mode and request.
        """
        ...

    def validate_section_response(
        self,
        request: GenerationRequest,
        normalized: str,
    ) -> str | None:
        """Apply mode-specific checks after shared safety validation.

        Args:
            request: Request whose kind and context define the output contract.
            normalized: Trimmed model output that passed shared safeguards.

        Returns:
            The accepted text, or None when it violates this mode's contract.
        """
        ...

    def early_response(self, plan: dict[str, Any]) -> dict[str, Any] | None:
        """Return a complete response for plan cases that need no provider call.

        Args:
            plan: Selected feedback plan being evaluated for an early-return case.

        Returns:
            The API response when this mode handles the plan immediately, else None.
        """
        ...

    def build_answer_draft(
        self,
        answer: dict[str, Any],
        plan: dict[str, Any],
    ) -> AnswerDraft:
        """Assemble validated sections into this mode's answer structure.

        Args:
            answer: Generated or fallback wording grouped by section kind.
            plan: Original plan used to determine ordering and completion text.

        Returns:
            A draft suggestion and optional final-generation/validation context.
        """
        ...

    def validate_final_response(
        self,
        normalized: str,
        draft: AnswerDraft,
    ) -> str | None:
        """Validate optional final-pass output against the draft's mode-specific contract.

        Args:
            normalized: Trimmed final-pass output that passed shared safeguards.
            draft: Draft and validation context against which structural edits are checked.

        Returns:
            Accepted final wording, or None to retain the original draft suggestion.
        """
        ...