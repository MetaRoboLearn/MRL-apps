from __future__ import annotations

import base64
import io
import logging
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.dates as mdates
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib.colors import BoundaryNorm, ListedColormap

logger = logging.getLogger(__name__)


OUTCOME_RANK = {
    "Success_both": 5,
    "Success_robot": 5,
    "Success_sim": 4,
    "Success": 4,
    "Abandoned": 2,
    "Fail": 1,
}


def _as_data_uri(image: bytes) -> str:
    encoded = base64.b64encode(image).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def _png_from_current_figure() -> bytes:
    output = io.BytesIO()
    try:
        plt.savefig(output, format="png", bbox_inches="tight", dpi=150)
        return output.getvalue()
    except Exception:
        logger.exception("Failed to render visualisation PNG")
        raise
    finally:
        output.close()
        plt.close()


def _task_key(dataframe: pd.DataFrame) -> pd.Series:
    if "activity_task_id" in dataframe:
        return dataframe["activity_task_id"].fillna(dataframe["task_id"]).astype(str)
    return dataframe["task_id"].astype(str)


def _task_label(dataframe: pd.DataFrame) -> pd.Series:
    task_keys = _task_key(dataframe)
    titles = dataframe.get("task_title", pd.Series(index=dataframe.index, dtype=object)).fillna("").astype(str).str.strip()
    previews = dataframe.get("task_preview", pd.Series(index=dataframe.index, dtype=object)).fillna("").astype(str).str.strip()
    labels = titles.where(titles.ne(""), task_keys)
    return labels.where(previews.eq(""), labels + " - " + previews)


def _student_label(dataframe: pd.DataFrame) -> pd.Series:
    first_names = dataframe.get("first_name", pd.Series(index=dataframe.index, dtype=object)).fillna("").astype(str).str.strip()
    last_names = dataframe.get("last_name", pd.Series(index=dataframe.index, dtype=object)).fillna("").astype(str).str.strip()
    usernames = dataframe.get("username", pd.Series(index=dataframe.index, dtype=object)).fillna("").astype(str).str.strip()
    identifiers = dataframe.get("user_id", pd.Series(index=dataframe.index, dtype=object)).astype(str)
    names = (first_names + " " + last_names).str.strip()
    return names.where(names.ne(""), usernames.where(usernames.ne(""), "Student " + identifiers))


def _task_label_value(summary: pd.Series) -> str:
    title = str(summary.get("task_title") or "").strip()
    preview = str(summary.get("task_preview") or "").strip()
    fallback = str(summary.get("activity_task_id") or summary.get("task_id") or "Task")
    label = title or fallback
    return f"{label} - {preview}" if preview else label


def generate_heatmap(dataframe: pd.DataFrame) -> bytes:
    """Return a cohort-level student/task outcome matrix as PNG bytes."""
    if dataframe.empty:
        logger.info("Generating empty heatmap")
        return _empty_plot("No data available")

    values = dataframe.assign(
        _student=dataframe["user_id"].astype(str),
        _student_label=_student_label(dataframe),
        _task=_task_key(dataframe),
        _task_label=_task_label(dataframe),
        _rank=dataframe["session_outcome"].map(OUTCOME_RANK).fillna(0),
    )
    matrix = values.pivot_table(
        index="_student", columns="_task", values="_rank", aggfunc="max", fill_value=0
    )
    logger.debug("Generating heatmap: students=%d tasks=%d", matrix.shape[0], matrix.shape[1])
    task_labels = values.drop_duplicates("_task").set_index("_task")["_task_label"]
    matrix.columns = [task_labels.get(task, task) for task in matrix.columns]

    figure_width = max(8, min(30, 2 + matrix.shape[1] * 1.5))
    figure_height = max(4, min(24, 2 + matrix.shape[0] * 0.35))
    plt.figure(figsize=(figure_width, figure_height))
    cmap = ListedColormap(["#f0f0f0", "#e74c3c", "#ff9800", "#b0b0b0", "#3498db", "#2ecc71"])
    norm = BoundaryNorm([-0.5, 0.5, 1.5, 2.5, 3.5, 4.5, 5.5], cmap.N)
    image = plt.imshow(matrix.to_numpy(), cmap=cmap, norm=norm, aspect="auto")
    plt.colorbar(image, ticks=[0, 1, 2, 4, 5], label="Status")
    plt.xticks(np.arange(matrix.shape[1]), list(matrix.columns), rotation=45, ha="right")
    student_labels = values.drop_duplicates("_student").set_index("_student")["_student_label"]
    display_labels = []
    for student_id in matrix.index:
        label = student_labels.get(student_id, student_id)
        duplicate_count = (values["_student_label"] == label).sum()
        display_labels.append(f"{label} ({student_id})" if duplicate_count > 1 else label)
    plt.yticks(np.arange(matrix.shape[0]), display_labels)
    plt.xlabel("Task")
    plt.ylabel("Student")
    plt.title("Student Performance Matrix")
    return _png_from_current_figure()


def generate_duration_boxplot(summaries: pd.DataFrame) -> bytes:
    """Return cohort-level task duration distributions as PNG bytes."""
    if summaries.empty:
        logger.info("Generating empty duration boxplot")
        return _empty_plot("No data available")

    data = summaries.copy()
    data["_task"] = _task_key(data)
    data["_task_label"] = _task_label(data)
    data["duration_seconds"] = pd.to_numeric(data["duration_seconds"], errors="coerce").fillna(0)
    tasks = list(data["_task"].drop_duplicates())
    logger.debug("Generating duration boxplot: summaries=%d tasks=%d", len(data), len(tasks))
    distributions = []
    student_names = []
    for task in tasks:
        task_rows = data[data["_task"] == task]
        distributions.append(task_rows["duration_seconds"].to_numpy(dtype=float))
        student_names.append(task_rows.apply(lambda row: _student_label(pd.DataFrame([row])).iloc[0], axis=1).tolist())
    task_labels = data.drop_duplicates("_task").set_index("_task")["_task_label"]

    figure, axis = plt.subplots(figsize=(max(8, min(30, 3 + len(tasks) * 2)), 7))
    axis.boxplot(distributions, showmeans=True)
    for position, distribution in enumerate(distributions, start=1):
        if len(distribution) < 2:
            continue
        first_quartile, third_quartile = np.percentile(distribution, [25, 75])
        interquartile_range = third_quartile - first_quartile
        lower_bound = first_quartile - 1.5 * interquartile_range
        upper_bound = third_quartile + 1.5 * interquartile_range
        for value, name in zip(distribution, student_names[position - 1]):
            if value < lower_bound or value > upper_bound:
                axis.annotate(name, (position, value), xytext=(5, 3), textcoords="offset points", fontsize=8, rotation=25)
    axis.set_xticks(
        range(1, len(tasks) + 1),
        [task_labels.get(task, task) for task in tasks],
        rotation=45,
        ha="right",
    )
    axis.set_ylabel("Time Spent (Seconds)")
    axis.set_xlabel("Task")
    axis.set_title("Task Duration Distribution")
    figure.tight_layout()
    return _png_from_current_figure()


def generate_trajectory(
    processed: pd.DataFrame,
    user_id: int,
    activity_task_id: int | None = None,
) -> bytes:
    """Return a student's code-complexity trajectory as PNG bytes."""
    data = processed[processed["user_id"] == user_id].copy()
    if activity_task_id is not None:
        data = data[data["activity_task_id"] == activity_task_id]
    if data.empty:
        logger.info("Generating empty trajectory: student_id=%s activity_task_id=%s", user_id, activity_task_id)
        return _empty_plot("No data available")

    logger.debug(
        "Generating trajectory: student_id=%s activity_task_id=%s rows=%d",
        user_id,
        activity_task_id,
        len(data),
    )

    data["timestamp"] = pd.to_datetime(data["timestamp"], utc=True, errors="coerce")
    data["code_complexity"] = pd.to_numeric(data["code_complexity"], errors="coerce").fillna(0)
    plt.figure(figsize=(12, 6))
    data["_task_key"] = _task_key(data)
    data["_task_label"] = _task_label(data)
    for task_key, task_data in data.groupby("_task_key", sort=False):
        task_data = task_data.sort_values("timestamp")
        label = task_data["_task_label"].iloc[0]
        plt.plot(task_data["timestamp"], task_data["code_complexity"], label=label, alpha=0.75)

    failures = data[data["session_outcome"] == "Fail"]
    successes = data[data["session_outcome"].astype(str).str.startswith("Success")]
    abandoned = data[data["session_outcome"] == "Abandoned"]
    plt.scatter(failures["timestamp"], failures["code_complexity"], marker="x", c="red", label="Failed")
    plt.scatter(successes["timestamp"], successes["code_complexity"], marker="*", c="green", label="Success")
    plt.scatter(abandoned["timestamp"], abandoned["code_complexity"], marker="v", c="orange", label="Abandoned")
    plt.xlabel("Timeline")
    plt.ylabel("Code Complexity")
    plt.title(f"Learning Trajectory: {user_id}")
    plt.gca().xaxis.set_major_formatter(mdates.DateFormatter("%H:%M:%S"))
    plt.legend(loc="best")
    plt.tight_layout()
    return _png_from_current_figure()


def generate_summary_metrics(summaries: pd.DataFrame) -> list[dict[str, Any]]:
    """Return JSON-safe metrics for the combined selected-group cohort."""
    if summaries.empty:
        logger.info("Generating empty summary metrics")
        return [{"metric_name": "students", "value": 0}, {"metric_name": "tasks", "value": 0}]

    statuses = summaries["status"].astype(str)
    return [
        {"metric_name": "students", "value": int(summaries["user_id"].nunique())},
        {"metric_name": "tasks", "value": int(summaries["activity_task_id"].nunique())},
        {"metric_name": "sessions", "value": int(len(summaries))},
        {"metric_name": "successful_sessions", "value": int(statuses.str.startswith("Success").sum())},
        {"metric_name": "failed_sessions", "value": int((statuses == "Fail").sum())},
        {"metric_name": "abandoned_sessions", "value": int((statuses == "Abandoned").sum())},
    ]


def generate_task_summary_table(summaries: pd.DataFrame) -> list[dict[str, Any]]:
    """Return one aggregate row for each selected activity task."""
    if summaries.empty:
        return []

    rows = []
    for activity_task_id, task_rows in summaries.groupby("activity_task_id", sort=False):
        statuses = task_rows["status"].astype(str)
        attempting_students = int(task_rows["user_id"].nunique())
        successful_students = int(task_rows.loc[statuses.str.startswith("Success"), "user_id"].nunique())
        successful_rows = task_rows[statuses.str.startswith("Success")]
        durations = pd.to_numeric(task_rows["duration_seconds"], errors="coerce").dropna()
        failures = pd.to_numeric(task_rows["fail_count"], errors="coerce").dropna()
        edits = pd.to_numeric(successful_rows["edit_count"], errors="coerce").dropna()
        complexity = pd.to_numeric(task_rows["final_complexity"], errors="coerce").dropna()
        rows.append({
            "activity_task_id": int(activity_task_id),
            "task_label": _task_label_value(task_rows.iloc[0]),
            "task_difficulty": _json_value(task_rows["task_difficulty"].dropna().iloc[0]) if task_rows["task_difficulty"].notna().any() else None,
            "success_rate": round((successful_students / attempting_students) * 100, 2) if attempting_students else 0,
            "average_duration_seconds": _json_value(durations.mean()) if not durations.empty else None,
            "median_duration_seconds": _json_value(durations.median()) if not durations.empty else None,
            "average_failures": _json_value(failures.mean()) if not failures.empty else None,
            "average_edits_to_success": _json_value(edits.mean()) if not edits.empty else None,
            "average_final_solution_complexity": _json_value(complexity.mean()) if not complexity.empty else None,
            "min_task_complexity": _json_value(complexity.min()) if not complexity.empty else None,
            "max_task_complexity": _json_value(complexity.max()) if not complexity.empty else None,
            "attempting_students": attempting_students,
            "successful_students": successful_students,
        })
    return rows


def _empty_plot(message: str) -> bytes:
    plt.figure(figsize=(6, 3))
    plt.text(0.5, 0.5, message, ha="center", va="center")
    plt.axis("off")
    return _png_from_current_figure()


def _json_value(value: Any) -> Any:
    if pd.isna(value):
        return None
    if isinstance(value, (pd.Timestamp,)):
        return value.isoformat()
    if isinstance(value, np.generic):
        return value.item()
    return value


def build_student_portfolio_data(
    processed: pd.DataFrame,
    summaries: pd.DataFrame,
    student_id: int,
    badge_state: dict[int, dict[str, Any]] | None = None,
    badge_definitions: dict[int, dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Build one student portfolio containing per-task cards."""
    if summaries.empty:
        logger.info("Building empty student portfolio: student_id=%s", student_id)
        return {"student_id": student_id, "task_cards": []}
    student_summaries = summaries[summaries["user_id"] == student_id].copy()
    student_processed = processed[processed["user_id"] == student_id]
    cards = []
    badge_state = badge_state or {}
    badge_definitions = badge_definitions or {}

    for _, summary in student_summaries.sort_values("first_attempt_at").iterrows():
        task_id = int(summary["activity_task_id"])
        task_rows = student_processed[student_processed["activity_task_id"] == task_id]
        complexity = pd.to_numeric(task_rows.get("code_complexity", pd.Series(dtype=float)), errors="coerce").dropna()
        complexity_note = {
            "min": float(complexity.min()) if not complexity.empty else 0.0,
            "average": float(complexity.mean()) if not complexity.empty else 0.0,
            "max": float(complexity.max()) if not complexity.empty else 0.0,
        }
        cards.append({
            "activity_task_id": task_id,
            "task_id": _json_value(summary["task_id"]),
            "activity_title": _json_value(summary["activity_title"]),
            "title": _task_label_value(summary),
            "code_template": _json_value(summary["task_code_template"]),
            "status": _json_value(summary["status"]),
            "time_spent_seconds": _json_value(summary["duration_seconds"]),
            "attempt_date": _json_value(summary["first_attempt_at"]),
            "task_difficulty": _json_value(task_rows["task_difficulty"].iloc[0]) if not task_rows.empty else None,
            "code_complexity": complexity_note,
            "attempt_count": _json_value(summary["attempt_count"]),
            "final_code": _json_value(summary["final_code"]),
            "code_analysis": _json_value(summary["code_analysis"]),
            "trajectory_png": _as_data_uri(generate_trajectory(processed, student_id, task_id)),
            "badge_definition": badge_definitions.get(task_id),
            "badge": badge_state.get(task_id),
        })

    logger.debug("Built student portfolio: student_id=%s task_cards=%d", student_id, len(cards))
    return {"student_id": student_id, "task_cards": cards}
