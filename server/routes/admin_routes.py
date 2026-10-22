import os
import re
import subprocess
import datetime
import logging

from flask import Blueprint, Response, stream_with_context
from flask_login import login_required

from auth import role_required

logger = logging.getLogger(__name__)

bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@bp.before_request
@login_required
def require_login():
    pass


@bp.route("/db-dump", methods=["GET"])
@role_required("admin")
def download_db_dump():
    database_url = os.environ.get("DATABASE_URL", "")
    if not database_url:
        return {"error": "DATABASE_URL not configured"}, 500

    # Build a libpq-compatible URL (strip psycopg2 driver prefix)
    protocol, rest = database_url.split("://", 1)
    protocol = protocol.replace("+psycopg2", "")
    pg_url = f"{protocol}://{rest}"

    filename = f"db_dump_{datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.sql"

    def generate():
        try:
            proc = subprocess.Popen(
                ["pg_dump", pg_url],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            for chunk in iter(lambda: proc.stdout.read(65536), b""):
                yield chunk
            proc.stdout.close()
            proc.wait()
            if proc.returncode != 0:
                err = proc.stderr.read().decode(errors="replace")
                logger.error("pg_dump failed: %s", err)
        except Exception as exc:
            logger.exception("Error streaming db dump: %s", exc)

    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Content-Type": "application/octet-stream",
    }
    return Response(
        stream_with_context(generate()),
        headers=headers,
        status=200,
    )
