from models.activity_task import Type

class TypeRepository:
    def __init__(self, session):
        self.session = session

    def list_all(self):
        return self.session.query(Type).all()

    def get_by_id(self, type_id: int):
        return self.session.query(Type).filter(Type.id == type_id).first()