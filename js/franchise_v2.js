// franchise_v2.js
// Clean franchise prototype: fixed schedule, multi-round playoffs, FA + draft big board.

// ---------- Config / constants ----------

const FV2_TEAM_CITY = [
  "New York","Los Angeles","Chicago","Houston","Phoenix","Philadelphia",
  "San Antonio","San Diego","Dallas","San Jose","Jacksonville","Indianapolis",
  "San Francisco","Columbus","Charlotte","Seattle","Denver","Baltimore",
  "Boston","Nashville","Detroit","Memphis","Portland","Oklahoma City",
  "Las Vegas","Louisville","Milwaukee","Albuquerque","Tucson","Fresno",
  "Sacramento","Kansas City"
];

const FV2_TEAM_NICK = [
  "Hawks","Sharks","Bulls","Lions","Titans","Rockets","Storm","Knights",
  "Warriors","Kings","Wolves","Raptors","Dragons","Raiders","Comets",
  "Guardians","Outlaws","Spartans","Rangers","Panthers","Cyclones",
  "Vipers","Phantoms","Legends","Coyotes","Pioneers","Sentinels",
  "Grizzlies","Thunder","Stars","Commanders","Rebels"
];

const FV2_GAMES_PER_SEASON = 17;
const FV2_TRADE_DEADLINE_WEEK = 9;

// ---------- Small helpers ----------

function fv2MakeAbbr(city, nick) {
  const fromCity = city.replace(/[^A-Z]/gi, "").toUpperCase().slice(0,2);
  const fromNick = nick.replace(/[^A-Z]/gi, "").toUpperCase().slice(0,1);
  return (fromCity + fromNick).padEnd(3,"X");
}

function fv2RandomRange(min, max) {
  return min + Math.random() * (max - min);
}

// ---------- League + players ----------

function fv2GenerateRandomPlayer(idSeed, side) {
  const positionsOff = ["QB","RB","WR","TE","OL"];
  const positionsDef = ["DL","LB","CB","S"];
  const firstNames = ["Alex","Jordan","Chris","Taylor","Drew","Jamie","Casey","Riley","Sam","Cameron"];
  const lastNames = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Lopez","Wilson"];

  const pos = side === "Offense"
    ? positionsOff[Math.floor(Math.random() * positionsOff.length)]
    : positionsDef[Math.floor(Math.random() * positionsDef.length)];

  const name = firstNames[Math.floor(Math.random()*firstNames.length)] + " " +
               lastNames[Math.floor(Math.random()*lastNames.length)];

  const age = Math.floor(fv2RandomRange(22, 30));
  const dev = ["A","B","C","D"][Math.floor(Math.random()*4)];
  const baseOvr = fv2RandomRange(65, 90);
  const devBoost = dev === "A" ? 5 : dev === "B" ? 2 : dev === "C" ? 0 : -2;
  const ovr = Math.round(baseOvr + devBoost);

  const years = Math.floor(fv2RandomRange(1, 4));      // 1–3 year contracts
  const salary = Math.round((ovr - 60) * 0.4);         // rough scaling in $M

  return {
    id: idSeed,
    side,
    pos,
    name,
    age,
    dev,
    ovr,
    years,
    salary
  };
}

function fv2GenerateRandomRoster() {
  const roster = [];
  let pid = 1;
  for (let i = 0; i < 10; i++) roster.push(fv2GenerateRandomPlayer(pid++, "Offense"));
  for (let i = 0; i < 10; i++) roster.push(fv2GenerateRandomPlayer(pid++, "Defense"));
  return roster;
}

function fv2CalcTeamOverall(team) {
  const r = team.roster;
  if (!r.length) return 0;
  return r.reduce((s,p) => s + p.ovr, 0) / r.length;
}

function fv2CalcSideOverall(team, side) {
  const players = team.roster.filter(p => p.side === side);
  if (!players.length) return 0;
  return players.reduce((s,p) => s + p.ovr, 0) / players.length;
}

function fv2CapUsed(team) {
  return team.roster.reduce((s,p) => s + p.salary, 0);
}

function fv2GenerateLeague() {
  const EAST = ["New York","Philadelphia","Boston","Baltimore","Charlotte","Jacksonville","Columbus"];
  const NORTH = ["Chicago","Detroit","Milwaukee","Indianapolis","Kansas City"];
  const SOUTH = ["Houston","Nashville","Memphis","Louisville","Dallas","San Antonio"];
  const WEST = ["Los Angeles","San Diego","San Jose","San Francisco","Seattle","Denver","Portland",
                "Oklahoma City","Las Vegas","Phoenix","Albuquerque","Tucson","Fresno","Sacramento"];

  function regionForCity(city) {
    if (EAST.includes(city)) return "East";
    if (NORTH.includes(city)) return "North";
    if (SOUTH.includes(city)) return "South";
    return "West";
  }

  const pool = { East: [], North: [], South: [], West: [] };

  for (let i = 0; i < 32; i++) {
    const city = FV2_TEAM_CITY[i % FV2_TEAM_CITY.length];
    const nick = FV2_TEAM_NICK[i % FV2_TEAM_NICK.length];
    const name = city + " " + nick;
    const abbr = fv2MakeAbbr(city, nick);
    const region = regionForCity(city);
    pool[region].push({ id: i, city, nick, name, abbr, region });
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  Object.keys(pool).forEach(r => shuffle(pool[r]));

  Object.keys(pool).forEach(region => {
    const arr = pool[region];
    if (arr.length < 8) {
      let idx = 0;
      while (arr.length < 8) {
        arr.push({ ...arr[idx], id: 1000 + arr.length });
        idx = (idx + 1) % arr.length;
      }
    } else if (arr.length > 8) {
      pool[region] = arr.slice(0,8);
    }
  });

  const confMap = { A: [], B: [] };
  ["East","North","South","West"].forEach(region => {
    const arr = pool[region];
    for (let i = 0; i < 4; i++) confMap.A.push({ ...arr[i], conference: "A", division: region });
    for (let i = 4; i < 8; i++) confMap.B.push({ ...arr[i], conference: "B", division: region });
  });

  const leagueBase = [...confMap.A, ...confMap.B].slice(0,32);
  const teams = [];

  leagueBase.forEach((base, idx) => {
    teams.push({
      id: idx,
      name: base.name,
      abbr: base.abbr,
      city: base.city,
      conference: base.conference,
      division: base.division,
      roster: fv2GenerateRandomRoster(),
      record: { wins: 0, losses: 0 }
    });
  });

  return teams;
}

// ---------- Schedule generation ----------

function fv2GenerateSeasonSchedule(league) {
  const teamIds = league.map(t => t.id);
  const schedule = [];

  for (let w = 1; w <= FV2_GAMES_PER_SEASON; w++) {
    const shuffled = [...teamIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const weekGames = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 >= shuffled.length) break;
      weekGames.push({ homeId: shuffled[i], awayId: shuffled[i+1] });
    }
    schedule.push(weekGames);
  }

  return schedule;
}

// ---------- Playoff helpers ----------

function fv2ComputeSeeds(confTeams) {
  const divisions = {
    East: confTeams.filter(t => t.division === "East"),
    North: confTeams.filter(t => t.division === "North"),
    South: confTeams.filter(t => t.division === "South"),
    West: confTeams.filter(t => t.division === "West")
  };

  const winners = [];
  Object.keys(divisions).forEach(div => {
    const arr = [...divisions[div]];
    arr.sort((a,b) => {
      const wDiff = b.record.wins - a.record.wins;
      if (wDiff !== 0) return wDiff;
      const lDiff = a.record.losses - b.record.losses;
      if (lDiff !== 0) return lDiff;
      return fv2CalcTeamOverall(b) - fv2CalcTeamOverall(a);
    });
    if (arr.length > 0) winners.push(arr[0]);
  });

  winners.sort((a,b) => {
    const wDiff = b.record.wins - a.record.wins;
    if (wDiff !== 0) return wDiff;
    const lDiff = a.record.losses - b.record.losses;
    if (lDiff !== 0) return lDiff;
    return fv2CalcTeamOverall(b) - fv2CalcTeamOverall(a);
  });

  const winnerIds = new Set(winners.map(t => t.id));
  const nonWinners = confTeams.filter(t => !winnerIds.has(t.id));

  nonWinners.sort((a,b) => {
    const wDiff = b.record.wins - a.record.wins;
    if (wDiff !== 0) return wDiff;
    const lDiff = a.record.losses - b.record.losses;
    if (lDiff !== 0) return lDiff;
    return fv2CalcTeamOverall(b) - fv2CalcTeamOverall(a);
  });

  const wildcards = nonWinners.slice(0,3);

  const seeds = [];
  winners.forEach((t, idx) => {
    seeds.push({ seed: idx + 1, team: t });
  });
  wildcards.forEach((t, idx) => {
    seeds.push({ seed: 5 + idx, team: t });
  });
  return seeds;
}

// ---------- Main app ----------

function renderAppV2() {
  const app = document.getElementById("app");
  const league = fv2GenerateLeague();
  const schedule = fv2GenerateSeasonSchedule(league); // [web:424]

  let selectedTeamId = 0;
  let controlledTeamId = null;
  let currentWeek = 1;

  let phase = "REGULAR"; // "REGULAR", "PLAYOFFS", "FA_OFFERS", "FA_RESULTS", "DRAFT"
  let playoffRound = null; // "WC", "DIV", "CONF", "CHAMP" or null

  // Logs and state.
  let games = [];           // all games
  let freeAgents = [];      // FA pool
  let lastFASignings = [];  // your signings last FA
  let draftClass = null;    // rookie class

  // Playoff bracket
  let seedsA = null;
  let seedsB = null;
  let wcWinnersA = [];
  let wcWinnersB = [];
  let divWinnersA = [];
  let divWinnersB = [];
  let confWinnersA = [];
  let confWinnersB = [];

  // ---------- Team select ----------

  function goToTeamSelect() {
    app.innerHTML = `
      <style>
        #fv2-lg-root {
          font-family: Arial, sans-serif;
          max-width: 960px;
          margin: 0 auto;
          padding: 10px;
          background: #f4f6fb;
          border: 1px solid #ccc;
          border-radius: 8px;
          font-size: 13px;
        }
        #fv2-lg-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        #fv2-lg-main {
          display: grid;
          grid-template-columns: 1.4fr 1.6fr;
          gap: 10px;
        }
        #fv2-lg-team-list, #fv2-lg-team-detail {
          background: #ffffff;
          border-radius: 6px;
          border: 1px solid #e0e0e0;
          padding: 8px;
        }
        #fv2-lg-team-list ul {
          list-style: none;
          padding: 0;
          margin: 0;
          max-height: 420px;
          overflow-y: auto;
        }
        #fv2-lg-team-list li {
          padding: 4px 6px;
          margin-bottom: 2px;
          border-radius: 4px;
          cursor: pointer;
        }
        #fv2-lg-team-list li:hover {
          background: #eef2ff;
        }
        #fv2-lg-team-list li.active {
          background: #d9e2ff;
          font-weight: bold;
        }
        #fv2-lg-roster-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        #fv2-lg-roster-table th, #fv2-lg-roster-table td {
          border: 1px solid #ddd;
          padding: 3px 4px;
          text-align: left;
        }
        #fv2-lg-roster-table th {
          background: #eef2ff;
        }
        .fv2-lg-small {
          font-size: 11px;
          color: #555;
        }
      </style>

      <div id="fv2-lg-root">
        <div id="fv2-lg-header">
          <h2>Select Your Franchise (v2)</h2>
          <div class="fv2-lg-small">
            Full schedule, 4-round playoffs, FA + draft big board.
          </div>
        </div>
        <div id="fv2-lg-main">
          <div id="fv2-lg-team-list">
            <strong>Teams</strong>
            <ul id="fv2-lg-team-ul"></ul>
          </div>
          <div id="fv2-lg-team-detail">
            <div id="fv2-lg-team-meta"></div>
            <table id="fv2-lg-roster-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Side</th>
                  <th>Pos</th>
                  <th>Name</th>
                  <th>Age</th>
                  <th>Dev</th>
                  <th>OVR</th>
                  <th>Years</th>
                  <th>Salary ($M)</th>
                </tr>
              </thead>
              <tbody id="fv2-lg-roster-body"></tbody>
            </table>
            <button id="fv2-lg-continue">Set as My Team & Continue</button>
          </div>
        </div>
      </div>
    `;

    const teamUl = document.getElementById("fv2-lg-team-ul");
    const rosterBody = document.getElementById("fv2-lg-roster-body");
    const metaDiv = document.getElementById("fv2-lg-team-meta");
    const continueBtn = document.getElementById("fv2-lg-continue");

    function teamById(id) {
      return league.find(t => t.id === id);
    }

    function drawTeamList() {
      teamUl.innerHTML = "";
      league.forEach(team => {
        const li = document.createElement("li");
        li.textContent = `${team.abbr} – ${team.name} (Conf ${team.conference} / ${team.division})`;
        if (team.id === selectedTeamId) li.classList.add("active");
        li.addEventListener("click", () => {
          selectedTeamId = team.id;
          drawTeamList();
          drawDetail();
        });
        teamUl.appendChild(li);
      });
    }

    function drawDetail() {
      const team = teamById(selectedTeamId);
      if (!team) return;
      const overall = fv2CalcTeamOverall(team);
      const off = fv2CalcSideOverall(team, "Offense");
      const def = fv2CalcSideOverall(team, "Defense");
      const cap = fv2CapUsed(team);

      metaDiv.innerHTML = `
        <div><strong>${team.name}</strong> (${team.abbr})</div>
        <div>Conference ${team.conference}, ${team.division} Division</div>
        <div>Team OVR: ${overall.toFixed(1)} | Off: ${off.toFixed(1)} | Def: ${def.toFixed(1)}</div>
        <div>Approx. Cap Used: $${cap.toFixed(1)}M</div>
      `;

      rosterBody.innerHTML = "";
      team.roster.forEach((p, idx) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${idx + 1}</td>
          <td>${p.side}</td>
          <td>${p.pos}</td>
          <td>${p.name}</td>
          <td>${p.age}</td>
          <td>${p.dev}</td>
          <td>${p.ovr}</td>
          <td>${p.years}</td>
          <td>${p.salary.toFixed(1)}</td>
        `;
        rosterBody.appendChild(tr);
      });
    }

    drawTeamList();
    drawDetail();

    continueBtn.addEventListener("click", () => {
      controlledTeamId = selectedTeamId;
      goToMainFranchise();
    });
  }

  // ---------- Sim helpers ----------

  function fv2SimGame(homeTeam, awayTeam, isPlayoff, roundLabel) {
    const o1 = fv2CalcTeamOverall(homeTeam);
    const o2 = fv2CalcTeamOverall(awayTeam);
    const diff = o1 - o2;
    const baseProb = 0.5 + (diff / 35); // stronger edge for better team [web:245]
    const homeWinProb = Math.max(0.15, Math.min(0.85, baseProb));

    const roll = Math.random();
    const homeWon = roll < homeWinProb;

    let homeScore = Math.round( fv2RandomRange(17, 34) + o1 / 10 );
    let awayScore = Math.round( fv2RandomRange(13, 30) + o2 / 10 );

    if (homeWon && homeScore <= awayScore) homeScore = awayScore + 1;
    if (!homeWon && awayScore <= homeScore) awayScore = homeScore + 1;

    if (homeWon) {
      homeTeam.record.wins++;
      awayTeam.record.losses++;
    } else {
      awayTeam.record.wins++;
      homeTeam.record.losses++;
    }

    const game = {
      id: games.length,
      week: currentWeek,
      phase,
      round: roundLabel || null,
      homeId: homeTeam.id,
      awayId: awayTeam.id,
      homeScore,
      awayScore,
      isPlayoff
    };
    games.push(game);

    return {
      winnerId: homeWon ? homeTeam.id : awayTeam.id
    };
  }

  function simulateRegularWeek() {
    const weekIndex = currentWeek - 1;
    const weekGames = schedule[weekIndex] || [];
    weekGames.forEach(pair => {
      const home = league.find(t => t.id === pair.homeId);
      const away = league.find(t => t.id === pair.awayId);
      if (home && away) {
        fv2SimGame(home, away, false, null);
      }
    });
  }

  function simulatePlayoffRound() {
    const confATeams = league.filter(t => t.conference === "A");
    const confBTeams = league.filter(t => t.conference === "B");

    if (!seedsA || !seedsB) {
      seedsA = fv2ComputeSeeds(confATeams);
      seedsB = fv2ComputeSeeds(confBTeams);
      playoffRound = "WC";
    }

    const roundLabel =
      playoffRound === "WC" ? "Wildcard" :
      playoffRound === "DIV" ? "Divisional" :
      playoffRound === "CONF" ? "Conference" :
      "Championship";

    const teamBySeed = (seedsArr, s) => {
      const obj = seedsArr.find(x => x.seed === s);
      return obj ? obj.team : null;
    };

    if (playoffRound === "WC") {
      function runWC(seedsArr, winnersOut) {
        winnersOut.length = 0;
        const s2 = teamBySeed(seedsArr, 2);
        const s7 = teamBySeed(seedsArr, 7);
        const s3 = teamBySeed(seedsArr, 3);
        const s6 = teamBySeed(seedsArr, 6);
        const s4 = teamBySeed(seedsArr, 4);
        const s5 = teamBySeed(seedsArr, 5);
        const pairs = [];
        if (s2 && s7) pairs.push([s2, s7]);
        if (s3 && s6) pairs.push([s3, s6]);
        if (s4 && s5) pairs.push([s4, s5]);
        pairs.forEach(([home, away]) => {
          const res = fv2SimGame(home, away, true, roundLabel);
          winnersOut.push(league.find(t => t.id === res.winnerId));
        });
      }
      runWC(seedsA, wcWinnersA);
      runWC(seedsB, wcWinnersB);
      playoffRound = "DIV";
    } else if (playoffRound === "DIV") {
      function runDIV(seedsArr, wcWinners, winnersOut) {
        winnersOut.length = 0;
        const s1 = teamBySeed(seedsArr, 1);
        if (!s1 || wcWinners.length < 3) return;
        const [w1, w2, w3] = wcWinners;
        const pairs = [
          [s1, w1],
          [w2, w3]
        ];
        pairs.forEach(([home, away]) => {
          const res = fv2SimGame(home, away, true, roundLabel);
          winnersOut.push(league.find(t => t.id === res.winnerId));
        });
      }
      runDIV(seedsA, wcWinnersA, divWinnersA);
      runDIV(seedsB, wcWinnersB, divWinnersB);
      playoffRound = "CONF";
    } else if (playoffRound === "CONF") {
      function runCONF(divWinners, winnersOut) {
        winnersOut.length = 0;
        if (divWinners.length < 2) return;
        const [t1, t2] = divWinners;
        const res = fv2SimGame(t1, t2, true, roundLabel);
        winnersOut.push(league.find(t => t.id === res.winnerId));
      }
      runCONF(divWinnersA, confWinnersA);
      runCONF(divWinnersB, confWinnersB);
      playoffRound = "CHAMP";
    } else if (playoffRound === "CHAMP") {
      if (confWinnersA.length && confWinnersB.length) {
        const tA = confWinnersA[0];
        const tB = confWinnersB[0];
        fv2SimGame(tA, tB, true, roundLabel);
      }
      phase = "FA_OFFERS";
      playoffRound = null;
    }
  }

  function moveToOffseason() {
    freeAgents = [];
    lastFASignings = [];
    league.forEach(team => {
      const staying = [];
      team.roster.forEach(p => {
        p.age += 1;
        p.years -= 1;
        if (p.years <= 0) {
          const faPlayer = { ...p };
          faPlayer.askSalary = Math.max(3, p.salary * 1.1);
          faPlayer.askYears = 2;
          faPlayer.offers = [];
          freeAgents.push(faPlayer);
        } else {
          staying.push(p);
        }
      });
      team.roster = staying;
    });
  }

  function fv2FaOfferScore(offer, teamOverall) {
    const moneyValue = offer.salaryPerYear * offer.years;
    const bonusValue = offer.bonus || 0;
    const teamBoost = teamOverall * 0.2;
    return moneyValue + bonusValue + teamBoost;
  }

  function resolveFreeAgency() {
    lastFASignings = [];
    const yourTeam = league.find(t => t.id === controlledTeamId);
    const avgOverall = league.reduce((s,t) => s + fv2CalcTeamOverall(t), 0) / league.length;

    const remainingFA = [];
    freeAgents.forEach(p => {
      const aiOffer = {
        teamId: -1,
        salaryPerYear: p.askSalary,
        years: p.askYears,
        bonus: p.askSalary
      };
      const offers = [...p.offers, aiOffer];

      let best = null;
      let bestScore = -Infinity;
      offers.forEach(o => {
        const teamOverall = o.teamId === controlledTeamId
          ? fv2CalcTeamOverall(yourTeam)
          : avgOverall;
        const score = fv2FaOfferScore(o, teamOverall);
        if (score > bestScore) {
          bestScore = score;
          best = o;
        }
      });

      if (best && best.teamId === controlledTeamId) {
        const copy = { ...p };
        copy.salary = best.salaryPerYear;
        copy.years = best.years;
        yourTeam.roster.push(copy);
        lastFASignings.push(
          `${p.name} signed with your team for ${best.years}y / $${best.salaryPerYear.toFixed(1)}M + $${(best.bonus||0).toFixed(1)}M bonus.`
        );
      }
    });

    freeAgents = remainingFA;
  }

  // ---------- Franchise Hub ----------

  function goToMainFranchise() {
    const team = league.find(t => t.id === controlledTeamId);
    if (!team) return;

    app.innerHTML = `
      <style>
        #fv2-fr-root {
          font-family: Arial, sans-serif;
          max-width: 1100px;
          margin: 0 auto;
          padding: 10px;
          background: #f4f6fb;
          border: 1px solid #ccc;
          border-radius: 8px;
          font-size: 13px;
        }
        #fv2-fr-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        #fv2-fr-main {
          display: grid;
          grid-template-columns: 0.9fr 2.1fr;
          gap: 10px;
        }
        #fv2-fr-nav, #fv2-fr-content {
          background: #ffffff;
          border-radius: 6px;
          border: 1px solid #e0e0e0;
          padding: 8px;
        }
        #fv2-fr-nav button {
          display: block;
          width: 100%;
          margin-bottom: 4px;
          padding: 6px 8px;
          font-size: 13px;
          text-align: left;
          cursor: pointer;
        }
        #fv2-fr-nav button.active {
          background: #d9e2ff;
          font-weight: bold;
        }
        .fv2-fr-small {
          font-size: 11px;
          color: #555;
        }
        table.fv2-fr-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        table.fv2-fr-table th, table.fv2-fr-table td {
          border: 1px solid #ddd;
          padding: 3px 4px;
          text-align: left;
        }
        table.fv2-fr-table th {
          background: #eef2ff;
        }
        #fv2-fr-controls {
          margin-top: 4px;
        }
        #fv2-fr-controls button {
          padding: 4px 8px;
          font-size: 12px;
        }
        pre.fv2-bracket-block {
          background: #f9fafc;
          border: 1px solid #d0d4e0;
          border-radius: 4px;
          padding: 6px;
          font-size: 11px;
          line-height: 1.4;
          white-space: pre;
        }
      </style>

      <div id="fv2-fr-root">
        <div id="fv2-fr-header">
          <div>
            <h2>${team.name} Franchise Hub (v2)</h2>
            <div class="fv2-fr-small">
              Conference ${team.conference}, ${team.division} Division<br>
              Phase: <span id="fv2-fr-phase">${phase}</span> &nbsp; | &nbsp;
              Week <span id="fv2-fr-week">${currentWeek}</span>/${FV2_GAMES_PER_SEASON} &nbsp; | &nbsp;
              Record: <span id="fv2-fr-record">${team.record.wins}-${team.record.losses}</span>
            </div>
            <div id="fv2-fr-controls">
              <button id="fv2-fr-advance-week">Advance Week</button>
            </div>
          </div>
          <div>
            <div class="fv2-fr-small">
              Team OVR: <span id="fv2-fr-ovr"></span> |
              Off: <span id="fv2-fr-ovr-off"></span> |
              Def: <span id="fv2-fr-ovr-def"></span>
            </div>
            <div class="fv2-fr-small">
              Trade deadline after Week ${FV2_TRADE_DEADLINE_WEEK}.
            </div>
          </div>
        </div>

        <div id="fv2-fr-main">
          <div id="fv2-fr-nav">
            <button data-page="roster" class="active">Roster</button>
            <button data-page="schedule">Schedule</button>
            <button data-page="fa">Free Agency</button>
            <button data-page="standings">Standings</button>
            <button data-page="playoffs">Playoff Picture</button>
            <button data-page="draft">Draft Board</button>
          </div>
          <div id="fv2-fr-content"></div>
        </div>
      </div>
    `;

    const navButtons = Array.from(document.querySelectorAll("#fv2-fr-nav button"));
    const contentDiv = document.getElementById("fv2-fr-content");
    const advanceWeekBtn = document.getElementById("fv2-fr-advance-week");

    function updateFranchiseHeader() {
      const t = league.find(x => x.id === controlledTeamId);
      if (!t) return;
      const overall = fv2CalcTeamOverall(t);
      const off = fv2CalcSideOverall(t, "Offense");
      const def = fv2CalcSideOverall(t, "Defense");
      document.getElementById("fv2-fr-ovr").textContent = overall.toFixed(1);
      document.getElementById("fv2-fr-ovr-off").textContent = off.toFixed(1);
      document.getElementById("fv2-fr-ovr-def").textContent = def.toFixed(1);
      document.getElementById("fv2-fr-week").textContent = currentWeek;
      document.getElementById("fv2-fr-record").textContent = `${t.record.wins}-${t.record.losses}`;
      document.getElementById("fv2-fr-phase").textContent = phase;
    }

    function setActivePage(page) {
      navButtons.forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-page") === page);
      });
      if (page === "roster") renderRosterPage();
      else if (page === "schedule") renderSchedulePage();
      else if (page === "fa") renderFreeAgencyPage();
      else if (page === "standings") renderStandingsPage();
      else if (page === "playoffs") renderPlayoffPicturePage();
      else if (page === "draft") renderDraftPage();
    }

    navButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        setActivePage(btn.getAttribute("data-page"));
      });
    });

    advanceWeekBtn.addEventListener("click", () => {
      if (phase === "REGULAR") {
        if (currentWeek < FV2_GAMES_PER_SEASON) {
          simulateRegularWeek();
          currentWeek++;
        } else {
          phase = "PLAYOFFS";
          playoffRound = null;
          seedsA = null; seedsB = null;
          wcWinnersA = []; wcWinnersB = [];
          divWinnersA = []; divWinnersB = [];
          confWinnersA = []; confWinnersB = [];
        }
      } else if (phase === "PLAYOFFS") {
        simulatePlayoffRound();
        if (phase === "FA_OFFERS") {
          moveToOffseason();
        }
      } else if (phase === "FA_OFFERS") {
        resolveFreeAgency();
        phase = "FA_RESULTS";
      } else if (phase === "FA_RESULTS") {
        phase = "DRAFT";
        if (!draftClass) draftClass = generateDraftClassV2();
      } else if (phase === "DRAFT") {
        currentWeek = 1;
        league.forEach(t => {
          t.record.wins = 0;
          t.record.losses = 0;
        });
        games = [];
        phase = "REGULAR";
      }

      updateFranchiseHeader();
      const active = navButtons.find(b => b.classList.contains("active"));
      if (active) setActivePage(active.getAttribute("data-page"));
    });

    function renderRosterPage() {
      const t = league.find(x => x.id === controlledTeamId);
      contentDiv.innerHTML = `
        <h3>Roster</h3>
        <table class="fv2-fr-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Side</th>
              <th>Pos</th>
              <th>Name</th>
              <th>Age</th>
              <th>Dev</th>
              <th>OVR</th>
              <th>Years</th>
              <th>Salary ($M)</th>
            </tr>
          </thead>
          <tbody id="fv2-fr-roster-body"></tbody>
        </table>
      `;
      const body = document.getElementById("fv2-fr-roster-body");
      t.roster.forEach((p, idx) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${idx + 1}</td>
          <td>${p.side}</td>
          <td>${p.pos}</td>
          <td>${p.name}</td>
          <td>${p.age}</td>
          <td>${p.dev}</td>
          <td>${p.ovr}</td>
          <td>${p.years}</td>
          <td>${p.salary.toFixed(1)}</td>
        `;
        body.appendChild(tr);
      });
    }

    function renderSchedulePage() {
      const yourTeamId = controlledTeamId;
      const teamGames = games.filter(g => g.homeId === yourTeamId || g.awayId === yourTeamId);

      contentDiv.innerHTML = `
        <h3>Schedule & Results</h3>
        <p class="fv2-fr-small">
          All completed games involving your team, including playoffs.
        </p>
        <table class="fv2-fr-table">
          <thead>
            <tr>
              <th>Phase</th>
              <th>Week/Round</th>
              <th>Opponent</th>
              <th>Home/Away</th>
              <th>Score</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody id="fv2-fr-schedule-body"></tbody>
        </table>
      `;
      const body = document.getElementById("fv2-fr-schedule-body");

      teamGames.forEach(g => {
        const homeTeam = league.find(t => t.id === g.homeId);
        const awayTeam = league.find(t => t.id === g.awayId);
        const youAreHome = g.homeId === yourTeamId;
        const opp = youAreHome ? awayTeam : homeTeam;
        const yourScore = youAreHome ? g.homeScore : g.awayScore;
        const oppScore = youAreHome ? g.awayScore : g.homeScore;
        const result =
          yourScore > oppScore ? "W" :
          yourScore < oppScore ? "L" : "T";

        const phaseLabel = g.isPlayoff ? "PLAYOFFS" : "REGULAR";
        const roundLabel = g.isPlayoff && g.round ? g.round : `Week ${g.week}`;
        const haLabel = youAreHome ? "Home" : "Away";

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${phaseLabel}</td>
          <td>${roundLabel}</td>
          <td>${opp.abbr}</td>
          <td>${haLabel}</td>
          <td>${yourScore}–${oppScore}</td>
          <td>${result}</td>
        `;
        body.appendChild(tr);
      });
    }

    function renderFreeAgencyPage() {
      if (phase !== "FA_OFFERS" && phase !== "FA_RESULTS") {
        contentDiv.innerHTML = `
          <h3>Free Agency</h3>
          <p class="fv2-fr-small">
            Free agency runs in the offseason after the playoffs.
          </p>
        `;
        return;
      }

      const isOffersWeek = phase === "FA_OFFERS";
      const phaseText = isOffersWeek ? "Free Agency Week" : "Free Agency Results Week";

      contentDiv.innerHTML = `
        <h3>${phaseText}</h3>
        <p class="fv2-fr-small">
          During Free Agency Week you can offer salary and bonus to free agents.
          In Results Week, they choose between your offer and a league market offer.
        </p>
        <div style="display:grid;grid-template-columns:2fr 1fr;gap:10px;">
          <div>
            <table class="fv2-fr-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Pos</th>
                  <th>Name</th>
                  <th>Age</th>
                  <th>Dev</th>
                  <th>OVR</th>
                  <th>Ask ($M)</th>
                  <th>Ask Yrs</th>
                  <th>Your Offer</th>
                </tr>
              </thead>
              <tbody id="fv2-fr-fa-body"></tbody>
            </table>
          </div>
          <div id="fv2-fr-fa-offer-panel">
            ${isOffersWeek ? `
            <h4>Your Offer</h4>
            <p class="fv2-fr-small">
              Select a free agent on the left, then set salary, years, and bonus.
            </p>
            <div>Salary/yr ($M): <input id="fv2-fr-fa-salary" type="number" step="0.5" value="5"></div>
            <div>Years: <input id="fv2-fr-fa-years" type="number" step="1" value="2"></div>
            <div>Bonus ($M): <input id="fv2-fr-fa-bonus" type="number" step="0.5" value="2"></div>
            <button id="fv2-fr-fa-make-offer">Make Offer</button>
            <div id="fv2-fr-fa-message" class="fv2-fr-small"></div>
            ` : `
            <h4>Results</h4>
            <p class="fv2-fr-small">
              These are the players you signed this FA cycle.
            </p>
            <div id="fv2-fr-fa-results-log" class="fv2-fr-small"></div>
            `}
          </div>
        </div>
      `;

      const body = document.getElementById("fv2-fr-fa-body");
      let selectedIndex = 0;

      function renderRows() {
        body.innerHTML = "";
        freeAgents.forEach((p, idx) => {
          const yourOffer = p.offers.find(o => o.teamId === controlledTeamId);
          const offerText = yourOffer
            ? `${yourOffer.years}y / $${yourOffer.salaryPerYear.toFixed(1)}M + $${(yourOffer.bonus||0).toFixed(1)}M`
            : "-";
          const tr = document.createElement("tr");
          if (idx === selectedIndex) tr.style.background = "#e4ecff";
          tr.innerHTML = `
            <td>${idx + 1}</td>
            <td>${p.pos}</td>
            <td>${p.name}</td>
            <td>${p.age}</td>
            <td>${p.dev}</td>
            <td>${p.ovr}</td>
            <td>${p.askSalary.toFixed(1)}</td>
            <td>${p.askYears}</td>
            <td>${offerText}</td>
          `;
          tr.addEventListener("click", () => {
            selectedIndex = idx;
            renderRows();
          });
          body.appendChild(tr);
        });
      }

      renderRows();

      if (isOffersWeek) {
        const salaryInput = document.getElementById("fv2-fr-fa-salary");
        const yearsInput = document.getElementById("fv2-fr-fa-years");
        const bonusInput = document.getElementById("fv2-fr-fa-bonus");
        const makeOfferBtn = document.getElementById("fv2-fr-fa-make-offer");
        const msgDiv = document.getElementById("fv2-fr-fa-message");

        makeOfferBtn.addEventListener("click", () => {
          const p = freeAgents[selectedIndex];
          if (!p) return;
          const salary = parseFloat(salaryInput.value) || p.askSalary;
          const years = parseInt(yearsInput.value,10) || p.askYears;
          const bonus = parseFloat(bonusInput.value) || 0;

          const existingIdx = p.offers.findIndex(o => o.teamId === controlledTeamId);
          const offer = { teamId: controlledTeamId, salaryPerYear: salary, years, bonus };
          if (existingIdx >= 0) {
            p.offers[existingIdx] = offer;
          } else {
            p.offers.push(offer);
          }
          msgDiv.textContent = `You offered ${p.name} ${years}y / $${salary.toFixed(1)}M + $${bonus.toFixed(1)}M bonus.`;
          renderRows();
        });
      } else {
        const logDiv = document.getElementById("fv2-fr-fa-results-log");
        if (!lastFASignings.length) {
          logDiv.textContent = "You did not sign any players this free agency.";
        } else {
          logDiv.textContent = lastFASignings.join("\n");
        }
      }
    }

    function renderStandingsPage() {
      const byConf = { A: {}, B: {} };
      ["East","North","South","West"].forEach(div => {
        byConf.A[div] = [];
        byConf.B[div] = [];
      });

      league.forEach(t => {
        byConf[t.conference][t.division].push(t);
      });

      function sortDivision(arr) {
        arr.sort((a,b) => {
          const wa = a.record.wins, wb = b.record.wins;
          const la = a.record.losses, lb = b.record.losses;
          if (wa !== wb) return wb - wa;
          if (la !== lb) return la - lb;
          return fv2CalcTeamOverall(b) - fv2CalcTeamOverall(a);
        });
      }

      ["A","B"].forEach(conf => {
        ["East","North","South","West"].forEach(div => {
          sortDivision(byConf[conf][div]);
        });
      });

      const confATeams = league.filter(t => t.conference === "A");
      const confBTeams = league.filter(t => t.conference === "B");

      const seedsAStand = fv2ComputeSeeds(confATeams);
      const seedsBStand = fv2ComputeSeeds(confBTeams);

      contentDiv.innerHTML = `
        <h3>Standings & Seeds</h3>
        <p class="fv2-fr-small">
          Seeds 1–4 are division winners; seeds 5–7 are wildcards (best non-division winners).
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div id="fv2-fr-standings-A"></div>
          <div id="fv2-fr-standings-B"></div>
        </div>
      `;

      function renderConference(confName, containerId, confTeams, byDiv, seedsArr) {
        const container = document.getElementById(containerId);
        let html = `<h4>Conference ${confName}</h4>`;

        ["East","North","South","West"].forEach(div => {
          const divTeams = byDiv[confName][div];
          if (!divTeams || !divTeams.length) return;
          html += `<h5>${div} Division</h5>`;
          html += `
            <table class="fv2-fr-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>W</th>
                  <th>L</th>
                  <th>Seed</th>
                </tr>
              </thead>
              <tbody>
          `;
          divTeams.forEach(t => {
            const seedObj = seedsArr.find(s => s.team.id === t.id);
            const seedText = seedObj ? seedObj.seed : "";
            html += `
              <tr>
                <td>${t.abbr}</td>
                <td>${t.record.wins}</td>
                <td>${t.record.losses}</td>
                <td>${seedText}</td>
              </tr>
            `;
          });
          html += `</tbody></table>`;
        });

        container.innerHTML = html;
      }

      renderConference("A", "fv2-fr-standings-A", confATeams, byConf, seedsAStand);
      renderConference("B", "fv2-fr-standings-B", confBTeams, byConf, seedsBStand);
    }

    function renderPlayoffPicturePage() {
      const confATeams = league.filter(t => t.conference === "A");
      const confBTeams = league.filter(t => t.conference === "B");

      const seedsAView = seedsA || fv2ComputeSeeds(confATeams);
      const seedsBView = seedsB || fv2ComputeSeeds(confBTeams);

      function seedLabel(seedsArr, num) {
        const s = seedsArr.find(x => x.seed === num);
        if (!s) return `Seed ${num}: TBD`;
        return `Seed ${num}: ${s.team.abbr} (${s.team.record.wins}-${s.team.record.losses})`;
      }

      const roundText =
        !playoffRound ? "Pre-Playoffs" :
        playoffRound === "WC" ? "Wildcard Round" :
        playoffRound === "DIV" ? "Divisional Round" :
        playoffRound === "CONF" ? "Conference Championships" :
        "Championship Game";

      contentDiv.innerHTML = `
        <h3>Playoff Picture – ${roundText}</h3>
        <p class="fv2-fr-small">
          7 teams per conference. Seed 1 gets a bye in the Wildcard round (2 vs 7, 3 vs 6, 4 vs 5).
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <h4>Conference A</h4>
            <pre class="fv2-bracket-block">
          ${seedLabel(seedsAView,1)}  (bye)

${seedLabel(seedsAView,4)} ──┐
                ├─ Divisional
${seedLabel(seedsAView,5)} ──┘

${seedLabel(seedsAView,3)} ──┐
                ├─ Divisional
${seedLabel(seedsAView,6)} ──┘

${seedLabel(seedsAView,2)} ──┐
                ├─ Divisional
${seedLabel(seedsAView,7)} ──┘

                └── Conference Champion → Championship
            </pre>
          </div>
          <div>
            <h4>Conference B</h4>
            <pre class="fv2-bracket-block">
          ${seedLabel(seedsBView,1)}  (bye)

${seedLabel(seedsBView,4)} ──┐
                ├─ Divisional
${seedLabel(seedsBView,5)} ──┘

${seedLabel(seedsBView,3)} ──┐
                ├─ Divisional
${seedLabel(seedsBView,6)} ──┘

${seedLabel(seedsBView,2)} ──┐
                ├─ Divisional
${seedLabel(seedsBView,7)} ──┘

                └── Conference Champion → Championship
            </pre>
          </div>
        </div>
      `;
    }

    function generateDraftClassV2() {
      const prospects = [];
      const positions = ["QB","RB","WR","TE","OL","DL","LB","CB","S"];
      for (let i = 0; i < 64; i++) {
        const pos = positions[Math.floor(Math.random()*positions.length)];
        const name = `Prospect ${i+1}`;
        const age = Math.floor(fv2RandomRange(21, 24));
        const scoutGrade = Math.round(fv2RandomRange(55, 90));
        const roundHint =
          scoutGrade >= 82 ? "1st" :
          scoutGrade >= 75 ? "2nd–3rd" :
          scoutGrade >= 68 ? "4th–5th" :
          "Late/UDFA";
        prospects.push({ pos, name, age, scoutGrade, roundHint });
      }
      prospects.sort((a,b) => b.scoutGrade - a.scoutGrade);
      return prospects;
    }

    function renderDraftPage() {
      if (!draftClass) {
        draftClass = generateDraftClassV2();
      }
      contentDiv.innerHTML = `
        <h3>Draft Week – Big Board</h3>
        <p class="fv2-fr-small">
          Rookie class for this offseason, sorted by scout grade.
        </p>
        <table class="fv2-fr-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Pos</th>
              <th>Name</th>
              <th>Age</th>
              <th>Scout Grade</th>
              <th>Round Hint</th>
            </tr>
          </thead>
          <tbody id="fv2-fr-draft-body"></tbody>
        </table>
      `;
      const body = document.getElementById("fv2-fr-draft-body");
      draftClass.forEach((p, idx) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${idx + 1}</td>
          <td>${p.pos}</td>
          <td>${p.name}</td>
          <td>${p.age}</td>
          <td>${p.scoutGrade}</td>
          <td>${p.roundHint}</td>
        `;
        body.appendChild(tr);
      });
    }

    setActivePage("roster");
    updateFranchiseHeader();
  }

  goToMainFranchise();
}

document.addEventListener("DOMContentLoaded", renderAppV2);
