from sqlalchemy.orm import Session

from models.activity_task_programming_element import ActivityTaskProgrammingElement


class ActivityTaskProgrammingElementRepository:
    def __init__(self, session: Session):
        self.session = session

    def list_ids(self, activity_task_id: int) -> list[str]:
        return [
            element_id
            for (element_id,) in self.session.query(
                ActivityTaskProgrammingElement.programming_element_id
            )
            .filter(ActivityTaskProgrammingElement.activity_task_id == activity_task_id)
            .order_by(ActivityTaskProgrammingElement.position.asc())
            .all()
        ]

    def replace_for_activity_task(
        self,
        activity_task_id: int,
        programming_element_ids: list[str],
        *,
        commit: bool = True,
    ) -> None:
        requested_ids = list(programming_element_ids)
        requested_set = set(requested_ids)
        current_rows = (
            self.session.query(ActivityTaskProgrammingElement)
            .filter(ActivityTaskProgrammingElement.activity_task_id == activity_task_id)
            .all()
        )
        current_by_id = {row.programming_element_id: row for row in current_rows}
        current_ids = set(current_by_id)

        for removed_id in current_ids - requested_set:
            self.session.delete(current_by_id[removed_id])
        self.session.flush()

        retained_rows = [current_by_id[element_id] for element_id in current_ids & requested_set]
        next_temporary_position = max(
            (row.position for row in current_rows),
            default=0,
        ) + len(requested_ids) + 1
        for offset, row in enumerate(retained_rows):
            row.position = next_temporary_position + offset
        self.session.flush()

        for position, element_id in enumerate(requested_ids, start=1):
            existing_row = current_by_id.get(element_id)
            if existing_row is None:
                self.session.add(ActivityTaskProgrammingElement(
                    activity_task_id=activity_task_id,
                    programming_element_id=element_id,
                    position=position,
                ))
            else:
                existing_row.position = position

        self.session.flush()
        if commit:
            self.session.commit()