# IPL Akinator 🏏

An AI-powered cricket player guessing game powered by **Google Gemini**.

## Project Structure

```
ipl_akinator/
├── frontend/
│   ├── index.html        ← Main game UI (open this in browser)
│   └── style.css         ← IPL-themed stylesheet
├── backend/
│   ├── gameSession.js    ← Game session controller (min 8, max 12 questions)
│   └── players.json      ← 248 IPL players seed database
├── engine/
│   └── probabilityEngine.js  ← Bayesian weights + information-gain engine
├── brain/
│   └── aiBrain.js        ← Gemini API calls + DB correction logic
└── assets/               ← (for future images/icons)
```

## How to Play

1. Open `frontend/index.html` in any modern browser (Chrome, Firefox, Edge).
2. Think of an IPL player.
3. Answer <8 or =8 Yes/No/Maybe/Don't Know questions.
4. The AI guesses your player!

## Features

- **Gemini AI** generates natural, dramatic questions every round
- **8 Questions** (max 8 forced guess)
- **Bayesian probability engine** using information gain
- **Live stats**: confidence %, entropy reduction, top suspects
- **Self-learning DB**: wrong guess? Submit the correct player name
  - If player exists in DB → informed immediately
  - If not → Gemini auto-generates their data and adds them to localStorage DB
- **Keyboard shortcuts**: Y / N / M / D
- **Leaderboard** persisted in localStorage
- **Confetti** on correct guess

## Gemini API Key

Key is pre-configured in `brain/aiBrain.js`:
```
AIzaSyBRoVW15TxJp8yM5vo8lwJCsj3t-wqFaLY
```

## Button Highlight Fix

Answer buttons highlight **only on hover** (pure CSS `:hover`).
No JavaScript class is ever added to buttons — buttons are immediately
disabled + blurred after each answer so no highlight bleeds into the next question.
