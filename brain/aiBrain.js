/**
 * IPL Akinator — AI Brain
 * Gemini API question generation + feedback/correction learning
 */
"use strict";

const GEMINI_KEY = "AIzaSyBRoVW15TxJp8yM5vo8lwJCsj3t-wqFaLY";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

const FALLBACK_QUESTIONS = {
  overseas:              "Is your player from outside India — an overseas international?",
  captain:               "Has your player ever captained an IPL franchise?",
  active:                "Is your player still playing in the IPL today?",
  wicketkeeper:          "Does your player keep wickets — gloves and all?",
  opener:                "Does your player open the batting at the top of the order?",
  finisher:              "Is your player the go-to finisher who smashes sixes in the final overs?",
  spinner:               "Does your player bowl spin — leg-spin or off-spin?",
  pace_bowler:           "Does your player bowl pace — fast and aggressive?",
  aggressive:            "Is your player known for explosive, aggressive batting?",
  death_bowler:          "Is your player a specialist death-over bowler?",
  played_multiple_teams: "Has your player worn the jersey of more than one IPL team?",
  played_defunct_team:   "Has your player played for a defunct IPL team like Deccan, GL, RPS, or PWI?",
  role_bat:              "Is your player primarily a specialist batsman?",
  role_bowl:             "Is your player primarily a specialist bowler?",
  role_ar:               "Is your player a true all-rounder — bats AND bowls regularly?",
};

async function generateQuestion(attrKey, attrLabel, topNames, candidateCount, questionNum) {
  const prompt = `You are the IPL Akinator — a dramatic, energetic cricket quiz game-show host.
You are on question ${questionNum} of 12. You need to ask about this trait: "${attrLabel}".
Top suspects right now: ${topNames}. Players still in the game: ${candidateCount}.

Write ONE short, exciting question about this trait.
Rules:
- Maximum 18 words
- Do NOT mention any player name
- Be dramatic and fun like a cricket commentator on a big final night
- End with a question mark
- Return ONLY the question text — nothing else`;

  try {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 80, temperature: 0.88 },
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (text) return text.replace(/^["'`]|["'`]$/g, "").trim();
  } catch (e) {
    console.warn("[Brain] Gemini unavailable, using fallback:", e.message);
  }
  return FALLBACK_QUESTIONS[attrKey] || `Is this player known for: ${attrLabel}?`;
}

/* ── Database helpers (localStorage-backed) ─────────────────────────── */
const DB_KEY          = "ipl_ak_players_db";
const CORRECTIONS_KEY = "ipl_ak_corrections";
const LB_KEY          = "ipl_ak_lb";

function loadDB() {
  try { return JSON.parse(localStorage.getItem(DB_KEY) || "null"); }
  catch { return null; }
}

function saveDB(players) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(players)); return true; }
  catch { return false; }
}

/**
 * Check if a player name exists in the runtime database.
 * Returns the player object if found, else null.
 */
function findPlayerByName(players, name) {
  const q = name.trim().toLowerCase();
  return players.find(p => p.name.trim().toLowerCase() === q) || null;
}

/**
 * Add a new player to the runtime database.
 * Triggers Gemini to infer their attributes from their name.
 * Returns the new player object.
 */
async function addNewPlayerToDB(players, name) {
  const prompt = `You are a cricket data expert. Given the IPL cricketer name "${name}", return a JSON object with these exact fields and boolean string values "TRUE"/"FALSE":
{
  "name": "${name}",
  "overseas": "TRUE or FALSE",
  "role": "Batsman or Bowler or All-rounder or WK-Batsman",
  "teams_played": "comma-separated IPL team abbreviations e.g. CSK,MI",
  "captain": "TRUE or FALSE",
  "active": "TRUE or FALSE",
  "opener": "TRUE or FALSE",
  "finisher": "TRUE or FALSE",
  "spinner": "TRUE or FALSE",
  "pace_bowler": "TRUE or FALSE",
  "wicketkeeper": "TRUE or FALSE",
  "aggressive": "TRUE or FALSE",
  "death_bowler": "TRUE or FALSE",
  "played_multiple_teams": "TRUE or FALSE",
  "played_defunct_team": "TRUE or FALSE"
}
Return ONLY valid JSON, no markdown, no explanation.`;

  let newPlayer = null;
  try {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 300, temperature: 0.2 },
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    let raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    raw = raw.replace(/```json|```/g, "").trim();
    newPlayer = JSON.parse(raw);
  } catch (e) {
    console.warn("[Brain] Could not auto-generate player data:", e.message);
    // Fallback minimal entry
    newPlayer = {
      name, overseas:"FALSE", role:"Batsman", teams_played:"Unknown",
      captain:"FALSE", active:"TRUE", opener:"FALSE", finisher:"FALSE",
      spinner:"FALSE", pace_bowler:"FALSE", wicketkeeper:"FALSE",
      aggressive:"FALSE", death_bowler:"FALSE",
      played_multiple_teams:"FALSE", played_defunct_team:"FALSE",
      user_added: true,
    };
  }

  players.push(newPlayer);
  saveDB(players);

  // Log correction
  const corr = loadCorrections();
  corr.push({ action:"new_player_added", name, timestamp: Date.now() });
  localStorage.setItem(CORRECTIONS_KEY, JSON.stringify(corr.slice(-100)));

  return newPlayer;
}

function saveCorrection(guessed, actual, history) {
  const corr = loadCorrections();
  corr.push({
    guessed, actual,
    history: history.map(h => ({ attr: h.attr, resp: h.resp })),
    timestamp: Date.now(),
  });
  localStorage.setItem(CORRECTIONS_KEY, JSON.stringify(corr.slice(-100)));
}

function loadCorrections() {
  try { return JSON.parse(localStorage.getItem(CORRECTIONS_KEY) || "[]"); }
  catch { return []; }
}

function saveToLeaderboard(entry) {
  const lb = loadLeaderboard();
  lb.unshift(entry);
  localStorage.setItem(LB_KEY, JSON.stringify(lb.slice(0, 25)));
}

function loadLeaderboard() {
  try { return JSON.parse(localStorage.getItem(LB_KEY) || "[]"); }
  catch { return []; }
}

if (typeof module !== "undefined") {
  module.exports = { generateQuestion, loadDB, saveDB, findPlayerByName, addNewPlayerToDB, saveCorrection, loadCorrections, saveToLeaderboard, loadLeaderboard, FALLBACK_QUESTIONS, GEMINI_KEY };
}
