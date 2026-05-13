/**
 * IPL Akinator — AI Brain
 * Gemini API question generation + feedback/correction learning
 */
"use strict";

const BACKEND_URL = "http://localhost:3000";

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
  // Pick a random style archetype so every Gemini call has a different persona/tone
  const styles = [
    "Ask like Ravi Shastri mid-match: explosive and theatrical.",
    "Ask like a calm, analytical cricket statistician at a press conference.",
    "Ask like a street-smart cricket fan teasing a friend.",
    "Ask as a Bollywood quiz show host — dramatic, filmy and over the top.",
    "Ask like you're narrating a suspenseful detective novel.",
    "Ask as a nervous young fan meeting their hero for the first time.",
    "Ask like a sarcastic cricket pundit who has seen it all.",
    "Ask like a confident T20 auctioneer trying to hype up the crowd.",
  ];
  const style = styles[Math.floor(Math.random() * styles.length)];

  const prompt = `You are an IPL Akinator game show. You must ask ONE yes/no question about this single trait: "${attrLabel}".

Your tone/style for THIS question ONLY: ${style}

Context: Question ${questionNum} of 12. Current suspects: ${topNames}. Players remaining: ${candidateCount}.

STRICT RULES:
- ONE sentence only, maximum 18 words
- Must be a yes/no question (end with ?)
- NEVER mention a player's name
- Use ONLY the style described above — commit to it fully
- Return ONLY the question text, no quotes, no labels`;

  try {
    const res = await fetch(`${BACKEND_URL}/api/generate-question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.question) return data.question;
  } catch (e) {
    console.warn("[Brain] Backend unavailable, using fallback:", e.message);
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
    const res = await fetch(`${BACKEND_URL}/api/add-player`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    newPlayer = data.player;
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
  module.exports = { generateQuestion, loadDB, saveDB, findPlayerByName, addNewPlayerToDB, saveCorrection, loadCorrections, saveToLeaderboard, loadLeaderboard, FALLBACK_QUESTIONS };
}
