require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

/* ─── helper: call Gemini ─────────────────────────────────── */
async function callGemini(prompt, maxTokens = 200, temperature = 0.5) {
    const r = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: maxTokens, temperature },
        }),
    });
    if (!r.ok) throw new Error(`Gemini HTTP ${r.status}`);
    const data = await r.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

/* ─── helper: parse JSON from Gemini text ─────────────────── */
function parseGeminiJSON(text) {
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    try { return JSON.parse(cleaned); } catch (_) {}
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch (_) {} }
    return null;
}

/* ─── helper: load players.json ──────────────────────────── */
function getLocalPlayers() {
    try {
        return JSON.parse(fs.readFileSync(path.join(__dirname, 'backend', 'players.json'), 'utf8'));
    } catch (_) { return []; }
}

/* ─── helper: build achievements from local flags ─────────── */
function buildAchievements(lp, name) {
    const list = [];
    if (lp.captain === 'TRUE')              list.push('🏆 Has captained an IPL franchise');
    if (lp.wicketkeeper === 'TRUE')         list.push('🧤 Elite wicketkeeper-batter');
    if (lp.finisher === 'TRUE')             list.push('💥 Renowned death-over finisher');
    if (lp.opener === 'TRUE')               list.push('🏏 Explosive IPL opener');
    if (lp.spinner === 'TRUE')              list.push('🌀 Lethal spin bowler');
    if (lp.pace_bowler === 'TRUE')          list.push('⚡ Express pace bowler');
    if (lp.overseas === 'TRUE')             list.push('🌍 Overseas international star');
    if (lp.played_multiple_teams === 'TRUE')list.push('🔄 Played for multiple IPL teams');
    if (lp.death_bowler === 'TRUE')         list.push('🎯 Specialist death-over bowler');
    if (lp.aggressive === 'TRUE')           list.push('🔥 Notoriously aggressive batter');
    if (list.length === 0)                  list.push('⭐ Celebrated IPL cricketer');
    return list.slice(0, 4);
}

/* ─── helper: build fun fact from local flags ─────────────── */
function buildFunFact(lp, name) {
    if (lp.finisher === 'TRUE' && lp.captain === 'TRUE')
        return `${name} is both a captain and a deadly finisher — the ultimate combination in T20 cricket!`;
    if (lp.wicketkeeper === 'TRUE' && lp.aggressive === 'TRUE')
        return `${name} combines lightning glove-work with explosive batting — a rare dual threat!`;
    if (lp.overseas === 'TRUE' && lp.spinner === 'TRUE')
        return `${name} is one of the rare overseas spinners who has consistently bamboozled IPL batters!`;
    if (lp.death_bowler === 'TRUE' && lp.pace_bowler === 'TRUE')
        return `${name} is one of the most feared death-over bowlers in IPL history!`;
    return `${name} is one of the most electrifying players to have graced the IPL.`;
}

/* ─── Route 1: generate dynamic question ─────────────────── */
app.post('/api/generate-question', async (req, res) => {
    try {
        const { prompt } = req.body;
        const text = await callGemini(prompt, 80, 0.88);
        res.json({ question: text.replace(/^["'`]|["'`]$/g, '').trim() || null });
    } catch (e) {
        console.error('[/api/generate-question]', e.message);
        res.status(500).json({ error: e.message });
    }
});

/* ─── Route 2: auto-generate new player attributes ───────── */
app.post('/api/add-player', async (req, res) => {
    try {
        const { prompt } = req.body;
        const text = await callGemini(prompt, 300, 0.2);
        const player = parseGeminiJSON(text);
        if (!player) throw new Error('Could not parse player JSON');
        res.json({ player });
    } catch (e) {
        console.error('[/api/add-player]', e.message);
        res.status(500).json({ error: e.message });
    }
});

/* ─── Route 3: premium player flashcard ──────────────────── */
app.post('/api/player-card', async (req, res) => {
    const playerName = req.body?.playerName || 'Unknown Player';

    // Step 1: Find player in local DB for instant reliable data
    const allPlayers = getLocalPlayers();
    const lp = allPlayers.find(p =>
        p.name.toLowerCase() === playerName.toLowerCase()
    ) || allPlayers.find(p =>
        p.name.toLowerCase().includes(playerName.toLowerCase().split(' ')[0])
    ) || {};

    // Step 2: Try Gemini for rich stats (best-effort, non-blocking)
    let gd = null;
    try {
        const prompt =
            `You are an IPL cricket statistician. Return ONLY valid JSON (no markdown) with these keys for "${playerName}": ` +
            `nickname, primary_team, specific_role, batting_style, bowling_style, matches, runs_or_wickets, ` +
            `average, highest_score_or_best_bowling, centuries_or_five_wicket_hauls, ` +
            `achievements (array of 4 short strings), fun_fact, dob, birthplace, nationality, debut_year.`;
        const raw = await callGemini(prompt, 800, 0.2);
        gd = parseGeminiJSON(raw);
    } catch (geminiErr) {
        console.warn('[/api/player-card] Gemini unavailable:', geminiErr.message);
    }

    // Step 3: Merge — Gemini wins, local data as fallback
    const details = {
        nickname:                      gd?.nickname                      || playerName,
        primary_team:                  gd?.primary_team                  || (lp.teams_played ? lp.teams_played.split(',')[0].trim() : 'IPL'),
        specific_role:                 gd?.specific_role                 || lp.role          || 'Cricketer',
        batting_style:                 gd?.batting_style                 || '-',
        bowling_style:                 gd?.bowling_style                 || (lp.spinner === 'TRUE' ? 'Spin Bowling' : lp.pace_bowler === 'TRUE' ? 'Pace Bowling' : '-'),
        matches:                       gd?.matches                       || '-',
        runs_or_wickets:               gd?.runs_or_wickets               || '-',
        average:                       gd?.average                       || '-',
        highest_score_or_best_bowling: gd?.highest_score_or_best_bowling || '-',
        centuries_or_five_wicket_hauls:gd?.centuries_or_five_wicket_hauls|| '-',
        achievements:                  gd?.achievements                  || buildAchievements(lp, playerName),
        fun_fact:                      gd?.fun_fact                      || buildFunFact(lp, playerName),
        dob:                           gd?.dob                           || '-',
        birthplace:                    gd?.birthplace                    || '-',
        nationality:                   gd?.nationality                   || (lp.overseas === 'TRUE' ? 'International' : lp.overseas === 'FALSE' ? 'Indian' : '-'),
        debut_year:                    gd?.debut_year                    || '-',
    };

    // Step 4: Wikipedia image lookup
    let imageUrl = null;
    try {
        const wikiRes = await fetch(
            `https://en.wikipedia.org/w/api.php?action=query` +
            `&generator=search&gsrsearch=${encodeURIComponent(playerName + ' cricketer')}` +
            `&gsrlimit=1&prop=pageimages&format=json&pithumbsize=600&origin=*`,
            { headers: { "User-Agent": "IPLAkinatorBot/1.0 (hitesh@example.com)" } }
        );
        const wikiJson = await wikiRes.json();
        const pages  = wikiJson?.query?.pages || {};
        const pageId = Object.keys(pages)[0];
        if (pageId && pages[pageId]?.thumbnail?.source) {
            imageUrl = pages[pageId].thumbnail.source;
        }
    } catch (_) {
        console.warn('[/api/player-card] Wikipedia image unavailable for', playerName);
    }

    res.json({ details, imageUrl });
});

/* ─── Route 4: stumped joke ──────────────────────────────── */
app.post('/api/joke', async (req, res) => {
    try {
        const prompt =
            `You are an AI Akinator who just completely failed to guess the user's IPL player. ` +
            `Write one funny, self-deprecating 1-2 sentence joke about your failure. Cricket/IPL themed. Be witty.`;
        const text = await callGemini(prompt, 80, 0.9);
        res.json({ joke: text || "I bowled a googly to myself — completely stumped!" });
    } catch (e) {
        console.error('[/api/joke]', e.message);
        res.json({ joke: "My machine learning got yorked! You truly stumped me!" });
    }
});

/* ─── Static file serving ────────────────────────────────── */
app.use(express.static(path.join(__dirname, 'frontend')));
app.use('/engine',  express.static(path.join(__dirname, 'engine')));
app.use('/brain',   express.static(path.join(__dirname, 'brain')));
app.use('/backend', express.static(path.join(__dirname, 'backend')));
app.use('/assets',  express.static(path.join(__dirname, 'assets')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 IPL Akinator running on http://localhost:${PORT}`));
