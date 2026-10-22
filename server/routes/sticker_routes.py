import os
import re

from flask import Blueprint, jsonify, send_from_directory
from flask_login import login_required

bp = Blueprint('stickers', __name__, url_prefix='/api/stickers')

STICKERS_DIR = os.path.join(os.path.dirname(__file__), '..', 'static', 'stickers')

# Only allow safe names: letters, digits, underscores, hyphens, dots (no slashes, no ..)
_SAFE_NAME = re.compile(r'^[\w\-. ]+$')


def _safe(name: str) -> bool:
    return bool(_SAFE_NAME.match(name)) and '..' not in name


@bp.get('/packs')
@login_required
def get_packs():
    """Return all available sticker packs with sticker count."""
    if not os.path.isdir(STICKERS_DIR):
        return jsonify([])

    packs = []
    for pack_name in sorted(os.listdir(STICKERS_DIR)):
        pack_path = os.path.join(STICKERS_DIR, pack_name)
        if os.path.isdir(pack_path):
            count = sum(1 for f in os.listdir(pack_path) if f.lower().endswith('.webp'))
            packs.append({'name': pack_name, 'count': count})

    return jsonify(packs)


@bp.get('/pack/<pack_name>')
@login_required
def get_pack_stickers(pack_name: str):
    """Return sticker metadata for a single pack."""
    if not _safe(pack_name):
        return jsonify({'error': 'Invalid pack name'}), 400

    pack_path = os.path.join(STICKERS_DIR, pack_name)
    if not os.path.isdir(pack_path):
        return jsonify({'error': 'Pack not found'}), 404

    stickers = []
    for filename in sorted(os.listdir(pack_path)):
        if filename.lower().endswith('.webp'):
            stem = filename[:-5]                         # strip .webp
            key = f'{pack_name}/{stem}'
            display = stem.replace('_', ' ').replace('-', ' ')
            stickers.append({
                'key': key,
                'name': display,
                'url': f'/api/stickers/image/{pack_name}/{filename}',
            })

    return jsonify(stickers)


@bp.get('/image/<pack_name>/<filename>')
def get_sticker_image(pack_name: str, filename: str):
    """Serve a sticker image file (publicly accessible – URLs embed in 3-D scenes)."""
    if not _safe(pack_name) or not _safe(filename):
        return jsonify({'error': 'Invalid path'}), 400

    pack_path = os.path.realpath(os.path.join(STICKERS_DIR, pack_name))
    stickers_root = os.path.realpath(STICKERS_DIR)
    if not pack_path.startswith(stickers_root):
        return jsonify({'error': 'Invalid path'}), 400

    return send_from_directory(pack_path, filename)
