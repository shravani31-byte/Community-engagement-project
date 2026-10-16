"""Flask application for the CyberShield AI learning project."""

import logging
import ipaddress
from pathlib import Path
from urllib.parse import urlsplit

import joblib
from flask import Flask, jsonify, render_template, request
from werkzeug.exceptions import RequestEntityTooLarge

from model_settings import SPAM_THRESHOLD


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "spam_classifier.joblib"
VECTORIZER_PATH = BASE_DIR / "models" / "tfidf_vectorizer.joblib"
MAX_MESSAGE_LENGTH = 5000
MAX_URL_LENGTH = 2048
URL_SHORTENERS = {"bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "rb.gy"}

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 24 * 1024
logging.basicConfig(level=logging.INFO)

_model = None
_vectorizer = None


def load_model():
    """Load the locally trained model once, without accepting user-supplied files."""
    global _model, _vectorizer

    if _model is None or _vectorizer is None:
        if not MODEL_PATH.is_file() or not VECTORIZER_PATH.is_file():
            raise FileNotFoundError("Model files are missing. Run train_model.py first.")
        _model = joblib.load(MODEL_PATH)
        _vectorizer = joblib.load(VECTORIZER_PATH)
    return _model, _vectorizer


def safety_guidance(prediction):
    """Return educational guidance for a model prediction, not a safety guarantee."""
    if prediction == "spam":
        return {
            "title": "Treat this message with caution",
            "explanation": (
                "The trained model found patterns often seen in spam. Check for urgent "
                "demands, prize claims, unfamiliar links, requests for codes or bank "
                "details, and unusual payment instructions. These are general checks, "
                "not claims that this message contains each pattern."
            ),
            "tips": [
                "Do not open links, scan QR codes, or reply with personal details.",
                "Check the sender using a contact method you already trust.",
                "Ask a trusted adult before taking action or sending money.",
            ],
        }
    return {
        "title": "This model did not flag the message as spam",
        "explanation": (
            "This model did not find enough of the spam patterns it learned. It is not "
            "trained to detect harassment, threats, grooming, or every kind of scam. "
            "A HAM result does not mean the message or sender is legitimate or safe."
        ),
        "tips": [
            "Never share a password, one-time passcode, or banking details in a message.",
            "Verify unexpected requests through a contact method you already trust.",
            "If the message pressures or frightens you, stop replying and tell a trusted adult.",
        ],
    }


def inspect_url(url):
    """Flag common URL warning signs without connecting to the destination."""
    parsed = urlsplit(url)
    hostname = parsed.hostname
    if parsed.scheme not in {"http", "https"} or not hostname:
        raise ValueError("Enter a complete HTTP or HTTPS link.")

    hostname = hostname.rstrip(".").casefold()
    warnings = []
    if parsed.scheme == "http":
        warnings.append("This link does not use HTTPS, so its connection is not encrypted.")
    if parsed.username is not None or parsed.password is not None:
        warnings.append("The link includes text before the @ symbol that can disguise its real destination.")
    try:
        address = ipaddress.ip_address(hostname)
        if address.is_private or address.is_loopback or address.is_link_local:
            warnings.append("This link points to a private or local network address.")
        else:
            warnings.append("This link uses a numeric IP address instead of a recognizable domain name.")
    except ValueError:
        if "xn--" in hostname:
            warnings.append("The domain uses encoded characters that can resemble other letters.")
        if hostname in URL_SHORTENERS:
            warnings.append("This is a shortened link, so its final destination is hidden.")

    return {
        "host": hostname,
        "warnings": warnings,
        "risk": "caution" if warnings else "no-obvious-warning",
        "disclaimer": (
            "This local check does not visit the link or check its reputation. "
            "No warning signs found does not mean the link is safe."
        ),
    }


@app.after_request
def add_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; script-src 'self'; "
        "img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; "
        "frame-ancestors 'none'"
    )
    if request.path == "/predict":
        response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/")
def home():
    return render_template("index.html")


@app.get("/detector")
def detector():
    return render_template("detector.html")


@app.get("/awareness")
def awareness():
    return render_template("awareness.html")


@app.get("/quiz")
def quiz():
    return render_template("quiz.html")


@app.get("/habits")
def habits():
    return render_template("habits.html")


@app.post("/predict")
def predict():
    if not request.is_json:
        return jsonify(error="Send the message as JSON."), 400

    data = request.get_json(silent=True)
    message = data.get("message") if isinstance(data, dict) else None
    if not isinstance(message, str) or not message.strip():
        return jsonify(error="Enter a message before checking it."), 400
    if len(message) > MAX_MESSAGE_LENGTH:
        return jsonify(error=f"Messages must be {MAX_MESSAGE_LENGTH} characters or fewer."), 400

    try:
        model, vectorizer = load_model()
        features = vectorizer.transform([message.strip()])
        probabilities = model.predict_proba(features)[0]
        spam_index = list(model.classes_).index("spam")
        prediction = "spam" if probabilities[spam_index] >= SPAM_THRESHOLD else "ham"
        if prediction not in {"spam", "ham"}:
            raise ValueError("The trained classifier returned an unknown label.")
        guidance = safety_guidance(prediction)
        return jsonify(
            prediction=prediction,
            **guidance,
            disclaimer="For learning only. Predictions can be wrong; verify with a trusted adult.",
        )
    except FileNotFoundError:
        return jsonify(error="The message checker is not trained yet. Follow the setup steps in README.md."), 503
    except Exception:
        app.logger.exception("Message prediction failed")
        return jsonify(error="The checker could not process that message. Please try again."), 500


@app.post("/check-link")
def check_link():
    if not request.is_json:
        return jsonify(error="Send the link as JSON."), 400

    data = request.get_json(silent=True)
    url = data.get("url") if isinstance(data, dict) else None
    if not isinstance(url, str) or not url.strip():
        return jsonify(error="Enter a link to check."), 400
    url = url.strip()
    if len(url) > MAX_URL_LENGTH:
        return jsonify(error=f"Links must be {MAX_URL_LENGTH} characters or fewer."), 400

    try:
        return jsonify(inspect_url(url))
    except ValueError as error:
        return jsonify(error=str(error)), 400


@app.errorhandler(RequestEntityTooLarge)
def request_too_large(_error):
    if request.path == "/predict":
        return jsonify(error="The request is too large. Use a message under 5,000 characters."), 413
    return "Request too large", 413


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)