const API = (window.location.port === '5501' || window.location.port === '5500')
  ? 'http://127.0.0.1:5000'
  : '';

let questions = [];
let timeLeft = 30;

// تحميل الأسئلة
async function loadQuiz() {

    const response = await fetch(`${API}/questions`);
    const data = await response.json();

    questions = data.questions;

    const quizDiv = document.getElementById("quiz");

    quizDiv.innerHTML = "";

    questions.forEach(q => {

        let html = `
            <div>
                <h3>${q.question}</h3>
        `;

        q.options.forEach(option => {

            html += `
                <label>
                    <input
                        type="radio"
                        name="${q.id}"
                        value="${option}">
                    ${option}
                </label>
                <br>
            `;
        });

        html += `<hr></div>`;

        quizDiv.innerHTML += html;
    });

    startTimer();
}

// Timer
function startTimer() {

    const timer = document.getElementById("timer");

    const interval = setInterval(() => {

        timeLeft--;

        timer.innerText = `Time Left: ${timeLeft}s`;

        if(timeLeft <= 0){

            clearInterval(interval);

            submitQuiz();
        }

    }, 1000);
}

// إرسال الأجوبة
async function submitQuiz() {

    let answers = {};

    questions.forEach(q => {

        const selected =
            document.querySelector(
                `input[name="${q.id}"]:checked`
            );

        if(selected){
            answers[q.id] = selected.value;
        }
    });

    const response = await fetch(`${API}/submit`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(answers)
    });

    const result = await response.json();

    document.getElementById("result").innerHTML =
        `Your Score: ${result.score}/${result.total}`;
}

loadQuiz();