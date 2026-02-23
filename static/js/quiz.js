// static/js/quiz.js

let currentRegionId = null;

// --- SHUFFLE FUNCTION ---
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function openQuizModal(regionId) {
  currentRegionId = regionId;

  const modal = document.getElementById("quiz-modal");
  const quizContainer = document.getElementById("quiz-content");

  if (
    typeof checkUnlock === "function" &&
    !checkUnlock(regionId) &&
    typeof isDevMode !== "undefined" &&
    !isDevMode
  ) {
    alert("هذه المنطقة مقفلة!");
    return;
  }

  quizContainer.innerHTML = '<div class="loader">جاري التحميل...</div>';
  modal.style.display = "flex";

  if (typeof globalQuestions === "undefined" || !globalQuestions.length) {
    quizContainer.innerHTML = "<p>خطأ: لم يتم تحميل الأسئلة</p>";
    return;
  }

  const questions = globalQuestions.filter((q) => q.region_id === regionId);
  const shuffled = questions.sort(() => 0.5 - Math.random());
  const quizSet = shuffled.slice(0, 5);

  if (quizSet.length === 0) {
    quizContainer.innerHTML = "<p>لا توجد أسئلة</p>";
    return;
  }

  renderQuiz(quizSet);
}

function renderQuiz(questions) {
  const quizContainer = document.getElementById("quiz-content");
  let html = '<form id="quiz-form">';

  questions.forEach((q, index) => {
    // --- SHUFFLE OPTIONS HERE ---
    // Create a copy to avoid shuffling the original source data
    const shuffledOptions = shuffleArray([...q.options]);

    html += `
            <div class="question-block" id="q-${q.id}">
                <h3>${index + 1}. ${q.question}</h3>
                <div class="options">
                    ${shuffledOptions
                      .map(
                        (opt) => `
                        <label>
                            <input type="radio" name="${q.id}" value="${opt}" required> ${opt}
                        </label>
                    `,
                      )
                      .join("")}
                </div>
            </div>
        `;
  });

  html += `<button type="submit" class="submit-btn">إرسال</button></form>`;
  quizContainer.innerHTML = html;

  document.getElementById("quiz-form").addEventListener("submit", (e) => {
    e.preventDefault();
    submitQuiz(questions);
  });
}

function submitQuiz(questions) {
  const formData = new FormData(document.getElementById("quiz-form"));
  let correctCount = 0;

  questions.forEach((q) => {
    const userAns = formData.get(q.id);
    if (userAns === q.answer) {
      correctCount++;
    }
  });

  if (typeof userProgress !== "undefined" && userProgress[currentRegionId]) {
    userProgress[currentRegionId].mastered += correctCount;
    const total = userProgress[currentRegionId].total;
    if (userProgress[currentRegionId].mastered > total)
      userProgress[currentRegionId].mastered = total;
    if (typeof saveProgress === "function") saveProgress();
  }

  showResults(questions, formData);
}

function showResults(questions, formData) {
  questions.forEach((q) => {
    const block = document.getElementById(`q-${q.id}`);
    const userAns = formData.get(q.id);

    if (userAns === q.answer) {
      block.classList.add("correct");
    } else {
      block.classList.add("incorrect");
      const p = document.createElement("p");
      p.innerText = `الجواب الصحيح: ${q.answer}`;
      block.appendChild(p);
    }
  });

  // Check unlock for NEXT SAHARA REGION
  if (typeof SAHARA_REGIONS !== "undefined") {
    const idx = SAHARA_REGIONS.indexOf(currentRegionId);
    if (idx < SAHARA_REGIONS.length - 1) {
      const nextId = SAHARA_REGIONS[idx + 1];
      if (typeof checkUnlock === "function" && checkUnlock(nextId)) {
        setTimeout(() => alert("مبروك! فتحت منطقة جديدة!"), 500);
      }
    }
  }

  if (typeof updateUI === "function") updateUI();
}
