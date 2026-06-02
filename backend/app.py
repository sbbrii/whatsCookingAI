"""Flask application factory for What'sCooking AI."""

from flask import Flask, jsonify
from flask_cors import CORS

from backend.config import Settings, get_settings


def create_app(settings: Settings | None = None) -> Flask:
    """Create and configure the Flask application."""
    app_settings = settings or get_settings()
    app = Flask(__name__)
    app.config["UPLOAD_FOLDER"] = str(app_settings.upload_folder)
    CORS(app)

    @app.get("/health")
    def health_check() -> tuple[dict[str, str], int]:
        """Return a lightweight health check response."""
        return jsonify({"status": "ok"}), 200

    return app
