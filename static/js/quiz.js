// static/js/quiz.js

let currentRegionId = null;

function openQuizModal(regionId) {
    currentRegionId = regionId;

    const modal = document.getElementById('quiz-modal');
    const quizContainer = document.getElementById('quiz-content');

    quizContainer.innerHTML = '<div class="loader">جاري التحميل...</div>';
    modal.style.display = 'flex';

    fetch(`/api/quiz/${regionId}`)
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                quizContainer.innerHTML = `<p style="color:red; text-align:center;">${data.error}</p>`;
                return;
            }

            if (!data || data.length === 0) {
                quizContainer.innerHTML = '<p style="text-align:center;">لا توجد أسئلة حالياً</p>';
                return;
            }

            renderQuiz(data);
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
            user_answer: formData.get(q.id)
        });
    });

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
    });
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
        }, 500);
    }

    // --- CRITICAL FIX: REFRESH PROGRESS BAR ---
    // We call the function defined in map.js
    if (typeof updateMapState === 'function') {
        updateMapState();
    }
}
