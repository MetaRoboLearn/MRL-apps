from models.activity_task import Type

class TypeRepository:
    def __init__(self, session):
        self.session = session

    def list_all(self):
        return self.session.query(Type).all()