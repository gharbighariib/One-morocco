// static/js/quiz.js

let currentRegionId = null;

// --- 1. TRANSLATIONS ---
const quizTranslations = {
  ar: {
    loading: "جاري التحميل...",
    error_load: "خطأ: لم يتم تحميل الأسئلة",
    error_empty: "لا توجد أسئلة",
    locked: "هذه المنطقة مقفلة!",
    submit: "إرسال",
    correct_label: "الجواب الصحيح",
    congrats: "مبروك! فتحت منطقة جديدة!",
  },
  en: {
    loading: "Loading...",
    error_load: "Error: Questions not loaded",
    error_empty: "No questions available",
    locked: "This region is locked!",
    submit: "Submit",
    correct_label: "Correct Answer",
    congrats: "Congratulations! New region unlocked!",
  },
};

function getLabel(key) {
  return quizTranslations[currentLang][key];
}

// --- 2. SHUFFLE FUNCTION ---
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// --- 3. QUIZ FLOW ---

function openQuizModal(regionId) {
  currentRegionId = regionId;

  const modal = document.getElementById("quiz-modal");
  const quizContainer = document.getElementById("quiz-content");

  // Check Lock Status
  if (
    typeof checkUnlock === "function" &&
    !checkUnlock(regionId) &&
    typeof isDevMode !== "undefined" &&
    !isDevMode
  ) {
    alert(getLabel("locked"));
    return;
  }

  quizContainer.innerHTML = `<div class="loader">${getLabel("loading")}</div>`;
  modal.style.display = "flex";

  // Check Data
  if (typeof globalQuestions === "undefined" || !globalQuestions.length) {
    quizContainer.innerHTML = `<p>${getLabel("error_load")}</p>`;
    return;
  }

  // Filter Questions for this Region
  const questions = globalQuestions.filter((q) => q.region_id === regionId);
  const shuffled = questions.sort(() => 0.5 - Math.random());
  const quizSet = shuffled.slice(0, 5);

  if (quizSet.length === 0) {
    quizContainer.innerHTML = `<p>${getLabel("error_empty")}</p>`;
    return;
  }

  renderQuiz(quizSet);
}

function renderQuiz(questions) {
  const quizContainer = document.getElementById("quiz-content");
  let html = '<form id="quiz-form">';

  questions.forEach((q, index) => {
    // --- LANGUAGE LOGIC ---
    // 1. Select Question Text
    const questionText =
      currentLang === "en" && q.question_en ? q.question_en : q.question;

    // 2. Select Options Array
    let optionsToUse =
      currentLang === "en" && q.options_en ? q.options_en : q.options;

    // 3. Shuffle Options
    const shuffledOptions = shuffleArray([...optionsToUse]);

    html += `
            <div class="question-block" id="q-${q.id}">
                <h3>${index + 1}. ${questionText}</h3>
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

  html += `<button type="submit" class="submit-btn">${getLabel("submit")}</button></form>`;
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

    // --- VALIDATION LOGIC ---
    // Determine correct answer text based on current language
    const correctAns =
      currentLang === "en" && q.answer_en ? q.answer_en : q.answer;

    if (userAns === correctAns) {
      correctCount++;
    }
  });

  // Update Progress
  if (typeof userProgress !== "undefined" && userProgress[currentRegionId]) {
    userProgress[currentRegionId].mastered += correctCount;
    const total = userProgress[currentRegionId].total;
    if (userProgress[currentRegionId].mastered > total) {
      userProgress[currentRegionId].mastered = total;
    }
    if (typeof saveProgress === "function") saveProgress();
  }

  showResults(questions, formData);
}

function showResults(questions, formData) {
  questions.forEach((q) => {
    const block = document.getElementById(`q-${q.id}`);
    const userAns = formData.get(q.id);

    // Determine correct answer text based on current language
    const correctAns =
      currentLang === "en" && q.answer_en ? q.answer_en : q.answer;

    if (userAns === correctAns) {
      block.classList.add("correct");
    } else {
      block.classList.add("incorrect");
      const p = document.createElement("p");
      p.innerText = `${getLabel("correct_label")}: ${correctAns}`;
      block.appendChild(p);
    }
  });

  // Check Unlock for Next Region
  if (typeof SAHARA_REGIONS !== "undefined") {
    const idx = SAHARA_REGIONS.indexOf(currentRegionId);
    if (idx < SAHARA_REGIONS.length - 1) {
      const nextId = SAHARA_REGIONS[idx + 1];
      if (typeof checkUnlock === "function" && checkUnlock(nextId)) {
        setTimeout(() => alert(getLabel("congrats")), 500);
      }
    }
  }

  // Refresh Map/Sidebar UI
  if (typeof updateUI === "function") updateUI();
}
