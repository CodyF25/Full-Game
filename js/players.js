// players.js
// Handles random player generation, dev traits, basic aging helpers.

const DEV_TRAITS = ["Normal", "Star", "Superstar", "X-Factor"];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Simple name pools
const FIRST_NAMES = [
  "Caleb","Jamal","Darren","Tyson","Marcus","Logan","Evan","Noah","Riley",
  "Chris","Jordan","Malik","Victor","Cole","Andre","Jalen","Ty","Damian",
  "Quinn","Brandon","Mason","Alex","Devin","Hunter","Isaiah","Nate","Owen"
];

const LAST_NAMES = [
  "Rivers","Brooks","Cole","Reed","Hill","West","Grant","Kelly","James",
  "Martin","Blake","Stone","Banks","Harris","Fields","Price","Clarke",
  "Ford","Allen","Tate","Cook","Morgan","Sims","Wright","Mitchell",
  "Parker","Bryant","Lewis","Hall"
];

// Position groups
const OFFENSE_POSITIONS = ["QB","RB","WR","WR","WR","TE","OL","OL","OL","OL","OL"];
const DEFENSE_POSITIONS = ["DL","DL","LB","LB","CB","CB","S","S"];
const ST_POSITIONS = ["K","P","ST"];

// Dev trait probabilities for league players (not draft-specific yet)
function randomDevTrait() {
  const roll = Math.random();
  if (roll < 0.7) return "Normal";      // 70%
  if (roll < 0.9) return "Star";        // 20%
  if (roll < 0.98) return "Superstar";  // 8%
  return "X-Factor";                    // 2%
}

// Generate a single random player for a given position
function generateRandomPlayerForPos(pos) {
  const first = randomChoice(FIRST_NAMES);
  const last = randomChoice(LAST_NAMES);
  const name = first + " " + last;

  // Side by position
  let side;
  if (["QB","RB","WR","TE","OL"].includes(pos)) side = "Offense";
  else if (["DL","LB","CB","S"].includes(pos)) side = "Defense";
  else side = "ST";

  // Age and OVR roughly by position importance
  const age = 22 + Math.floor(Math.random() * 11); // 22–32
  let baseMin = 70;
  let baseMax = 90;
  if (pos === "QB") { baseMin = 72; baseMax = 92; }
  if (pos === "K" || pos === "P" || pos === "ST") { baseMin = 68; baseMax = 84; }

  const ovr = baseMin + Math.floor(Math.random() * (baseMax - baseMin + 1));

  // Contract years and salary scale with OVR a bit
  const years = 1 + Math.floor(Math.random() * 4); // 1–4
  const salary = (ovr - 60) * 0.5 + (years * 0.5); // very rough

  const dev = randomDevTrait();

  return {
    side,
    pos,
    name,
    age,
    ovr,
    years,
    salary: parseFloat(salary.toFixed(1)),
    dev
  };
}

// Generate a full roster (about 22 players) for a team
function generateRandomRoster() {
  const roster = [];

  // Offense
  OFFENSE_POSITIONS.forEach(pos => {
    roster.push(generateRandomPlayerForPos(pos));
  });

  // Defense
  DEFENSE_POSITIONS.forEach(pos => {
    roster.push(generateRandomPlayerForPos(pos));
  });

  // Special teams
  ST_POSITIONS.forEach(pos => {
    roster.push(generateRandomPlayerForPos(pos));
  });

  return roster;
}
