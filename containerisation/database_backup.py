import subprocess
import re
import os
import datetime
import sys
from pathlib import Path
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
BACKUPS_DIR = BASE_DIR / "backups"


def delete_old_backups(months=6):
    cutoff = datetime.datetime.now() - datetime.timedelta(days=months * 30)
    removed_count = 0

    if not BACKUPS_DIR.exists():
        return removed_count

    for backup_file in BACKUPS_DIR.rglob("*.sql"):
        if not backup_file.is_file():
            continue

        modified_at = datetime.datetime.fromtimestamp(backup_file.stat().st_mtime)
        if modified_at < cutoff:
            backup_file.unlink(missing_ok=True)
            removed_count += 1

    return removed_count

def backup_database():
    load_dotenv(BASE_DIR / ".env")
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not found in .env file")
        return 1

    protocol, rest = database_url.split("://", 1)
    protocol = protocol.replace("postgresql+psycopg2", "postgresql")
    rest = re.sub(r'@\d{1,3}(?:\.\d{1,3}){3}', '@localhost', rest)
    modified_database_url = f"{protocol}://{rest}"
    
    now = datetime.datetime.now()
    backup_file = BACKUPS_DIR / f"{now.year}/{now.month:02d}/{now.day:02d}/{now.strftime('%H%M%S')}.sql"
    backup_file.parent.mkdir(parents=True, exist_ok=True)

    try:
        subprocess.run(["pg_dump", modified_database_url, "-f", str(backup_file)], check=True)
        print(f"Database backup created successfully at {backup_file}")

        removed_count = delete_old_backups(months=6)
        print(f"Old backups deleted: {removed_count}")
        return 0
    except subprocess.CalledProcessError as e:
        print(f"Error creating database backup: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(backup_database())

