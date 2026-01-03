// trades.js
// Basic trade value system for players and 1st–7th round picks.

const PICK_ROUNDS = [1,2,3,4,5,6,7];

// Rough pick value chart inspired by franchise communities (not exact Madden numbers).
// Higher pick = more value; later rounds much cheaper. [web:130][web:133]
const PICK_VALUE_CHART = {
  1: 30,
  2: 20,
  3: 12,
  4: 7,
  5: 4,
  6: 2,
  7: 1
};

// For now, each team has one pick per round in the current year.
function generateTeamPicks() {
  return PICK_ROUNDS.map(r => ({
    round: r,
    // Later we can add overall draft position; for now just round-based.
    value: PICK_VALUE_CHART[r]
  }));
}

// Player trade value: based on OVR, dev, and age curve. [web:89][web:128]
function playerTradeValue(p) {
  let devMultiplier = 1;
  if (p.dev === "Star") devMultiplier = 1.2;
  else if (p.dev === "Superstar") devMultiplier = 1.4;
  else if (p.dev === "X-Factor") devMultiplier = 1.7;

  // Age modifier: more value in mid-20s.
  let ageMultiplier = 1;
  if (p.age <= 25) ageMultiplier = 1.1;
  else if (p.age >= 30) ageMultiplier = 0.9;

  const base = Math.max(0, p.ovr - 60);
  return base * devMultiplier * ageMultiplier / 4; // keep numbers similar scale to picks
}

// Picks trade value helper
function picksTradeValue(picks) {
  return picks.reduce((sum, pk) => {
    const base = PICK_VALUE_CHART[pk.round] || 0;
    return sum + base;
  }, 0);
}

// Simple CPU acceptance: compare total value of assets each way.
// CPU expects to be within a value margin; if they are clearly losing, they reject. [web:89][web:128][web:130]
function isTradeAccepted(cpuPlayersIn, cpuPlayersOut, cpuPicksIn, cpuPicksOut) {
  const cpuValueOut =
    cpuPlayersOut.reduce((s,p) => s + playerTradeValue(p), 0) +
    picksTradeValue(cpuPicksOut);
  const cpuValueIn =
    cpuPlayersIn.reduce((s,p) => s + playerTradeValue(p), 0) +
    picksTradeValue(cpuPicksIn);

  // CPU wants valueIn >= 0.9 * valueOut (close enough), otherwise reject.
  if (cpuValueIn >= 0.9 * cpuValueOut) return true;
  return false;
}
