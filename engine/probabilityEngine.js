/**
 * IPL Akinator — Probability Engine
 * Information-gain based Bayesian question selector
 */
"use strict";

const ATTRIBUTES = [
  { key:"overseas",              label:"overseas (foreign) player" },
  { key:"captain",               label:"has captained an IPL team" },
  { key:"active",                label:"currently playing in the IPL" },
  { key:"wicketkeeper",          label:"a wicket-keeper batsman" },
  { key:"opener",                label:"an opening batsman" },
  { key:"finisher",              label:"a finisher who bats in the lower-middle order" },
  { key:"spinner",               label:"a spinner bowler" },
  { key:"pace_bowler",           label:"a pace bowler" },
  { key:"aggressive",            label:"known for an aggressive batting style" },
  { key:"death_bowler",          label:"a death-over specialist bowler" },
  { key:"played_multiple_teams", label:"has played for multiple IPL teams" },
  { key:"played_defunct_team",   label:"has played for a defunct IPL team (Deccan, GL, RPS, PWI, KTK...)" },
  { key:"role_bat",              label:"primarily a specialist batsman" },
  { key:"role_bowl",             label:"primarily a specialist bowler" },
  { key:"role_ar",               label:"an all-rounder who both bats and bowls" },
];

function getAttrValue(player, key) {
  if (key === "role_bat")  return player.role === "Batsman" || player.role === "WK-Batsman";
  if (key === "role_bowl") return player.role === "Bowler";
  if (key === "role_ar")   return player.role === "All-rounder";
  return player[key] === "TRUE";
}

function calcEntropy(weights) {
  const total = weights.reduce((s, w) => s + w, 0);
  if (!total) return 0;
  return -weights.reduce((s, w) => {
    const p = w / total;
    return s + (p > 0 ? p * Math.log2(p) : 0);
  }, 0);
}

function bestAttribute(players, weights, usedKeys) {
  const avail = ATTRIBUTES.filter(a => !usedKeys.includes(a.key));
  if (!avail.length) return null;
  const total = weights.reduce((s,w)=>s+w,0);
  if (!total) return avail[0];
  let best = null, bestGain = -Infinity;
  for (const a of avail) {
    const yW=[], nW=[];
    players.forEach((p,i)=>(getAttrValue(p,a.key)?yW:nW).push(weights[i]));
    const pY=yW.reduce((s,w)=>s+w,0)/total, pN=1-pY;
    const gain = calcEntropy(weights)
      - (pY>0?pY*calcEntropy(yW):0)
      - (pN>0?pN*calcEntropy(nW):0);
    if (gain > bestGain) { bestGain=gain; best=a; }
  }
  return best || avail[0];
}

function updateWeights(players, weights, key, resp) {
  const M = { yes:{t:3.0,f:0.1}, no:{t:0.1,f:3.0}, maybe:{t:1.4,f:0.7}, dk:{t:1.0,f:1.0} };
  const m = M[resp] || M.dk;
  const updated = weights.map((w,i) => w * (getAttrValue(players[i],key) ? m.t : m.f));
  const total = updated.reduce((s,w)=>s+w,0);
  return total>0 ? updated.map(w=>w/total) : updated;
}

function getConfidence(weights) {
  return weights.length ? Math.round(Math.max(...weights)*100) : 0;
}
function getActiveCandidateCount(weights, threshold=0.005) {
  return weights.filter(w=>w>threshold).length;
}
function getTopCandidates(players, weights, n=5) {
  return players.map((p,i)=>({player:p,weight:weights[i]})).sort((a,b)=>b.weight-a.weight).slice(0,n);
}
function getEntropyReductionPercent(initEntropy, currentWeights) {
  if (initEntropy<=0) return 0;
  const cur = calcEntropy(currentWeights);
  return Math.round(((initEntropy-cur)/initEntropy)*100);
}

if (typeof module!=="undefined") {
  module.exports = { ATTRIBUTES, getAttrValue, calcEntropy, bestAttribute, updateWeights, getConfidence, getActiveCandidateCount, getTopCandidates, getEntropyReductionPercent };
}
