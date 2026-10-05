from sqlalchemy.orm import Session, joinedload

from models.programming_element import ProgrammingElement


class ProgrammingElementRepository:
    def __init__(self, session: Session):
        self.session = session

    def list_all(self) -> list[ProgrammingElement]:
        return (
            self.session.query(ProgrammingElement)
            .options(joinedload(ProgrammingElement.element_type))
            .order_by(ProgrammingElement.name.asc())
            .all()
        )

    def get_by_ids(self, element_ids: list[str]) -> list[ProgrammingElement]:
        if not element_ids:
            return []
        return (
            self.session.query(ProgrammingElement)
            .filter(ProgrammingElement.id.in_(element_ids))
            .all()
        )