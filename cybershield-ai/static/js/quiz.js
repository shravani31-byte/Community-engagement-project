const questions = [
  { category: "PHISHING", question: "A message says your account will close in 10 minutes unless you sign in using its link. What should you do?", options: ["Tap quickly before time runs out", "Open the official site yourself or ask a trusted adult", "Reply with your password to confirm", "Forward it to all your friends"], answer: 1, explanation: "Urgency and a sign-in link are common phishing tactics. Visit a known official address instead of using the message link." },
  { category: "SUSPICIOUS LINKS", question: "A stranger sends a shortened link promising free game items. What is safest?", options: ["Open it in private browsing", "Ask them to send a different link", "Don't open it; check with a trusted adult", "Enter a spare password"], answer: 2, explanation: "A shortened link hides its destination. Unexpected free offers can lead to fake sign-in pages or harmful downloads." },
  { category: "ONE-TIME CODES", question: "Someone claiming to be tech support asks you to read them a one-time passcode. What should you do?", options: ["Share it if they know your name", "Never share it; contact support through an official channel", "Send only the first three digits", "Post it in a group chat"], answer: 1, explanation: "A one-time code can let someone access your account. Legitimate support should not ask you to reveal it." },
  { category: "PASSWORDS", question: "Which password habit protects your accounts best?", options: ["Use one short password everywhere", "Use a unique, hard-to-guess passphrase for each account", "Use your birthday so you remember it", "Share it with a friend for safekeeping"], answer: 1, explanation: "Unique passphrases limit the damage if one account is exposed. A password manager can help you keep track with adult guidance." },
  { category: "PRIVACY", question: "A new online friend asks which route you take home from school. What is a good response?", options: ["Tell them so they can meet you", "Share the route only in a private message", "Keep location details private and tell a trusted adult", "Post a map instead"], answer: 2, explanation: "Your routine and location are personal information. Keep them private, especially with people you only know online." },
  { category: "RESPONSIBLE SHARING", question: "A group chat asks you to repost an embarrassing photo of a classmate. What is the responsible choice?", options: ["Repost it with a funny caption", "Don't share it; support the classmate and ask an adult for help", "Send it to a different group", "Add their name so they see it"], answer: 1, explanation: "Sharing can spread harm. Respect others' privacy, avoid amplifying the image, and get help if someone is being bullied." },
  { category: "PRIZES & SCAMS", question: "You receive a message saying you won a contest you never entered, but must pay a fee to claim the prize. What does that suggest?", options: ["It's a normal prize process", "It may be a scam; don't pay and verify independently", "Pay only with a gift card", "Send your bank login to confirm"], answer: 1, explanation: "Unexpected prizes and upfront fees are warning signs. Real organizations won't need your password or one-time code." },
  { category: "QR CODES", question: "There is an unfamiliar QR code taped over a café's payment sign. What should you do?", options: ["Scan and pay straight away", "Use a payment method you can verify with staff", "Scan it using a stranger's phone", "Enter your card details to see where it goes"], answer: 1, explanation: "A replaced QR code may lead to a scammer's page. Confirm the payment destination with staff and use a trusted method." },
  { category: "DIGITAL FOOTPRINT", question: "Before posting a photo, what is worth checking?", options: ["Whether it shows your address, school badge, or someone else's private details", "Whether it has enough likes already", "Whether everyone else has posted it", "Whether the location tag is precise"], answer: 0, explanation: "Photos can reveal identifying details and may be shared beyond your intended audience. Check privacy and ask permission." },
  { category: "ASKING FOR HELP", question: "A message makes you uncomfortable, but you're worried you might get in trouble. What should you do?", options: ["Delete it and keep it secret", "Reply to find out what they want", "Stop replying and show it to a trusted adult", "Share it publicly to get opinions"], answer: 2, explanation: "You deserve support. Stop engaging and speak with a trusted adult who can help you decide what to do next." },
];

let currentQuestion = 0;
let score = 0;
let answered = false;

const questionCounter = document.querySelector("#question-counter");
const scoreDisplay = document.querySelector("#score-display");
const progressFill = document.querySelector("#progress-fill");
const questionCategory = document.querySelector("#question-category");
const questionText = document.querySelector("#question-text");
const answerList = document.querySelector("#answer-list");
const feedback = document.querySelector("#quiz-feedback");
const nextButton = document.querySelector("#next-button");
const questionArea = document.querySelector("#question-area");
const result = document.querySelector("#quiz-result");

function renderQuestion() {
  const item = questions[currentQuestion];
  answered = false;
  questionCounter.textContent = `Question ${currentQuestion + 1} of ${questions.length}`;
  scoreDisplay.innerHTML = `Score <strong>${score}</strong>`;
  progressFill.value = currentQuestion;
  questionCategory.textContent = item.category;
  questionText.textContent = item.question;
  feedback.hidden = true;
  feedback.replaceChildren();
  nextButton.disabled = true;
  nextButton.innerHTML = currentQuestion === questions.length - 1 ? "See my results <span aria-hidden='true'>→</span>" : "Next question <span aria-hidden='true'>→</span>";
  answerList.replaceChildren();

  item.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.className = "answer-option";
    button.type = "button";
    button.innerHTML = `<span class="answer-letter">${String.fromCharCode(65 + index)}</span><span class="answer-copy"></span>`;
    button.querySelector(".answer-copy").textContent = option;
    button.addEventListener("click", () => chooseAnswer(index));
    answerList.append(button);
  });
}

function chooseAnswer(selectedIndex) {
  if (answered) return;
  answered = true;
  const item = questions[currentQuestion];
  const correct = selectedIndex === item.answer;
  if (correct) score += 1;
  [...answerList.children].forEach((button, index) => {
    button.disabled = true;
    if (index === item.answer) button.classList.add("answer-correct");
    else if (index === selectedIndex) button.classList.add("answer-incorrect");
  });
  scoreDisplay.innerHTML = `Score <strong>${score}</strong>`;
  feedback.className = `quiz-feedback ${correct ? "feedback-correct" : "feedback-incorrect"}`;
  const heading = document.createElement("strong");
  heading.textContent = correct ? "That's right." : "Not quite.";
  const detail = document.createElement("p");
  detail.textContent = item.explanation;
  feedback.replaceChildren(heading, detail);
  feedback.hidden = false;
  nextButton.disabled = false;
  document.querySelector("#answer-hint").textContent = correct ? "Good call. Ready for the next one?" : "Every answer is a chance to learn.";
}

function finishQuiz() {
  const percentage = Math.round((score / questions.length) * 100);
  const recommendation = percentage >= 80
    ? "Strong awareness. Keep pausing to verify unexpected messages, and share these habits with people you trust."
    : percentage >= 50
      ? "Good start. Review the safety topics that felt tricky, then try the quiz again to reinforce them."
      : "A little more practice will help. Explore the Cyber Safety guide and ask a trusted adult about anything confusing.";
  questionArea.hidden = true;
  result.hidden = false;
  progressFill.value = questions.length;
  questionCounter.textContent = "Quiz complete";
  result.innerHTML = "";
  const label = document.createElement("p");
  label.className = "eyebrow";
  label.textContent = "YOUR CHECK-IN";
  const heading = document.createElement("h2");
  heading.textContent = `${score} out of ${questions.length}`;
  const percent = document.createElement("p");
  percent.className = "quiz-percentage";
  percent.textContent = `${percentage}%`;
  const advice = document.createElement("p");
  advice.textContent = recommendation;
  const restart = document.createElement("button");
  restart.className = "button button-primary";
  restart.type = "button";
  restart.textContent = "Restart quiz";
  restart.addEventListener("click", restartQuiz);
  result.append(label, heading, percent, advice, restart);
}

function restartQuiz() {
  currentQuestion = 0;
  score = 0;
  questionArea.hidden = false;
  result.hidden = true;
  document.querySelector("#answer-hint").textContent = "Choose one answer to continue.";
  renderQuestion();
}

nextButton.addEventListener("click", () => {
  if (!answered) return;
  if (currentQuestion === questions.length - 1) finishQuiz();
  else {
    currentQuestion += 1;
    document.querySelector("#answer-hint").textContent = "Choose one answer to continue.";
    renderQuestion();
  }
});

renderQuestion();