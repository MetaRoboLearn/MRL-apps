from __future__ import annotations

from typing import Any

from analytics.dataset_creator import DatasetFilters, create_dataset
from repositories.user_badge_repository import UserBadgeRepository
from analytics.visualisation_algorithm import (
    _as_data_uri,
    build_student_portfolio_data,
    generate_duration_boxplot,
    generate_heatmap,
    generate_summary_metrics,
)


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
