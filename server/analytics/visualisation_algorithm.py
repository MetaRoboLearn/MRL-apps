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
    if "task_title" in dataframe:
        return dataframe["task_title"].fillna(_task_key(dataframe)).astype(str)
    return _task_key(dataframe)


def generate_heatmap(dataframe: pd.DataFrame) -> bytes:
    """Return a cohort-level student/task outcome matrix as PNG bytes."""
    if dataframe.empty:
        logger.info("Generating empty heatmap")
        return _empty_plot("No data available")

    values = dataframe.assign(
        _student=dataframe["user_id"].astype(str),
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
    plt.yticks(np.arange(matrix.shape[0]), list(matrix.index))
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
    for task in tasks:
        values = [
            float(value)
            for value, task_value in zip(data["duration_seconds"], data["_task"])
            if task_value == task
        ]
        distributions.append(np.asarray(values, dtype=float))
    task_labels = data.drop_duplicates("_task").set_index("_task")["_task_label"]

    plt.figure(figsize=(max(8, min(30, 3 + len(tasks) * 2)), 7))
    plt.boxplot(distributions, showmeans=True)
    plt.xticks(
        range(1, len(tasks) + 1),
        [task_labels.get(task, task) for task in tasks],
        rotation=45,
        ha="right",
    )
    plt.ylabel("Time Spent (Seconds)")
    plt.xlabel("Task")
    plt.title("Task Duration Distribution")
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
) -> dict[str, Any]:
    """Build one student portfolio containing per-task cards."""
    if summaries.empty:
        logger.info("Building empty student portfolio: student_id=%s", student_id)
        return {"student_id": student_id, "task_cards": []}
    student_summaries = summaries[summaries["user_id"] == student_id].copy()
    student_processed = processed[processed["user_id"] == student_id]
    cards = []
    badge_state = badge_state or {}

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
            "title": _json_value(summary["task_title"]),
            "status": _json_value(summary["status"]),
            "time_spent_seconds": _json_value(summary["duration_seconds"]),
            "attempt_date": _json_value(summary["first_attempt_at"]),
            "task_difficulty": _json_value(task_rows["task_difficulty"].iloc[0]) if not task_rows.empty else None,
            "code_complexity": complexity_note,
            "attempt_count": _json_value(summary["attempt_count"]),
            "final_code": _json_value(summary["final_code"]),
            "code_analysis": _json_value(summary["code_analysis"]),
            "trajectory_png": _as_data_uri(generate_trajectory(processed, student_id, task_id)),
            "badge": badge_state.get(task_id),
        })

    logger.debug("Built student portfolio: student_id=%s task_cards=%d", student_id, len(cards))
    return {"student_id": student_id, "task_cards": cards}
