"""Authorization policies for resource ownership and role-based access."""


def owns_group(user, group) -> bool:
    return user.role.name == "admin" or group.created_by == user.id


def owns_badge(user, badge) -> bool:
    return user.role.name == "admin" or badge.created_by == user.id

def owns_activity_task(user, activity_task) -> bool:
    return user.role.name == "admin" or activity_task.created_by == user.id