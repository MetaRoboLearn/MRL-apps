import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, scoped_session, Session
from contextlib import contextmanager
from seed import seed_roles, seed_types, seed_event_types
from models.base import Base
from flask_migrate import Migrate

logger = logging.getLogger(__name__)

migrate = Migrate()

engine = None
SessionLocal = None

def init_db(app=None):
    """Initialize database with Flask app or standalone"""
    global engine, SessionLocal

    if app:
        db_uri = app.config['SQLALCHEMY_DATABASE_URI']
    else:
        db_uri = os.environ['DATABASE_URL']

    # Log the host/db without exposing the password
    safe_uri = db_uri.split('@')[-1] if '@' in db_uri else db_uri
    logger.info("Connecting to database: %s", safe_uri)

    sql_echo = os.environ.get("SQL_ECHO", "false").lower() == "true"
    engine = create_engine(
        db_uri,
        echo=sql_echo,
        pool_pre_ping=True,
        pool_recycle=3600,  # Recycle connections after 1 hour
        pool_size=10,  # Connection pool size
        max_overflow=20,  # Max connections beyond pool_size
        connect_args={
            "connect_timeout": 10,  # Connection timeout in seconds
            "options": "-c statement_timeout=30000"  # Query timeout: 30 seconds
        }
    )
    SessionLocal = scoped_session(sessionmaker(bind=engine, expire_on_commit=False))

    # Verify the connection is actually reachable before continuing
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database connection successful")
    except Exception as exc:
        logger.critical("Database connection FAILED: %s", exc)
        raise

    try:
        logger.info("Running schema create_all ...")
        Base.metadata.create_all(engine)
        logger.info("Schema ready")
    except Exception as exc:
        logger.error("Schema creation failed: %s", exc)
        raise

    try:
        logger.info("Seeding reference data ...")
        with Session(engine) as session:
            seed_roles(session)
            seed_types(session)
            seed_event_types(session)
        logger.info("Seeding complete")
    except Exception as exc:
        logger.error("Seeding failed: %s", exc)
        raise

    migrate.init_app(app, db=engine)
    logger.info("Database initialisation complete")


def get_db():
    """Get database session (use with context manager)"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@contextmanager
def db_session():
    """Context manager for database sessions"""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()