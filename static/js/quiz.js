// static/js/quiz.js

// 1. Define the variable globally at the top
let currentRegionId = null;

function openQuizModal(regionId) {
    // 2. Store the ID so submitQuiz can use it later
    currentRegionId = regionId;

    const modal = document.getElementById('quiz-modal');
    const quizContainer = document.getElementById('quiz-content');

    // Show loading state
    quizContainer.innerHTML = '<div class="loader">جاري التحميل...</div>';
    modal.style.display = 'flex';

    // Fetch questions from backend
    fetch(`/api/quiz/${regionId}`)
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                quizContainer.innerHTML = `<p style="color:red; text-align:center;">${data.error}</p>`;
                return;
            }

            // Check if we actually got questions
            if (!data || data.length === 0) {
                quizContainer.innerHTML = '<p style="text-align:center;">لا توجد أسئلة حالياً لهذه المنطقة (تحقق من region_id في ملف JSON)</p>';
                return;
            }

            renderQuiz(data);
        })
        .catch(err => {
            console.error("Quiz Load Error:", err);
            quizContainer.innerHTML = '<p style="color:red;">حدث خطأ في التحميل</p>';
        });
}

function renderQuiz(questions) {
    const quizContainer = document.getElementById('quiz-content');
    let html = '<form id="quiz-form">';

    questions.forEach((q, index) => {
        html += `
            <div class="question-block" id="q-${q.id}">
                <h3>${index + 1}. ${q.question}</h3>
                <div class="options">
                    ${q.options.map(opt => `
                        <label>
                            <input type="radio" name="${q.id}" value="${opt}" required> ${opt}
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
    });

    html += `<button type="submit" class="submit-btn">إرسال</button></form>`;
    quizContainer.innerHTML = html;

    // Handle form submission
    document.getElementById('quiz-form').addEventListener('submit', (e) => {
        e.preventDefault();
        submitQuiz(questions);
    });
}

function submitQuiz(questions) {
    const formData = new FormData(document.getElementById('quiz-form'));
    const answers = [];

    questions.forEach(q => {
        answers.push({
            id: q.id,
            user_answer: formData.get(q.id) // Gets the selected value
        });
    });

    // Use the global currentRegionId
    fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            region_id: currentRegionId,
            answers: answers
        })
    })
    .then(res => res.json())
    .then(data => {
        showResults(data);
    })
    .catch(err => console.error("Submit Error:", err));
}

function showResults(data) {
    // Highlight correct/incorrect
    data.results.forEach(res => {
        const block = document.getElementById(`q-${res.id}`);
        if (block) {
            if (res.correct) {
                block.classList.add('correct');
            } else {
                block.classList.add('incorrect');
                const p = document.createElement('p');
                p.innerText = `الجواب الصحيح: ${res.correct_answer}`;
                block.appendChild(p);
            }
        }
    });

    // Alert if new region unlocked
    if (data.region_unlocked) {
        setTimeout(() => {
            alert(`مبروك! لقد فتحت منطقة جديدة!`);
            // updateMapState(); // You can call this if map.js exposes it globally
        }, 500);
    }
}
