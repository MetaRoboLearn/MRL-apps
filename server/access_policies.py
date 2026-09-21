"""Authorization policies for resource ownership and role-based access."""

from sqlalchemy import false, or_, true


def owns_group(user, group) -> bool:
    return user.role.name == "admin" or group.created_by == user.id


def owns_badge(user, badge) -> bool:
    return user.role.name == "admin" or badge.created_by == user.id


def owns_activity(user, activity) -> bool:
    return user.role.name == "admin" or activity.created_by == user.id


def owns_activity_task(user, activity_task) -> bool:
    return user.role.name == "admin" or activity_task.created_by == user.id


def activity_read_scope(activity_model, activity_task_model, actor_user_id: int, actor_role: str):
    """Return the SQL scope for activities a teacher may read for analytics."""
    if actor_role == "admin":
        return true()
    if actor_role != "teacher":
        return false()
    return or_(
        activity_model.created_by == actor_user_id,
        activity_task_model.created_by == actor_user_id,
    )


def group_read_scope(group_model, actor_user_id: int, actor_role: str):
    """Return the SQL scope for groups a teacher may read for analytics."""
    if actor_role == "admin":
        return true()
    if actor_role != "teacher":
        return false()
    return group_model.created_by == actor_user_id