// Global variables for game state
let correctCount = 0;
let incorrectCount = 0;
let correctAnswer = 0;
let num1 = 0;
let num2 = 0;
let isChecking = false; // Flag to prevent rapid submissions
let historyLog = []; // Array to store history entries

// Current operation mode: addition by default (first option selected)
let mode = 'addition'; // 'addition' | 'subtraction' | 'multiplication' | 'division'

// DOM element references
const correctCountEl = document.getElementById('correct-count');
const incorrectCountEl = document.getElementById('incorrect-count');
const questionTextEl = document.getElementById('question-text');
const answerInputEl = document.getElementById('answer-input');
const submitButtonEl = document.getElementById('submit-button');
const feedbackMessageEl = document.getElementById('feedback-message');
const appContainerEl = document.getElementById('app');
const historyLogEl = document.getElementById('history-log');
const operationSelectorEl = document.getElementById('operation-selector');

// Operator symbols for display
const operatorSymbol = {
    addition: '+',
    subtraction: '−',
    multiplication: '×',
    division: '÷'
};

// Play short tones using WebAudio (no external files)
function playSound(type) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const now = ctx.currentTime;
        if (type === 'correct') {
            // Two pleasant short tones
            const o1 = ctx.createOscillator(), g1 = ctx.createGain();
            o1.type = 'sine'; o1.frequency.value = 880;
            g1.gain.setValueAtTime(0, now); g1.gain.linearRampToValueAtTime(0.22, now + 0.01);
            g1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            o1.connect(g1); g1.connect(ctx.destination);
            o1.start(now); o1.stop(now + 0.22);

            const o2 = ctx.createOscillator(), g2 = ctx.createGain();
            const t2 = now + 0.12;
            o2.type = 'sine'; o2.frequency.value = 1320;
            g2.gain.setValueAtTime(0, t2); g2.gain.linearRampToValueAtTime(0.18, t2 + 0.01);
            g2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.28);
            o2.connect(g2); g2.connect(ctx.destination);
            o2.start(t2); o2.stop(t2 + 0.28);
        } else {
            // Single low "buzzer" square tone
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'square'; o.frequency.value = 120;
            g.gain.setValueAtTime(0.25, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
            o.connect(g); g.connect(ctx.destination);
            o.start(now); o.stop(now + 0.45);
        }
    } catch (e) {
        // fail silently if audio not supported
    }
}

/**
 * Updates the scoreboard display.
 */
function updateScoreboard() {
    correctCountEl.textContent = correctCount;
    incorrectCountEl.textContent = incorrectCount;
}

/**
 * Sets the current mode and updates UI.
 */
function setMode(newMode) {
    if (!newMode || mode === newMode) return;
    mode = newMode;
    // Update aria-pressed state on buttons
    operationSelectorEl.querySelectorAll('.mode-btn').forEach(btn => {
        const isActive = btn.dataset.mode === mode;
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    // Generate a new question for the selected mode (keep score/history)
    generateQuestion();
}

/**
 * Generates a new question based on the current mode.
 */
function generateQuestion() {
    // Reset state
    answerInputEl.value = '';
    feedbackMessageEl.textContent = '';
    appContainerEl.classList.remove('pulse-correct', 'pulse-incorrect');
    answerInputEl.disabled = false;
    submitButtonEl.disabled = false;
    isChecking = false;
    answerInputEl.focus();

    // Generate numbers based on mode
    switch (mode) {
        case 'addition':
            num1 = Math.floor(Math.random() * 50) + 1; // 1..50
            num2 = Math.floor(Math.random() * 50) + 1;
            correctAnswer = num1 + num2;
            break;
        case 'subtraction':
            num1 = Math.floor(Math.random() * 50) + 1;
            num2 = Math.floor(Math.random() * 50) + 1;
            // ensure non-negative result (larger - smaller)
            if (num2 > num1) [num1, num2] = [num2, num1];
            correctAnswer = num1 - num2;
            break;
        case 'multiplication':
            num1 = Math.floor(Math.random() * 12) + 1; // 1..12
            num2 = Math.floor(Math.random() * 12) + 1;
            correctAnswer = num1 * num2;
            break;
        case 'division':
            // create divisible pair: divisor 1..12, quotient 1..12
            const divisor = Math.floor(Math.random() * 12) + 1;
            const quotient = Math.floor(Math.random() * 12) + 1;
            num1 = divisor * quotient; // dividend
            num2 = divisor; // divisor
            correctAnswer = quotient;
            break;
        default:
            num1 = 0; num2 = 0; correctAnswer = 0;
    }

    // Display the new question with correct operator
    questionTextEl.textContent = `${num1} ${operatorSymbol[mode]} ${num2} = ?`;
}

/**
 * Renders the history log, showing the most recent entries first.
 */
function renderHistory() {
    historyLogEl.innerHTML = ''; // Clear previous entries
    
    if (historyLog.length === 0) {
         historyLogEl.innerHTML = '<p class="text-gray-400 text-center text-sm">Submit your first answer to start the log!</p>';
         return;
    }

    historyLog.forEach((item) => {
        const statusColor = item.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800';
        const statusIcon = item.isCorrect ? '✅' : '❌';
        
        const historyItem = document.createElement('div');
        historyItem.className = `p-3 rounded-lg flex items-center justify-between ${statusColor}`;
        
        // mode badge + question
        const modeBadge = `<span class="mode-badge mr-3">${item.mode[0].toUpperCase() + item.mode.slice(1)}</span>`;
        let textContent = `${modeBadge}<span class="text-gray-500">${item.question} = </span>`;

        if (item.isCorrect) {
            textContent += `<span class="font-bold">${item.userAnswer}</span>`;
        } else {
            textContent += `<span class="line-through mr-2">${item.userAnswer}</span><span class="font-bold">= ${item.correctAnswer}</span>`;
        }
        
        historyItem.innerHTML = `
            <p class="font-medium text-sm sm:text-base">${textContent}</p>
            <span class="text-xl">${statusIcon}</span>
        `;
        
        historyLogEl.appendChild(historyItem);
    });
}

/**
 * Checks the user's answer and updates the score and history.
 */
function checkAnswer() {
    if (isChecking) return; // Prevent double submission
    isChecking = true;
    
    const userAnswer = parseInt(answerInputEl.value);
    const questionString = `${num1} ${operatorSymbol[mode]} ${num2}`;
    const isCorrect = userAnswer === correctAnswer;
    
    // Basic validation
    if (isNaN(userAnswer)) {
        feedbackMessageEl.textContent = "Please enter a valid number.";
        feedbackMessageEl.classList.remove('text-emerald-600', 'text-red-600');
        feedbackMessageEl.classList.add('text-gray-500');
        isChecking = false;
        return;
    }

    // Log the history before updating counts
    historyLog.unshift({ // Add to the start (most recent first)
        question: questionString,
        userAnswer: userAnswer,
        correctAnswer: correctAnswer,
        isCorrect: isCorrect,
        mode: mode
    });

    // Disable input and button while processing
    answerInputEl.disabled = true;
    submitButtonEl.disabled = true;

    if (isCorrect) {
        correctCount++;
        feedbackMessageEl.textContent = "Correct! 🎉";
        feedbackMessageEl.classList.remove('text-red-600', 'text-gray-500');
        feedbackMessageEl.classList.add('text-emerald-600');
        appContainerEl.classList.add('pulse-correct');
        playSound('correct');
    } else {
        incorrectCount++;
        feedbackMessageEl.textContent = `Incorrect. The answer was ${correctAnswer}.`;
        feedbackMessageEl.classList.remove('text-emerald-600', 'text-gray-500');
        feedbackMessageEl.classList.add('text-red-600');
        appContainerEl.classList.add('pulse-incorrect');
        playSound('incorrect');
    }

    // Update scoreboard, history, and generate the next question after a short delay
    updateScoreboard();
    renderHistory();
    setTimeout(generateQuestion, 1500); // 1.5 seconds delay to see the feedback
}

// Event Listeners
submitButtonEl.addEventListener('click', checkAnswer);
answerInputEl.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        checkAnswer();
        event.preventDefault();
    }
});

// Mode selector clicks (delegation)
operationSelectorEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.mode-btn');
    if (!btn) return;
    const selected = btn.dataset.mode;
    setMode(selected);
});

// Initialize the game when the window loads
window.onload = function() {
    // mark the default button as pressed (in case HTML not set)
    operationSelectorEl.querySelectorAll('.mode-btn').forEach(btn => {
        btn.setAttribute('aria-pressed', btn.dataset.mode === mode ? 'true' : 'false');
    });
    updateScoreboard();
    renderHistory(); // Initialize the empty history display
    generateQuestion();
};