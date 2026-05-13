/**
 * IPL Akinator — Game Session Controller
 * Bridges the UI with the probability engine and AI brain.
 * Min questions: 8  |  Max questions: 12
 * Guess when: confidence >= 85% AND >= 8 questions asked, OR 12 questions reached.
 */
"use strict";

const Session = {
  players: [], weights: [], history: [],
  questionCount: 0,
  MIN_Q: 8,
  MAX_Q: 12,
  curAttr: null, curQuestion: null,
  active: false, initEntropy: 0,
};

function initSession(playerList) {
  Session.players       = [...playerList];
  Session.weights       = new Array(playerList.length).fill(1 / playerList.length);
  Session.history       = [];
  Session.questionCount = 0;
  Session.curAttr       = null;
  Session.curQuestion   = null;
  Session.active        = true;
  Session.initEntropy   = calcEntropy(Session.weights);
}

function shouldGuess() {
  const conf = getConfidence(Session.weights);
  const q    = Session.questionCount;
  if (q < Session.MIN_Q)  return false;  // must ask at least 8
  if (q >= Session.MAX_Q) return true;   // forced guess at 12
  if (conf >= 85)          return true;   // early guess if very confident
  return false;
}

function processAnswer(resp) {
  if (!Session.active || !Session.curAttr) return null;
  Session.weights = updateWeights(Session.players, Session.weights, Session.curAttr, resp);
  Session.history.push({ q: Session.curQuestion, attr: Session.curAttr, resp });
  return getSessionSnapshot();
}

async function prepareNextQuestion() {
  if (!Session.active) return null;
  const usedKeys = Session.history.map(h => h.attr);
  const attr = bestAttribute(Session.players, Session.weights, usedKeys);
  if (!attr) return null;

  Session.questionCount++;
  Session.curAttr = attr.key;

  const top      = getTopCandidates(Session.players, Session.weights, 3);
  const topNames = top.map(x => x.player.name).join(", ");
  const count    = getActiveCandidateCount(Session.weights);

  Session.curQuestion = await generateQuestion(
    attr.key, attr.label, topNames, count, Session.questionCount
  );

  return {
    question: Session.curQuestion,
    attrKey:  attr.key,
    qNumber:  Session.questionCount,
    snapshot: getSessionSnapshot(),
  };
}

function buildFinalGuess() {
  Session.active = false;
  const top   = getTopCandidates(Session.players, Session.weights, 5);
  const best  = top[0];
  const conf  = getConfidence(Session.weights);
  const score = Math.round((conf / Math.max(Session.questionCount, 1)) * 10) / 10;
  return {
    player:     best.player,
    confidence: conf,
    questions:  Session.questionCount,
    score,
    topFive:    top,
    date:       new Date().toLocaleDateString("en-IN"),
  };
}

function getSessionSnapshot() {
  return {
    confidence:       getConfidence(Session.weights),
    activeCandidates: getActiveCandidateCount(Session.weights),
    topCandidates:    getTopCandidates(Session.players, Session.weights, 5),
    entropyReduction: getEntropyReductionPercent(Session.initEntropy, Session.weights),
    questionCount:    Session.questionCount,
    history:          [...Session.history],
    shouldGuess:      shouldGuess(),
  };
}

if (typeof window !== "undefined") {
  window.GameSession = { initSession, processAnswer, prepareNextQuestion, buildFinalGuess, getSessionSnapshot, shouldGuess, Session };
}
if (typeof module !== "undefined") {
  module.exports = { initSession, processAnswer, prepareNextQuestion, buildFinalGuess, getSessionSnapshot, shouldGuess, Session };
}
