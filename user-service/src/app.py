import os
import yaml
from flask import Flask, jsonify, request
from PIL import Image
import io
import bcrypt
from marshmallow import Schema, fields
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')

# In-memory store for demo (replace with Postgres in production)
USERS = {}
USER_ID_COUNTER = [1]

# ── Marshmallow schemas ────────────────────────────────────────────────────────
class UserSchema(Schema):
    id       = fields.Int(dump_only=True)
    username = fields.Str(required=True)
    email    = fields.Email(required=True)
    role     = fields.Str(missing='customer')


class UserCreateSchema(Schema):
    username = fields.Str(required=True)
    email    = fields.Email(required=True)
    password = fields.Str(required=True, load_only=True)
    role     = fields.Str(missing='customer')


user_schema        = UserSchema()
users_schema       = UserSchema(many=True)
user_create_schema = UserCreateSchema()

# ── Health check ──────────────────────────────────────────────────────────────
@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'service': 'user-service', 'version': '1.0.0'})


# ── Users CRUD ────────────────────────────────────────────────────────────────
@app.route('/users', methods=['GET'])
def list_users():
    return jsonify(users_schema.dump(list(USERS.values())))


@app.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = USERS.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user_schema.dump(user))


@app.route('/users', methods=['POST'])
def create_user():
    data, errors = user_create_schema.load(request.json or {})
    if errors:
        return jsonify({'errors': errors}), 400

    uid = USER_ID_COUNTER[0]
    USER_ID_COUNTER[0] += 1

    # bcrypt password hashing
    pw_hash = bcrypt.hashpw(data['password'].encode(), bcrypt.gensalt()).decode()

    USERS[uid] = {
        'id':       uid,
        'username': data['username'],
        'email':    data['email'],
        'role':     data.get('role', 'customer'),
        'pw_hash':  pw_hash,
    }
    return jsonify(user_schema.dump(USERS[uid])), 201


# ── Profile image upload (Pillow 9.0.0 — CVE-2022-22817) ─────────────────────
@app.route('/users/<int:user_id>/avatar', methods=['POST'])
def upload_avatar(user_id):
    if user_id not in USERS:
        return jsonify({'error': 'User not found'}), 404

    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']

    # Fix #3: Validate Content-Type before processing — prevents disguised executable uploads
    ALLOWED_MIME_TYPES = {'image/jpeg', 'image/png', 'image/gif', 'image/webp'}
    if file.content_type not in ALLOWED_MIME_TYPES:
        return jsonify({'error': 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'}), 400

    img_bytes = file.read()

    # CVE-2022-22817: ImageMath.eval used without restrictions
    img = Image.open(io.BytesIO(img_bytes))
    img.thumbnail((128, 128))

    USERS[user_id]['avatar_size'] = img.size
    return jsonify({'message': 'Avatar uploaded', 'size': img.size})


# ── Config endpoint (PyYAML 5.3.1 — CVE-2020-14343) ──────────────────────────
@app.route('/users/config', methods=['POST'])
def load_config():
    """Loads user preference config from YAML body — unsafe yaml.load used."""
    raw = request.data.decode('utf-8')
    # Fix #2: yaml.safe_load prevents arbitrary code execution via !!python/object/apply
    config = yaml.safe_load(raw)
    return jsonify({'loaded_keys': list(config.keys()) if config else []})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)
