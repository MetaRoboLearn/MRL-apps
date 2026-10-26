from __future__ import annotations

import math
import re
from typing import Any, Mapping

from . import prompts_default
from .prompt_types import AnswerDraft, GenerationKind, GenerationRequest


_INTRODUCTION_INSTRUCTIONS = (
    "Napiši jednu kratku, toplu uzvičnu rečenicu kao uvod povratne informacije. Polje "
    "opening_category određuje ton i značenje: all_detected znači da su svi očekivani programski "
    "elementi korišteni u kodu, ali ne tvrdi da je rješenje bez grešaka; high_coverage znači da je "
    "pokrivenost očekivanih elemenata visoka (80% ili više), moderate_coverage znači da je "
    "pokrivenost srednja (40% do manje od 80%), a low_coverage znači da je pokrivenost niska "
    "(manje od 40%); coverage_unavailable znači da se pokrivenost ne može pouzdano odrediti, "
    "pa koristi neutralan poticajan ton bez tvrdnje o napretku. "
    "Ne moraš koristiti točne izraze, ali značenje i ton moraju odgovarati kategoriji. "
    "Ne opisuj provjeru koda, nego govori o dojmu o rješenju. "
    "Završi uskličnikom (!) i ne dodaj ništa nakon njega."
)

_BEAUTIFY_VARIANT_2_INSTRUCTIONS = (
    "Dobit ćeš već sastavljen odgovor u polju structured_feedback. Prvi redak je uvod, zatim slijede "
    "naslovi, točkasti popisi i pitanje na kraju. Cilj je samo da tekst zvuči prirodnije. Veznik smiješ "
    "dodati samo tamo gdje stvarno povezuje dvije misli, obično unutar rečenice, na primjer zato, jer, "
    "ali, ipak, osim toga ili kako bi. Većina redaka može ostati nepromijenjena. Nemoj dodavati veznik "
    "na početak retka, nemoj ga stavljati na svaki redak i nemoj ga dodavati kao puko punilo bez značenja. "
    "Nemoj mijenjati uvod ni naslove, nemoj dodavati ni brisati retke ni točkice, nemoj mijenjati "
    "redoslijed i nemoj dodavati nove činjenice, preporuke, tvrdnje ili brojčane ocjene. Zadnji redak "
    "mora ostati pitanje koje završava upitnikom. Vrati samo cijeli odgovor u istom obliku, bez Markdowna."
)

_CONCISE_INSTRUCTIONS = (
    "Odgovor neka bude u jednoj rečenici, bez nabrajanja "
    "i bez dodatnih objašnjenja."
)
_CONCISE_KINDS: frozenset[GenerationKind] = frozenset({
    "praise",
    "main_recommendation",
    "additional_recommendation",
})
_INTRODUCTION_FALLBACKS = {
    "all_detected": "Bravo!",
    "high_coverage": "Odlično napreduješ!",
    "moderate_coverage": "Vidim da se trudiš!",
    "low_coverage": "Krenimo korak po korak.",
}
_PRAISE_HEADING = "Ovo si dobro napravio:"
_SUGGESTION_HEADING = "Ovo bi mogao bolje provjeriti:"
_CONNECTORS = frozenset({
    "pa", "ali", "zato", "jer", "ipak", "još", "osim", "toga", "kako", "bi", "nego",
})
_WORD = re.compile(r"\w+")


def build_introduction_request(opening_category: str) -> GenerationRequest:
    return prompts_default.build_generation_request(
        "introduction",
        {"opening_category": opening_category},
        instructions=_INTRODUCTION_INSTRUCTIONS,
    )


def build_shortened_beautify_request(structured_feedback: str) -> GenerationRequest:
    return prompts_default.build_generation_request(
        "beautify_variant_2",
        {"structured_feedback": structured_feedback},
        instructions=_BEAUTIFY_VARIANT_2_INSTRUCTIONS,
    )


def _opening_category(
    feedback_plan: dict[str, Any],
    task_analysis: dict[str, Any] | None,
) -> str:
    if feedback_plan.get("completion_statement"):
        return "all_detected"

    completion = task_analysis.get("weighted_completion") if isinstance(task_analysis, dict) else None
    if (
        not isinstance(completion, (int, float))
        or isinstance(completion, bool)
        or not math.isfinite(completion)
    ):
        return "coverage_unavailable"

    completion_percent = int(min(1.0, max(0.0, completion)) * 100 + 0.5)
    if completion_percent < 40:
        return "low_coverage"
    if completion_percent < 80:
        return "moderate_coverage"
    return "high_coverage"


def _only_connectors_added(original: str, candidate: str) -> bool:
    expected = _WORD.findall(original.lower())
    tokens = _WORD.findall(candidate.lower())
    position = 0
    added = 0
    for index, token in enumerate(tokens):
        if position < len(expected) and token == expected[position]:
            position += 1
        elif token in _CONNECTORS and index > 0:
            added += 1
        else:
            return False
    return position == len(expected) and added <= 1


class ShortenedPromptMode(prompts_default.DefaultPromptMode):
    name = "shortened"

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
        if plan.get("source") == "coding_standard_compatibility":
            return super().build_generation_requests(
                plan,
                code,
                task_title,
                task_preview,
                task_analysis,
                additional_instructions=additional_instructions,
            )

        introduction = build_introduction_request(_opening_category(plan, task_analysis))
        mode_instructions = dict(additional_instructions or {})
        for kind in _CONCISE_KINDS:
            existing_instruction = mode_instructions.get(kind)
            mode_instructions[kind] = (
                f"{existing_instruction} {_CONCISE_INSTRUCTIONS}"
                if existing_instruction
                else _CONCISE_INSTRUCTIONS
            )
        requests = super().build_generation_requests(
            plan,
            code,
            task_title,
            task_preview,
            task_analysis,
            additional_instructions=mode_instructions,
        )
        return [introduction, *requests]

    def fallback_text(self, request: GenerationRequest) -> str:
        if request.kind == "introduction":
            opening_category = request.context.get("opening_category")
            if not isinstance(opening_category, str):
                opening_category = ""
            return _INTRODUCTION_FALLBACKS.get(
                opening_category,
                "Vidim da se trudiš!",
            )
        if request.kind == "beautify_variant_2":
            return str(request.context.get("structured_feedback", ""))
        return super().fallback_text(request)

    def validate_section_response(
        self,
        request: GenerationRequest,
        normalized: str,
    ) -> str | None:
        validated = super().validate_section_response(request, normalized)
        if validated is None:
            return None
        if request.kind == "introduction" and not validated.endswith("!"):
            return None
        return validated

    def early_response(self, plan: dict[str, Any]) -> dict[str, Any] | None:
        if plan.get("source") == "all_not_detected":
            return None
        return super().early_response(plan)

    def build_answer_draft(
        self,
        answer: dict[str, Any],
        plan: dict[str, Any],
    ) -> AnswerDraft:
        if plan.get("source") == "coding_standard_compatibility":
            return super().build_answer_draft(answer, plan)

        praises = answer["praises"]
        suggestions = [
            text for key in ("main_recommendation", "additional_recommendation")
            if (text := answer[key])
        ]
        reflection = answer["reflection_question"]

        lines = [answer["introduction"]]
        if praises:
            lines += ["", _PRAISE_HEADING, *(f"- {text}" for text in praises)]
        if suggestions:
            lines += ["", _SUGGESTION_HEADING, *(f"- {text}" for text in suggestions)]
        reflection_index = None
        if reflection:
            lines += ["", reflection]
            reflection_index = len(lines) - 1
        suggestion = "\n".join(lines)

        if len(praises) + len(suggestions) + (1 if reflection else 0) <= 1:
            return AnswerDraft(suggestion=suggestion)

        final_request = build_shortened_beautify_request(suggestion)
        return AnswerDraft(
            suggestion=suggestion,
            final_request=final_request,
            validation_context={
                "skeleton": suggestion,
                "reflection_index": reflection_index,
            },
            allow_newlines=True,
        )

    def validate_final_response(
        self,
        normalized: str,
        draft: AnswerDraft,
    ) -> str | None:
        skeleton = draft.validation_context["skeleton"]
        reflection_index = draft.validation_context["reflection_index"]
        output_lines = normalized.split("\n")
        skeleton_lines = skeleton.split("\n")
        if len(output_lines) != len(skeleton_lines):
            return None
        for index, (output_line, skeleton_line) in enumerate(zip(output_lines, skeleton_lines)):
            output_line = output_line.strip()
            if index == 0 or skeleton_line in ("", _PRAISE_HEADING, _SUGGESTION_HEADING):
                if output_line != skeleton_line:
                    return None
            elif index == reflection_index:
                if not output_line.endswith("?") or not _only_connectors_added(skeleton_line, output_line):
                    return None
            elif not output_line.startswith("- ") or not _only_connectors_added(
                skeleton_line[2:], output_line[2:]
            ):
                return None
        return normalized