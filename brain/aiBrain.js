/**
 * IPL Akinator — AI Brain
 * Gemini API question generation + feedback/correction learning
 */
"use strict";

const BACKEND_URL = ""; // Relative URL — works locally AND on any hosted platform

const FALLBACK_QUESTIONS = {
  overseas: [
    "Is your player from outside India — an overseas international?",
    "Does this player take up an overseas slot in the playing XI?",
    "Is your player a foreign recruit in the IPL?"
  ],
  captain: [
    "Has your player ever captained an IPL franchise?",
    "Has he successfully led a team to the playoffs or a title?",
    "Has this player ever taken on the leadership duties for an IPL team?"
  ],
  active: [
    "Is your player still playing in the IPL today?",
    "Is this cricketer currently an active player in the IPL?",
    "Did this player participate in recent IPL seasons?"
  ],
  wicketkeeper: [
    "Does your player keep wickets — gloves and all?",
    "Is your player a designated wicket-keeper batsman?",
    "Has your player regularly stood behind the stumps in the IPL?"
  ],
  opener: [
    "Does your player open the batting at the top of the order?",
    "Is this player known for facing the new ball in the first over?",
    "Does your player walk out to bat as an opener?"
  ],
  finisher: [
    "Is your player the go-to finisher who smashes sixes in the final overs?",
    "Does your player typically bat in the lower-middle order to close out innings?",
    "Is this player known as a death-overs batting specialist?"
  ],
  spinner: [
    "Does your player bowl spin — leg-spin or off-spin?",
    "Is your player a slow bowler who relies on spin and flight?",
    "Does this player belong to the spin bowling department?"
  ],
  pace_bowler: [
    "Does your player bowl pace — fast and aggressive?",
    "Is this player a fast bowler who runs in hard to bowl?",
    "Does your player regularly bowl at high speeds as a pacer?"
  ],
  aggressive: [
    "Is your player known for explosive, aggressive batting?",
    "Does this player have a reputation for hitting big sixes and playing aggressively?",
    "Is your player considered a destructive power-hitter?"
  ],
  death_bowler: [
    "Is your player a specialist death-over bowler?",
    "Does this player regularly bowl in the crucial final overs of an innings?",
    "Is this bowler trusted by the captain to bowl at the death?"
  ],
  played_multiple_teams: [
    "Has your player worn the jersey of more than one IPL team?",
    "Has this player been traded or bought by multiple franchises over their career?",
    "Has your player represented at least two different IPL teams?"
  ],
  played_defunct_team: [
    "Has your player played for a defunct IPL team like Deccan, GL, RPS, or PWI?",
    "Did this player ever represent an IPL franchise that no longer exists?",
    "Has this player been part of a former team like Kochi Tuskers or Gujarat Lions?"
  ],
  role_bat: [
    "Is your player primarily a specialist batsman?",
    "Is this player known mainly for their batting contributions?",
    "Does this player play as a pure batter in the team?"
  ],
  role_bowl: [
    "Is your player primarily a specialist bowler?",
    "Does this player feature in the team primarily for their bowling?",
    "Is your player a dedicated main-line bowler?"
  ],
  role_ar: [
    "Is your player a true all-rounder — bats AND bowls regularly?",
    "Does this player contribute significantly with both bat and ball?",
    "Is your player classified as an all-rounder?"
  ],
  team_csk: [
    "Has your player ever worn the yellow jersey for Chennai Super Kings (CSK)?",
    "Did this player ever play under the CSK banner?",
    "Has your player been a part of the Chennai Super Kings squad?"
  ],
  team_mi: [
    "Has your player ever played for the Mumbai Indians (MI)?",
    "Did this player ever represent the blue and gold of Mumbai Indians?",
    "Has this player been part of the MI setup?"
  ],
  team_rcb: [
    "Has your player ever been part of the Royal Challengers Bangalore (RCB) squad?",
    "Did this player ever play at the Chinnaswamy for RCB?",
    "Has your player represented the Royal Challengers Bangalore?"
  ],
  team_kkr: [
    "Has your player ever represented the Kolkata Knight Riders (KKR)?",
    "Did this player ever wear the purple and gold for KKR?",
    "Has this player been part of the Kolkata Knight Riders?"
  ],
  team_srh: [
    "Has your player ever played for the Sunrisers Hyderabad (SRH)?",
    "Did this player ever represent the Orange Army (SRH)?",
    "Has this player been a member of the Sunrisers Hyderabad squad?"
  ],
  team_rr: [
    "Has your player ever played for the Rajasthan Royals (RR)?",
    "Did this player ever wear the pink or blue for Rajasthan Royals?",
    "Has your player been part of the inaugural champions, Rajasthan Royals?"
  ],
  team_dc: [
    "Has your player ever represented the Delhi franchise (Capitals or Daredevils)?",
    "Did this player ever play for Delhi Capitals or Delhi Daredevils?",
    "Has this player been part of the Delhi-based IPL team?"
  ],
  team_pbks: [
    "Has your player ever played for the Punjab franchise (Kings or KXIP)?",
    "Did this player ever represent Punjab Kings or Kings XI Punjab?",
    "Has your player been a part of the Punjab IPL squad?"
  ],
  team_gt: [
    "Has your player ever played for the Gujarat Titans (GT)?",
    "Did this player ever win or play for the Gujarat Titans?",
    "Has this player been part of the GT setup?"
  ],
  team_lsg: [
    "Has your player ever been part of the Lucknow Super Giants (LSG)?",
    "Did this player ever play for the Lucknow franchise?",
    "Has this player represented the Lucknow Super Giants?"
  ]
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

Context: Question ${questionNum} of 12+. Current suspects: ${topNames}. Players remaining: ${candidateCount}.

STRICT RULES:
- The question must be highly dynamic and unique. Do NOT repeat standard or robotic question formats.
- Change up the phrasing and sentence structure completely every time.
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
  const fallbacks = FALLBACK_QUESTIONS[attrKey];
  if (fallbacks && fallbacks.length > 0) {
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
  return `Is this player known for: ${attrLabel}?`;
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
