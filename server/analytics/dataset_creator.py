from __future__ import annotations

import logging
import xml.etree.ElementTree as ET
from collections import Counter
from dataclasses import dataclass
from datetime import date

import pandas as pd
from flask_login import current_user

from repositories.analytics_repository import AnalyticsRepository
from validators.code_element_detection.analyzer_ast import analyze_code as analyze_code_ast
from validators.code_element_detection.analyzer_regex import analyze_code as analyze_code_regex
from validators.coding_standard_analyzer.coding_standard_analyzer import analyze_coding_standard

logger = logging.getLogger(__name__)

EVENT_COLUMNS = (
    "user_id", "user_started_task_id", "activity_id", "activity_task_id", "task_id",
    "username", "first_name", "last_name", "action_time", "action_type", "value",
    "session_start", "final_code_db", "db_is_finished", "task_title", "task_description",
    "activity_title", "task_code_template", "task_preview", "task_difficulty", "app_mode",
)

RUN_EVENTS = frozenset(("sim_run", "robot_run"))
TERMINAL_ATTEMPT_EVENTS = frozenset(
    ("sim_end_fail", "robot_end_fail", "sim_end_succ", "robot_end_succ", "sim_code_err", "robot_code_err")
)


@dataclass(frozen=True)
class DatasetFilters:
    activity_ids: tuple[int, ...] = ()
    activity_task_ids: tuple[int, ...] = ()
    task_ids: tuple[int, ...] = ()
    user_ids: tuple[int, ...] = ()
    group_ids: tuple[int, ...] = ()
    date_filter: date | None = None
    ignore_activity_task_ids: bool = False
    ignore_task_ids: bool = False
    excluded_usernames: tuple[str, ...] = ()
    excluded_task_previews: tuple[str, ...] = ()


def _text(value) -> str:
    return "" if value is None else str(value)


def _analyze_submission(code: str, app_mode: str) -> tuple[dict | None, dict | None]:
    if not code or app_mode == "blockly":
        return None, None
    try:
        code_analysis = analyze_code_ast(code)
        if "error" in code_analysis:
            code_analysis = analyze_code_regex(code)
    except Exception:
        logger.exception("Code-element analysis failed")
        code_analysis = {"error": "code analysis failed", "elements": [], "counts": {}}
    try:
        standard_analysis = analyze_coding_standard(code)
    except Exception:
        logger.exception("Coding-standard analysis failed")
        standard_analysis = {"error": "coding-standard analysis failed"}
    return code_analysis, standard_analysis


def _calculate_complexity(code: str, mode: str, template: str | None = None) -> int:
    if not code:
        return 0
    try:
        if mode == "blockly" and code.strip().startswith("<xml"):
            current_blocks = len(ET.fromstring(code).findall(".//block"))
            template_blocks = (
                len(ET.fromstring(template).findall(".//block"))
                if template and template.strip().startswith("<xml") else 0
            )
            return max(0, current_blocks - template_blocks)
        current_lines = [line.strip() for line in code.splitlines() if line.strip()]
        if not template:
            return len(current_lines)
        template_lines = [line.strip() for line in template.splitlines() if line.strip()]
        return sum((Counter(current_lines) - Counter(template_lines)).values())
    except (ET.ParseError, TypeError, ValueError):
        return 0


def _row_from_log(log) -> dict:
    started_task = log.user_started_task
    activity_task = started_task.activity_task
    task = activity_task.task
    user = started_task.starter
    return {
        "user_id": user.id,
        "user_started_task_id": started_task.id,
        "activity_id": activity_task.activity_id,
        "activity_task_id": activity_task.id,
        "task_id": activity_task.task_id,
        "activity_title": activity_task.activity.title if activity_task.activity else None,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "action_time": log.created_at,
        "action_type": log.event_type.name if log.event_type else None,
        "value": log.code_snapshot,
        "session_start": started_task.started_at,
        "final_code_db": started_task.current_value,
        "db_is_finished": bool(started_task.is_finished),
        "task_title": task.title if task else None,
        "task_description": task.description if task else None,
        "task_code_template": task.code if task else None,
        "task_preview": activity_task.preview,
        "task_difficulty": activity_task.difficulty,
        "app_mode": activity_task.type.name.lower() if activity_task.type else "blockly",
    }


def load_event_dataframe(repository: AnalyticsRepository, filters: DatasetFilters) -> pd.DataFrame:
    """Load already-authorized log events through the backend repository."""
    logger.debug("Loading analytics events with filters=%s", filters)
    rows = [
        _row_from_log(log)
        for log in repository.list_log_rows(
            actor_user_id=current_user.id,
            actor_role=current_user.role.name,
            filters=filters,
        )
    ]
    dataframe = pd.DataFrame(rows, columns=EVENT_COLUMNS)
    for column in ("action_time", "session_start"):
        dataframe[column] = pd.to_datetime(dataframe[column], utc=True, errors="coerce")
    logger.info("Loaded analytics events: rows=%d", len(dataframe))
    return dataframe


def _processed_record(row, edits, runs, fails, complexity, outcome, completed, final_code, code_analysis, standard_analysis):
    duration = max(0, (row["action_time"] - row["session_start"]).total_seconds())
    return {
        **{column: row[column] for column in EVENT_COLUMNS if column in row},
        "timestamp": row["action_time"],
        "time_since_start_sec": round(duration, 2),
        "code_complexity": complexity,
        "edit_count": edits,
        "run_count": runs,
        "fail_count": fails,
        "session_outcome": outcome,
        "is_task_completion": completed,
        "final_code": final_code,
        "code_analysis": code_analysis,
        "code_standard_analysis": standard_analysis,
    }


def _process_session(group: pd.DataFrame) -> list[dict]:
    first = group.iloc[0]
    final_code = first["final_code_db"]
    if pd.isna(final_code):
        values = group["value"].dropna().astype(str)
        final_code = values.iloc[-1] if not values.empty else ""
    code_analysis, standard_analysis = _analyze_submission(_text(final_code), _text(first["app_mode"]).lower())

    edits = runs = fails = complexity = 0
    completed = has_finish = has_robot_success = has_sim_success = False
    records = []
    for _, row in group.iterrows():
        complexity = max(complexity, _calculate_complexity(_text(row["value"]), _text(row["app_mode"]).lower(), row["task_code_template"]))
        action = row["action_type"]
        if action == "code_edit":
            edits += 1
        elif action in ("sim_run", "robot_run"):
            runs += 1
        elif action in ("sim_end_fail", "robot_end_fail", "sim_code_err", "robot_code_err"):
            fails += 1
            records.append(_processed_record(row, edits, runs, fails, complexity, "Fail", False, final_code, code_analysis, standard_analysis))
        elif action in ("sim_end_succ", "robot_end_succ"):
            if action == "robot_end_succ" and has_robot_success:
                continue
            completed = True
            has_sim_success |= action == "sim_end_succ"
            has_robot_success |= action == "robot_end_succ"
            outcome = "Success_both" if has_sim_success and has_robot_success else ("Success_robot" if action == "robot_end_succ" else "Success_sim")
            records.append(_processed_record(row, edits, runs, fails, complexity, outcome, True, final_code, code_analysis, standard_analysis))
        elif action == "task_finish":
            has_finish = True
            if not bool(row["db_is_finished"]) and not completed:
                records.append(_processed_record(row, edits, runs, fails, complexity, "Abandoned", False, final_code, code_analysis, standard_analysis))
    if not bool(first["db_is_finished"]) and not has_finish and not completed:
        records.append(_processed_record(group.iloc[-1], edits, runs, fails, complexity, "Abandoned", False, final_code, code_analysis, standard_analysis))
    return records


def _attempt_count(group: pd.DataFrame) -> int:
    """Count task executions, falling back to terminal outcomes when needed."""
    run_count = int(group["run_count"].max()) if "run_count" in group else 0
    if run_count:
        return run_count
    actions = group["action_type"].dropna()
    return int(actions.isin(TERMINAL_ATTEMPT_EVENTS).sum())


def build_dataset(dataframe: pd.DataFrame) -> pd.DataFrame:
    """Transform event rows into the processed event-level dataset."""
    if dataframe.empty:
        logger.info("Building processed analytics dataset from empty event data")
        return pd.DataFrame()
    dataframe = dataframe.sort_values(["user_started_task_id", "action_time"])
    records = []
    for _, group in dataframe.groupby("user_started_task_id", sort=False):
        records.extend(_process_session(group))
    processed = pd.DataFrame(records)
    logger.info("Processed analytics dataset: input_rows=%d output_rows=%d", len(dataframe), len(processed))
    return processed


def build_session_summaries(processed: pd.DataFrame) -> pd.DataFrame:
    """Create one derived summary row per started task for later consumers."""
    if processed.empty:
        logger.info("Building session summaries from empty processed data")
        return pd.DataFrame()
    summaries = []
    for session_id, group in processed.groupby("user_started_task_id", sort=False):
        group = group.sort_values("timestamp")
        first, last = group.iloc[0], group.iloc[-1]
        summaries.append({
            "user_id": last["user_id"],
            "user_started_task_id": session_id,
            "activity_id": last["activity_id"],
            "activity_title": last["activity_title"],
            "activity_task_id": last["activity_task_id"],
            "task_id": last["task_id"],
            "task_title": last["task_title"],
            "first_attempt_at": first["session_start"],
            "last_event_at": last["timestamp"],
            "duration_seconds": round(max(0, (last["timestamp"] - first["session_start"]).total_seconds()), 2),
            "attempt_count": _attempt_count(group),
            "status": last["session_outcome"],
            "final_code": last["final_code"],
            "code_analysis": last["code_analysis"],
            "code_standard_analysis": last["code_standard_analysis"],
        })
    result = pd.DataFrame(summaries)
    logger.info("Built analytics session summaries: rows=%d", len(result))
    return result


def create_dataset(session, filters: DatasetFilters) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Return processed event rows and derived session summaries."""
    logger.info("Creating analytics dataset")
    events = load_event_dataframe(AnalyticsRepository(session), filters)
    processed = build_dataset(events)
    summaries = build_session_summaries(processed)
    logger.info("Analytics dataset creation complete: processed_rows=%d summary_rows=%d", len(processed), len(summaries))
    return processed, summaries
