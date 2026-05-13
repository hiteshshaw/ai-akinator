require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

// Route 1: Generate dynamic question
app.post('/api/generate-question', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 80, temperature: 0.88 },
            }),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        
        res.json({ question: text ? text.replace(/^["'`]|["'`]$/g, "").trim() : null });
    } catch (e) {
        console.error('[Backend] Error generating question:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// Route 2: Auto-generate new player attributes
app.post('/api/add-player', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 300, temperature: 0.2 },
            }),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        let raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        raw = raw.replace(/```json|```/g, "").trim();
        
        res.json({ player: JSON.parse(raw) });
    } catch (e) {
        console.error('[Backend] Error auto-generating player:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// Optional: Serve the frontend static files so you don't need VS Code live server
const path = require('path');
app.use(express.static(path.join(__dirname, 'frontend')));
app.use('/engine', express.static(path.join(__dirname, 'engine')));
app.use('/brain', express.static(path.join(__dirname, 'brain')));
app.use('/backend', express.static(path.join(__dirname, 'backend')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 IPL Akinator Server running on http://localhost:${PORT}`);
});
