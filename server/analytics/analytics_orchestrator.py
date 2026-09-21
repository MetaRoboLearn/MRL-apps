from __future__ import annotations

from typing import Any

from analytics.dataset_creator import DatasetFilters, create_dataset
from repositories.user_badge_repository import UserBadgeRepository
from validators.llm_feedback_generator.llm_feedback_generator import LLMFeedbackGenerator
from analytics.visualisation_algorithm import (
    _as_data_uri,
    _json_value,
    build_student_portfolio_data,
    generate_duration_boxplot,
    generate_heatmap,
    generate_summary_metrics,
)
from utils import _to_utc_iso


def _badge_state_for_user(session, user_id: int) -> dict[int, dict[str, Any]]:
    """Return read-only badge state keyed by the linked activity task."""
    state = {}
    for assignment in UserBadgeRepository(session).list_by_user(user_id):
        badge = assignment.badge
        state[badge.relevant_activity_task_id] = {
            "assigned": True,
            "user_badge_id": assignment.id,
            "badge_id": badge.id,
            "title": badge.title,
            "description": badge.description,
            "image_url": badge.image_url,
            "comment": assignment.comment,
            "created_at": _to_utc_iso(assignment.created_at),
            "created_by": assignment.created_by,
        }
    return state


def generate_group_analytics(session, filters: DatasetFilters) -> dict[str, Any]:
    """Generate metrics and plots for all selected groups as one cohort."""
    processed, summaries = create_dataset(session, filters)
    return {
        "summary_table": generate_summary_metrics(summaries),
        "heatmap_png": _as_data_uri(generate_heatmap(processed)),
        "boxplot_png": _as_data_uri(generate_duration_boxplot(summaries)),
        "student_ids": sorted(processed["user_id"].dropna().unique().tolist())
        if not processed.empty
        else [],
    }


def generate_student_portfolio(session, student_id: int, filters: DatasetFilters) -> dict[str, Any]:
    """Generate one teacher/admin student portfolio from authorized dataset rows."""
    scoped_filters = DatasetFilters(
        activity_ids=filters.activity_ids,
        activity_task_ids=filters.activity_task_ids,
        task_ids=filters.task_ids,
        user_ids=(student_id,),
        group_ids=filters.group_ids,
        date_filter=filters.date_filter,
        ignore_activity_task_ids=filters.ignore_activity_task_ids,
        ignore_task_ids=filters.ignore_task_ids,
        excluded_usernames=filters.excluded_usernames,
        excluded_task_previews=filters.excluded_task_previews,
    )
    processed, summaries = create_dataset(session, scoped_filters)
    return build_student_portfolio_data(
        processed,
        summaries,
        student_id,
        badge_state=_badge_state_for_user(session, student_id),
    )


def build_reduced_submissions(
    summaries,
    badge_state: dict[int, dict[str, Any]],
) -> list[dict[str, Any]]:
    """Build the student-facing reduced submission view (no teacher-only fields)."""
    if summaries.empty:
        return []
    submissions = []
    for _, summary in summaries.sort_values("first_attempt_at").iterrows():
        task_id = int(summary["activity_task_id"])
        submissions.append({
            "activity_task_id": task_id,
            "task_id": _json_value(summary["task_id"]),
            "task_name": _json_value(summary["task_title"]),
            "status": _json_value(summary["status"]),
            "attempt_date": _json_value(summary["first_attempt_at"]),
            "attempt_count": _json_value(summary["attempt_count"]),
            "duration_seconds": _json_value(summary["duration_seconds"]),
            "final_code": _json_value(summary["final_code"]),
            "code_analysis": _json_value(summary["code_analysis"]),
            "badge": badge_state.get(task_id),
        })
    return submissions


def generate_reduced_submissions(session, student_id: int) -> list[dict[str, Any]]:
    """Generate the authenticated student's own reduced submission view."""
    filters = DatasetFilters(user_ids=(student_id,))
    _, summaries = create_dataset(session, filters)
    return build_reduced_submissions(
        summaries,
        badge_state=_badge_state_for_user(session, student_id),
    )


def generate_llm_feedback(code: str, analysis: dict[str, Any] | None = None) -> dict[str, Any]:
    """Generate a teacher-editable comment suggestion; never persisted here."""
    if not code or not code.strip():
        return {"error": "code is required"}
    try:
        generator = LLMFeedbackGenerator()
        suggestion = generator.generate_feedback(code, analysis)
    except Exception as error:  # provider errors, timeouts, invalid output
        return {"error": f"Failed to generate feedback: {error}"}
    return {"suggestion": suggestion}
