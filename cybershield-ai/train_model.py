"""Download, evaluate, and save the SMS spam classification model."""

import argparse
import csv
import io
import urllib.request
import zipfile
from pathlib import Path

import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, confusion_matrix, precision_score, recall_score, f1_score
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB

from model_settings import SPAM_THRESHOLD


BASE_DIR = Path(__file__).resolve().parent
DATASET_DIR = BASE_DIR / "dataset"
DATASET_PATH = DATASET_DIR / "SMSSpamCollection"
DATASET_URL = "https://archive.ics.uci.edu/static/public/228/sms+spam+collection.zip"
RANDOM_SEED = 42


def download_dataset(destination=DATASET_PATH):
    """Download the public UCI dataset and extract only its data file."""
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    print("Downloading the UCI SMS Spam Collection dataset...")
    with urllib.request.urlopen(DATASET_URL, timeout=30) as response:
        archive_data = response.read()
    with zipfile.ZipFile(io.BytesIO(archive_data)) as archive:
        member = next((name for name in archive.namelist() if Path(name).name == "SMSSpamCollection"), None)
        if member is None:
            raise ValueError("The downloaded archive does not contain SMSSpamCollection.")
        destination.write_bytes(archive.read(member))
    return destination


def load_messages(dataset_path):
    """Read tab-separated labels and messages, dropping invalid rows."""
    messages = []
    labels = []
    with Path(dataset_path).open("r", encoding="utf-8", errors="replace", newline="") as dataset:
        for row in csv.reader(dataset, delimiter="\t", quoting=csv.QUOTE_NONE):
            if len(row) < 2:
                continue
            label = row[0].strip().lower()
            message = "\t".join(row[1:]).strip()
            if label in {"spam", "ham"} and message:
                labels.append(label)
                messages.append(message)
    if len(messages) < 10 or len(set(labels)) < 2:
        raise ValueError("The dataset needs at least 10 valid messages containing both spam and ham labels.")
    return messages, labels


def train_and_evaluate(dataset_path=DATASET_PATH):
    """Train TF-IDF plus Multinomial Naive Bayes and print held-out metrics."""
    messages, labels = load_messages(dataset_path)
    train_text, test_text, train_labels, test_labels = train_test_split(
        messages,
        labels,
        test_size=0.2,
        random_state=RANDOM_SEED,
        stratify=labels,
    )

    vectorizer = TfidfVectorizer(
        lowercase=True,
        strip_accents="unicode",
        ngram_range=(1, 2),
        sublinear_tf=True,
    )
    train_features = vectorizer.fit_transform(train_text)
    test_features = vectorizer.transform(test_text)
    classifier = MultinomialNB(alpha=0.5)
    classifier.fit(train_features, train_labels)
    spam_index = list(classifier.classes_).index("spam")
    spam_probabilities = classifier.predict_proba(test_features)[:, spam_index]
    predictions = ["spam" if probability >= SPAM_THRESHOLD else "ham" for probability in spam_probabilities]

    print(f"Valid messages: {len(messages)} (train: {len(train_text)}, test: {len(test_text)})")
    print(f"Spam probability threshold: {SPAM_THRESHOLD:.2f}")
    print(f"Accuracy:  {accuracy_score(test_labels, predictions):.4f}")
    print(f"Precision (spam): {precision_score(test_labels, predictions, pos_label='spam', zero_division=0):.4f}")
    print(f"Recall (spam):    {recall_score(test_labels, predictions, pos_label='spam', zero_division=0):.4f}")
    print(f"F1-score (spam):  {f1_score(test_labels, predictions, pos_label='spam', zero_division=0):.4f}")
    print("Confusion matrix (rows=true, columns=predicted; order: spam, ham):")
    print(confusion_matrix(test_labels, predictions, labels=["spam", "ham"]))

    models_dir = BASE_DIR / "models"
    models_dir.mkdir(exist_ok=True)
    joblib.dump(classifier, models_dir / "spam_classifier.joblib")
    joblib.dump(vectorizer, models_dir / "tfidf_vectorizer.joblib")
    print(f"Saved classifier and vectorizer in {models_dir}.")
    return classifier, vectorizer


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dataset",
        type=Path,
        default=DATASET_PATH,
        help="Path to the extracted UCI SMSSpamCollection file (downloaded when missing).",
    )
    args = parser.parse_args()
    dataset_path = args.dataset
    if not dataset_path.is_file():
        if dataset_path != DATASET_PATH:
            parser.error(f"Dataset file not found: {dataset_path}")
        dataset_path = download_dataset(dataset_path)
    train_and_evaluate(dataset_path)


if __name__ == "__main__":
    main()