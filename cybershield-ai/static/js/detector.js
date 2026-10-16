const messageInput = document.querySelector("#message-input");
const charCount = document.querySelector("#char-count");
const predictButton = document.querySelector("#predict-button");
const clearButton = document.querySelector("#clear-button");
const loadingState = document.querySelector("#loading-state");
const resultPanel = document.querySelector("#result");
const linkInput = document.querySelector("#link-input");
const checkLinkButton = document.querySelector("#check-link-button");
const qrInput = document.querySelector("#qr-input");
const linkStatus = document.querySelector("#link-status");
const linkResult = document.querySelector("#link-result");

function updateCharacterCount() {
  charCount.textContent = `${messageInput.value.length.toLocaleString()} / 5,000`;
}

function showError(message) {
  resultPanel.hidden = false;
  resultPanel.className = "result-panel result-error";
  document.querySelector("#result-symbol").textContent = "!";
  document.querySelector("#result-label").textContent = "CHECK NOT COMPLETED";
  document.querySelector("#result-title").textContent = "Let's try that again.";
  document.querySelector("#result-explanation").textContent = message;
  document.querySelector("#result-tips").replaceChildren();
  document.querySelector("#result-disclaimer").textContent = "Your message is not saved by this project.";
}

function showPrediction(data) {
  const isSpam = data.prediction === "spam";
  resultPanel.hidden = false;
  resultPanel.className = `result-panel ${isSpam ? "result-spam" : "result-ham"}`;
  document.querySelector("#result-symbol").textContent = isSpam ? "!" : "✓";
  document.querySelector("#result-label").textContent = isSpam
    ? "MODEL RESULT · SPAM · POSSIBLY ILLEGITIMATE"
    : "MODEL RESULT · HAM · NOT FLAGGED AS SPAM";
  document.querySelector("#result-title").textContent = data.title;
  document.querySelector("#result-explanation").textContent = data.explanation;
  document.querySelector("#result-disclaimer").textContent = data.disclaimer;

  const tips = document.querySelector("#result-tips");
  tips.replaceChildren();
  for (const tip of data.tips) {
    const item = document.createElement("li");
    item.textContent = tip;
    tips.append(item);
  }
}

async function predictMessage() {
  const message = messageInput.value.trim();
  if (!message) {
    showError("Enter a message first, or choose one of the examples below.");
    messageInput.focus();
    return;
  }

  resultPanel.hidden = true;
  loadingState.hidden = false;
  predictButton.disabled = true;
  try {
    const response = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "The checker could not complete the request.");
    showPrediction(data);
  } catch (error) {
    showError(error instanceof TypeError ? "The server could not be reached. Check that CyberShield AI is running and try again." : error.message);
  } finally {
    loadingState.hidden = true;
    predictButton.disabled = false;
  }
}

function showLinkStatus(message) {
  linkStatus.textContent = message;
  linkStatus.hidden = false;
}

function showLinkResult(data) {
  linkResult.hidden = false;
  linkResult.className = `link-result ${data.risk === "caution" ? "link-caution" : "link-clear"}`;
  document.querySelector("#link-result-title").textContent = data.risk === "caution"
    ? "Warning signs found"
    : "No obvious warning signs found";
  document.querySelector("#link-result-host").textContent = `Destination domain: ${data.host}`;
  const warnings = document.querySelector("#link-result-warnings");
  warnings.replaceChildren();
  for (const warning of data.warnings) {
    const item = document.createElement("li");
    item.textContent = warning;
    warnings.append(item);
  }
  document.querySelector("#link-result-disclaimer").textContent = data.disclaimer;
}

async function checkLink() {
  const url = linkInput.value.trim();
  if (!url) {
    showLinkStatus("Enter a complete web address to check.");
    linkInput.focus();
    return;
  }

  linkStatus.hidden = true;
  linkResult.hidden = true;
  checkLinkButton.disabled = true;
  showLinkStatus("Checking locally…");
  try {
    const response = await fetch("/check-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "The link could not be checked.");
    linkStatus.hidden = true;
    showLinkResult(data);
  } catch (error) {
    showLinkStatus(error instanceof TypeError
      ? "The server could not be reached. Check that CyberShield AI is running and try again."
      : error.message);
  } finally {
    checkLinkButton.disabled = false;
  }
}

async function decodeQrImage(file) {
  linkResult.hidden = true;
  if (!file || file.size > 5 * 1024 * 1024) {
    showLinkStatus("Choose an image smaller than 5 MB.");
    return;
  }

  showLinkStatus("Reading the QR image on this device…");
  try {
    const image = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.close();
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = window.jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: "attemptBoth" });
    const value = code?.data;
    if (!value) {
      showLinkStatus("No readable QR code was found in that image.");
    } else if (!/^https?:\/\//i.test(value)) {
      showLinkStatus("The QR code does not contain a web link. Its contents were not displayed or sent.");
    } else {
      linkInput.value = value;
      showLinkStatus("QR link read on this device. Checking its warning signs now; the destination will not be opened.");
      await checkLink();
    }
  } catch {
    showLinkStatus("Could not read that image. Try a clear PNG, JPEG, or WebP QR image.");
  }
}

messageInput.addEventListener("input", updateCharacterCount);
predictButton.addEventListener("click", predictMessage);
checkLinkButton.addEventListener("click", checkLink);
linkInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") checkLink();
});
qrInput.addEventListener("change", () => decodeQrImage(qrInput.files[0]));
clearButton.addEventListener("click", () => {
  messageInput.value = "";
  updateCharacterCount();
  resultPanel.hidden = true;
  linkInput.value = "";
  qrInput.value = "";
  linkStatus.hidden = true;
  linkResult.hidden = true;
  messageInput.focus();
});
messageInput.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") predictMessage();
});
document.querySelectorAll(".example-button").forEach((button) => {
  button.addEventListener("click", () => {
    messageInput.value = button.dataset.message;
    updateCharacterCount();
    resultPanel.hidden = true;
    messageInput.focus();
  });
});