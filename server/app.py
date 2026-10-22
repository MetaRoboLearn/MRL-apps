import os
import logging

from dotenv import load_dotenv
load_dotenv()  # loads .env when running outside Docker

# static folder creation
import os

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads', 'badges')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ── Logging setup ────────────────────────────────────────────────────────────
log_level = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=log_level,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)
logger.info("Starting MetaRoboLearn server (log level: %s)", log_level)

from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix
from database import init_db
from auth import init_auth
from routes import user_routes, task_routes, activity_routes, activity_task_routes, user_started_task_routes, \
    user_task_log_routes, type_routes, broker_routes, auth_routes, sandbox_routes, user_activity_task_routes, \
    badge_routes, user_badge_routes, sticker_routes, admin_routes
import models

app = Flask(__name__, static_folder='static')
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ['DATABASE_URL']
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "")

if not app.secret_key:
    logger.warning("FLASK_SECRET_KEY is not set – sessions will not survive restarts")

app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_PATH="/",
    REMEMBER_COOKIE_HTTPONLY=True,
    REMEMBER_COOKIE_SAMESITE="Lax",
)

init_db(app)
logger.info("Blueprints registering ...")
init_auth(app)

CORS(app,
     origins=[os.environ.get("CORS_ORIGIN", "https://localhost")],
     methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type"],
     supports_credentials=True)

app.register_blueprint(auth_routes.bp)
app.register_blueprint(user_routes.bp)
app.register_blueprint(task_routes.bp)
app.register_blueprint(badge_routes.bp)
app.register_blueprint(activity_routes.bp)
app.register_blueprint(activity_task_routes.bp)
app.register_blueprint(user_started_task_routes.bp)
app.register_blueprint(user_task_log_routes.bp)
app.register_blueprint(user_activity_task_routes.bp)
app.register_blueprint(user_badge_routes.bp)
app.register_blueprint(type_routes.bp)
app.register_blueprint(sandbox_routes.bp)
app.register_blueprint(broker_routes.bp)
app.register_blueprint(sticker_routes.bp)
app.register_blueprint(admin_routes.bp)
broker_routes.init_broker_websocket(app)

logger.info("All blueprints registered")

@app.route('/health', methods=['GET'])
def health():
    """Liveness + DB connectivity check."""
    import database
    from sqlalchemy import text
    db_status = "ok"
    db_error = None
    try:
        with database.engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        db_status = "error"
        db_error = str(exc)
        logger.error("Health check: DB unreachable – %s", exc)

    status_code = 200 if db_status == "ok" else 503
    return jsonify({"status": "ok" if db_status == "ok" else "degraded", "db": db_status, "db_error": db_error}), status_code

@app.route('/execute', methods=['POST'])
def execute():
    return jsonify({"status": "ok"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)