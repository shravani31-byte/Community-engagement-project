const messageInput = document.querySelector("#message-input");
const charCount = document.querySelector("#char-count");
const predictButton = document.querySelector("#predict-button");
const clearButton = document.querySelector("#clear-button");
const loadingState = document.querySelector("#loading-state");
const resultPanel = document.querySelector("#result");

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

messageInput.addEventListener("input", updateCharacterCount);
predictButton.addEventListener("click", predictMessage);
clearButton.addEventListener("click", () => {
  messageInput.value = "";
  updateCharacterCount();
  resultPanel.hidden = true;
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