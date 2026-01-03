// draft.js
// Simple rookie draft class generator with hidden true OVR/dev. [web:129][web:195][web:196]

// Positions roughly balanced: more WR/CB, fewer QB.
const DRAFT_POSITIONS = [
  "QB","RB","WR","WR","WR","TE",
  "LT","LG","C","RG","RT",
  "EDGE","EDGE","DT","LB","LB",
  "CB","CB","CB","S","S"
];

const DEV_TIERS = [
  { label: "Normal", weight: 65 },
  { label: "Star", weight: 22 },
  { label: "Superstar", weight: 10 },
  { label: "X-Factor", weight: 3 }
];

// Random helper
function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

function weightedDev() {
  const total = DEV_TIERS.reduce((s,d) => s + d.weight, 0);
  let r = Math.random() * total;
  for (const d of DEV_TIERS) {
    if (r < d.weight) return d.label;
    r -= d.weight;
  }
  return "Normal";
}

// Generate a single prospect with hidden true overall and visible scout grade.
function generateProspect(id, roundHint) {
  const pos = randChoice(DRAFT_POSITIONS);
  const age = 21 + Math.floor(Math.random() * 3); // 21–23

  // Base true overall by round hint (1 = day 1, 2 = day 2, 3 = day 3) with variance. [web:129][web:195]
  let baseTrue;
  if (roundHint === 1) baseTrue = randRange(72, 82);
  else if (roundHint === 2) baseTrue = randRange(66, 76);
  else baseTrue = randRange(60, 72);

  // Add bust/gem randomness.
  const swing = randRange(-6, 6);
  const trueOVR = Math.max(58, Math.min(84, Math.round(baseTrue + swing)));

  // Scout grade (what the user sees) is noisy.
  const scoutNoise = randRange(-4, 4);
  const scoutGrade = Math.max(55, Math.min(85, Math.round(trueOVR + scoutNoise)));

  const dev = weightedDev();

  // Simple name generator – initials + id to be unique for now.
  const first = "Prospect";
  const last = `#${id}`;

  return {
    id,
    first,
    last,
    name: `${first} ${last}`,
    pos,
    age,
    dev,          // hidden for now
    trueOVR,      // hidden true rating
    scoutGrade,   // visible rating on draft board
    roundHint
  };
}

// Public: generate a full draft class for one year.
// Roughly 7 rounds * 32 teams = 224 players; we generate a bit more.
function generateDraftClass() {
  const prospects = [];
  let id = 1;

  // Top tier (round 1–2 range)
  for (let i = 0; i < 80; i++) {
    prospects.push(generateProspect(id++, i < 32 ? 1 : 2));
  }
  // Mid tier (round 3–4)
  for (let i = 0; i < 80; i++) {
    prospects.push(generateProspect(id++, 2));
  }
  // Late tier (round 5–7)
  for (let i = 0; i < 80; i++) {
    prospects.push(generateProspect(id++, 3));
  }

  // Sort by scoutGrade as the default "big board". [web:196][web:236]
  prospects.sort((a,b) => b.scoutGrade - a.scoutGrade);

  return prospects;
}
