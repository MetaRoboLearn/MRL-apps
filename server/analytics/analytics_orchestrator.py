from __future__ import annotations

import logging
from typing import Any

from analytics.dataset_creator import DatasetFilters, create_dataset
from repositories.user_badge_repository import UserBadgeRepository
from validators.llm_feedback_generator.llm_feedback_generator import LLMFeedbackGenerator
from models.badge import Badge
from analytics.visualisation_algorithm import (
    _as_data_uri,
    _json_value,
    build_student_portfolio_data,
    generate_duration_boxplot,
    generate_heatmap,
    generate_summary_metrics,
    generate_task_summary_table,
)

logger = logging.getLogger(__name__)


def _badge_state_for_user(session, user_id: int) -> dict[int, dict[str, Any]]:
    """Return read-only badge state keyed by the linked activity task."""
    repository = UserBadgeRepository(session)
    state = {}
    for assignment in repository.list_by_user(user_id):
        state[assignment.badge.relevant_activity_task_id] = repository.assignment_state_dict(assignment)
    return state


def _badge_definitions_for_tasks(session, activity_task_ids) -> dict[int, dict[str, Any]]:
    """Return task-linked badge definitions, including unassigned badges."""
    task_ids = tuple({int(task_id) for task_id in activity_task_ids if task_id is not None})
    if not task_ids:
        return {}

    badges = session.query(Badge).filter(Badge.relevant_activity_task_id.in_(task_ids)).all()
    return {
        badge.relevant_activity_task_id: {
            "badge_id": badge.id,
            "title": badge.title,
            "description": badge.description,
            "value": badge.value,
            "image_url": badge.image_url,
            "relevant_activity_task_id": badge.relevant_activity_task_id,
        }
        for badge in badges
    }


def generate_group_analytics(session, filters: DatasetFilters) -> dict[str, Any]:
    """Generate metrics and plots for all selected groups as one cohort."""
    logger.info(
        "Generating group analytics for groups=%s activities=%s",
        filters.group_ids,
        filters.activity_ids,
    )
    processed, summaries = create_dataset(session, filters)
    logger.info(
        "Group analytics dataset ready: processed_rows=%d summary_rows=%d",
        len(processed),
        len(summaries),
    )
    return {
        "summary_table": generate_summary_metrics(summaries),
        "task_summary_table": generate_task_summary_table(summaries),
        "heatmap_png": _as_data_uri(generate_heatmap(processed)),
        "boxplot_png": _as_data_uri(generate_duration_boxplot(summaries)),
        "student_ids": sorted(processed["user_id"].dropna().unique().tolist())
        if not processed.empty
        else [],
    }


def generate_student_portfolio(session, student_id: int, filters: DatasetFilters) -> dict[str, Any]:
    """Generate one teacher/admin student portfolio from authorized dataset rows."""
    logger.info(
        "Generating student portfolio for student_id=%s groups=%s activities=%s",
        student_id,
        filters.group_ids,
        filters.activity_ids,
    )
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
    badge_definitions = _badge_definitions_for_tasks(session, summaries.get("activity_task_id", []))
    portfolio = build_student_portfolio_data(
        processed,
        summaries,
        student_id,
        badge_state=_badge_state_for_user(session, student_id),
        badge_definitions=badge_definitions,
    )
    logger.info("Student portfolio generated: student_id=%s task_cards=%d", student_id, len(portfolio["task_cards"]))
    return portfolio


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
            "activity_title": _json_value(summary["activity_title"]),
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
    logger.info("Generating reduced submissions for student_id=%s", student_id)
    filters = DatasetFilters(user_ids=(student_id,))
    _, summaries = create_dataset(session, filters)
    submissions = build_reduced_submissions(
        summaries,
        badge_state=_badge_state_for_user(session, student_id),
    )
    logger.info("Reduced submissions generated: student_id=%s count=%d", student_id, len(submissions))
    return submissions


def generate_llm_feedback(code: str, analysis: dict[str, Any] | None = None) -> dict[str, Any]:
    """Generate a teacher-editable comment suggestion; never persisted here."""
    if not code or not code.strip():
        logger.warning("LLM feedback requested without code")
        return {"error": "code is required"}
    logger.info("Starting LLM feedback generation: analysis_supplied=%s", analysis is not None)
    try:
        generator = LLMFeedbackGenerator()
        suggestion = generator.generate_feedback(code, analysis)
    except Exception as error:  # provider errors, timeouts, invalid output
        logger.exception("LLM feedback generation failed")
        return {"error": f"Failed to generate feedback: {error}"}
    if suggestion.startswith("Error generating feedback"):
        logger.warning("LLM feedback provider returned an error response")
    else:
        logger.info("LLM feedback generation completed")
    return {"suggestion": suggestion}
