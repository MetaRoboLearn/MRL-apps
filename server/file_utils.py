# file_utils.py
import os
import uuid
from werkzeug.utils import secure_filename

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads', 'badges')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_badge_image(file):
    if not file or not allowed_file(file.filename):
        return None
    ext = file.filename.rsplit('.', 1)[1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)
    return f"/static/uploads/badges/{filename}"

def delete_badge_image(image_url):
    if not image_url:
        return
    # image_url is like "/static/uploads/badges/abc123.png"
    # convert to absolute filesystem path
    relative_path = image_url.lstrip('/')
    filepath = os.path.join(os.path.dirname(os.path.abspath(__file__)), relative_path)
    if os.path.exists(filepath):
        os.remove(filepath)