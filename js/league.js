// league.js
// Franchise hub with conferences/divisions, seeded standings,
// Advance Week league sim, and a live playoff picture.

const TEAM_CITY = [
  "New York","Los Angeles","Chicago","Houston","Phoenix","Philadelphia",
  "San Antonio","San Diego","Dallas","San Jose","Jacksonville","Indianapolis",
  "San Francisco","Columbus","Charlotte","Seattle","Denver","Baltimore",
  "Boston","Nashville","Detroit","Memphis","Portland","Oklahoma City",
  "Las Vegas","Louisville","Milwaukee","Albuquerque","Tucson","Fresno",
  "Sacramento","Kansas City"
];

const TEAM_NICK = [
  "Hawks","Sharks","Bulls","Lions","Titans","Rockets","Storm","Knights",
  "Warriors","Kings","Wolves","Raptors","Dragons","Raiders","Comets",
  "Guardians","Outlaws","Spartans","Rangers","Panthers","Cyclones",
  "Vipers","Phantoms","Legends","Coyotes","Pioneers","Sentinels",
  "Grizzlies","Thunder","Stars","Commanders","Rebels"
];

function makeAbbr(city, nick) {
  const fromCity = city.replace(/[^A-Z]/gi, "").toUpperCase().slice(0,2);
  const fromNick = nick.replace(/[^A-Z]/gi, "").toUpperCase().slice(0,1);
  return (fromCity + fromNick).padEnd(3,"X");
}

// Generate full league with conferences & divisions.
function generateLeague() {
  const teams = [];

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

  // Track how many teams each conference has in each division (target: 4).
  const counts = {
    A: { East: 0, North: 0, South: 0, West: 0 },
    B: { East: 0, North: 0, South: 0, West: 0 }
  };

  for (let i = 0; i < 32; i++) {
    const city = TEAM_CITY[i % TEAM_CITY.length];
    const nick = TEAM_NICK[i % TEAM_NICK.length];
    const name = city + " " + nick;
    const abbr = makeAbbr(city, nick);

    const region = regionForCity(city);

    let conference = "A";
    if (counts.A[region] >= 4 && counts.B[region] < 4) {
      conference = "B";
    } else if (counts.B[region] >= 4 && counts.A[region] < 4) {
      conference = "A";
    } else {
      conference = Math.random() < 0.5 ? "A" : "B";
      if (counts[conference][region] >= 4) {
        conference = conference === "A" ? "B" : "A";
      }
    }
    counts[conference][region]++;

    teams.push({
      id: i,
      name,
      abbr,
      city,
      conference,
      division: region,
      roster: generateRandomRoster(),  // from players.js
      picks: generateTeamPicks(),      // from trades.js
      record: { wins: 0, losses: 0 }
    });
  }
  return teams;
}

function calcTeamOverall(team) {
  const r = team.roster;
  const avg = r.reduce((s,p) => s + p.ovr, 0) / r.length;
  return avg;
}

function calcSideOverall(team, side) {
  const players = team.roster.filter(p => p.side === side);
  if (players.length === 0) return 0;
  return players.reduce((s,p) => s + p.ovr, 0) / players.length;
}

function capUsed(team) {
  return team.roster.reduce((s,p) => s + p.salary, 0);
}

/* ---------- App Root ---------- */

function renderApp() {
  const app = document.getElementById("app");
  const league = generateLeague();

  let selectedTeamId = 0;
  let controlledTeamId = null;
  let currentWeek = 1;
  const GAMES_PER_SEASON = 17;
  const TRADE_DEADLINE_WEEK = 9;

  /* -------- Team Select Screen -------- */

  function goToTeamSelect() {
    app.innerHTML = `
      <style>
        #lg-root {
          font-family: Arial, sans-serif;
          max-width: 960px;
          margin: 0 auto;
          padding: 10px;
          background: #f4f6fb;
          border: 1px solid #ccc;
          border-radius: 8px;
          font-size: 13px;
        }
        #lg-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        #lg-header h2 {
          margin: 0;
        }
        #lg-main {
          display: grid;
          grid-template-columns: 1.4fr 1.6fr;
          gap: 10px;
        }
        #lg-team-list, #lg-team-detail {
          background: #ffffff;
          border-radius: 6px;
          border: 1px solid #e0e0e0;
          padding: 8px;
        }
        #lg-team-list ul {
          list-style: none;
          padding: 0;
          margin: 0;
          max-height: 420px;
          overflow-y: auto;
        }
        #lg-team-list li {
          padding: 4px 6px;
          margin-bottom: 2px;
          border-radius: 4px;
          cursor: pointer;
        }
        #lg-team-list li:hover {
          background: #eef2ff;
        }
        #lg-team-list li.active {
          background: #d9e2ff;
          font-weight: bold;
        }
        #lg-roster-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        #lg-roster-table th, #lg-roster-table td {
          border: 1px solid #ddd;
          padding: 3px 4px;
          text-align: left;
        }
        #lg-roster-table th {
          background: #eef2ff;
        }
        .lg-small {
          font-size: 11px;
          color: #555;
        }
        #lg-continue {
          margin-top: 8px;
          padding: 6px 10px;
          font-size: 13px;
        }
      </style>

      <div id="lg-root">
        <div id="lg-header">
          <h2>Select Your Franchise</h2>
          <div class="lg-small">
            Each reload generates 32 new teams and rosters, split into two conferences and four divisions per conference.
          </div>
        </div>

        <div id="lg-main">
          <div id="lg-team-list">
            <strong>Teams</strong>
            <ul id="lg-team-ul"></ul>
          </div>
          <div id="lg-team-detail">
            <div id="lg-team-meta"></div>
            <table id="lg-roster-table">
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
              <tbody id="lg-roster-body"></tbody>
            </table>
            <button id="lg-continue">Set as My Team & Continue</button>
          </div>
        </div>
      </div>
    `;

    const teamUl = document.getElementById("lg-team-ul");
    const rosterBody = document.getElementById("lg-roster-body");
    const metaDiv = document.getElementById("lg-team-meta");
    const continueBtn = document.getElementById("lg-continue");

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
      const overall = calcTeamOverall(team);
      const off = calcSideOverall(team,"Offense");
      const def = calcSideOverall(team,"Defense");
      const cap = capUsed(team);

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

  /* -------- League sim helper (Advance Week) -------- */

  function simulateWeekResults() {
    // Pair teams arbitrarily each week: simple random round-robin feel.
    const shuffled = [...league];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 >= shuffled.length) break;
      const t1 = shuffled[i];
      const t2 = shuffled[i+1];

      const o1 = calcTeamOverall(t1);
      const o2 = calcTeamOverall(t2);
      const diff = o1 - o2;
      const baseProb = 0.5 + (diff / 50); // rough skill impact
      const homeWinProb = Math.max(0.1, Math.min(0.9, baseProb)); // clamp 10–90% [web:24][web:31]

      const roll = Math.random();
      if (roll < homeWinProb) {
        t1.record.wins++;
        t2.record.losses++;
      } else {
        t2.record.wins++;
        t1.record.losses++;
      }
    }
  }

  /* -------- Franchise Hub -------- */

  function renderSeeds(confTeams) {
    const divisions = {
      East: confTeams.filter(t => t.division === "East"),
      North: confTeams.filter(t => t.division === "North"),
      South: confTeams.filter(t => t.division === "South"),
      West: confTeams.filter(t => t.division === "West")
    };

    const winners = [];
    Object.keys(divisions).forEach(div => {
      const arr = [...divisions[div]];
      if (arr.length === 0) return;
      arr.sort((a,b) => {
        const wDiff = b.record.wins - a.record.wins;
        if (wDiff !== 0) return wDiff;
        const lDiff = a.record.losses - b.record.losses;
        if (lDiff !== 0) return lDiff;
        return calcTeamOverall(b) - calcTeamOverall(a);
      });
      winners.push(arr[0]);
    });

    winners.sort((a,b) => {
      const wDiff = b.record.wins - a.record.wins;
      if (wDiff !== 0) return wDiff;
      const lDiff = a.record.losses - b.record.losses;
      if (lDiff !== 0) return lDiff;
      return calcTeamOverall(b) - calcTeamOverall(a);
    });

    const winnerIds = new Set(winners.map(t => t.id));
    const nonWinners = confTeams.filter(t => !winnerIds.has(t.id));
    nonWinners.sort((a,b) => {
      const wDiff = b.record.wins - a.record.wins;
      if (wDiff !== 0) return wDiff;
      const lDiff = a.record.losses - b.record.losses;
      if (lDiff !== 0) return lDiff;
      return calcTeamOverall(b) - calcTeamOverall(a);
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

  function goToMainFranchise() {
    const team = league.find(t => t.id === controlledTeamId);
    if (!team) return;

    app.innerHTML = `
      <style>
        #fr-root {
          font-family: Arial, sans-serif;
          max-width: 1100px;
          margin: 0 auto;
          padding: 10px;
          background: #f4f6fb;
          border: 1px solid #ccc;
          border-radius: 8px;
          font-size: 13px;
        }
        #fr-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        #fr-header h2 {
          margin: 0;
        }
        #fr-main {
          display: grid;
          grid-template-columns: 0.9fr 2.1fr;
          gap: 10px;
        }
        #fr-nav, #fr-content {
          background: #ffffff;
          border-radius: 6px;
          border: 1px solid #e0e0e0;
          padding: 8px;
        }
        #fr-nav button {
          display: block;
          width: 100%;
          margin-bottom: 4px;
          padding: 6px 8px;
          font-size: 13px;
          text-align: left;
          cursor: pointer;
        }
        #fr-nav button.active {
          background: #d9e2ff;
          font-weight: bold;
        }
        .fr-small {
          font-size: 11px;
          color: #555;
        }
        table.fr-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        table.fr-table th, table.fr-table td {
          border: 1px solid #ddd;
          padding: 3px 4px;
          text-align: left;
        }
        table.fr-table th {
          background: #eef2ff;
        }
        #fr-controls {
          margin-top: 4px;
        }
        #fr-controls button {
          padding: 4px 8px;
          font-size: 12px;
        }
      </style>

      <div id="fr-root">
        <div id="fr-header">
          <div>
            <h2>${team.name} Franchise Hub</h2>
            <div class="fr-small">
              Conference ${team.conference}, ${team.division} Division<br>
              Week <span id="fr-week">${currentWeek}</span>/${GAMES_PER_SEASON} &nbsp; | &nbsp;
              Record: <span id="fr-record">${team.record.wins}-${team.record.losses}</span>
            </div>
            <div id="fr-controls">
              <button id="fr-advance-week">Advance Week & Sim League</button>
            </div>
          </div>
          <div>
            <div class="fr-small">
              Team OVR: <span id="fr-ovr"></span> |
              Off: <span id="fr-ovr-off"></span> |
              Def: <span id="fr-ovr-def"></span>
            </div>
            <div class="fr-small">
              Trade deadline after Week ${TRADE_DEADLINE_WEEK}.
            </div>
          </div>
        </div>

        <div id="fr-main">
          <div id="fr-nav">
            <button data-page="roster" class="active">Roster</button>
            <button data-page="trade">Trade Center</button>
            <button data-page="fa">Free Agency</button>
            <button data-page="depth">Depth Chart</button>
            <button data-page="standings">Standings</button>
            <button data-page="playoffs">Playoff Picture</button>
          </div>
          <div id="fr-content"></div>
        </div>
      </div>
    `;

    updateFranchiseHeader();

    const navButtons = Array.from(document.querySelectorAll("#fr-nav button"));
    const contentDiv = document.getElementById("fr-content");
    const advanceWeekBtn = document.getElementById("fr-advance-week");

    function setActivePage(page) {
      navButtons.forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-page") === page);
      });
      if (page === "roster") renderRosterPage();
      else if (page === "trade") renderTradeCenterPage();
      else if (page === "fa") renderFreeAgencyPage();
      else if (page === "depth") renderDepthChartPage();
      else if (page === "standings") renderStandingsPage();
      else if (page === "playoffs") renderPlayoffPicturePage();
    }

    navButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        setActivePage(btn.getAttribute("data-page"));
      });
    });

    advanceWeekBtn.addEventListener("click", () => {
      if (currentWeek >= GAMES_PER_SEASON) return;
      simulateWeekResults();
      currentWeek++;
      updateFranchiseHeader();
      // Refresh current page to reflect new records/seeds.
      const active = navButtons.find(b => b.classList.contains("active"));
      if (active) setActivePage(active.getAttribute("data-page"));
    });

    function updateFranchiseHeader() {
      const t = league.find(x => x.id === controlledTeamId);
      if (!t) return;
      const overall = calcTeamOverall(t);
      const off = calcSideOverall(t,"Offense");
      const def = calcSideOverall(t,"Defense");
      const weekSpan = document.getElementById("fr-week");
      const recordSpan = document.getElementById("fr-record");
      document.getElementById("fr-ovr").textContent = overall.toFixed(1);
      document.getElementById("fr-ovr-off").textContent = off.toFixed(1);
      document.getElementById("fr-ovr-def").textContent = def.toFixed(1);
      weekSpan.textContent = currentWeek;
      recordSpan.textContent = `${t.record.wins}-${t.record.losses}`;
    }

    function renderRosterPage() {
      const t = league.find(x => x.id === controlledTeamId);
      contentDiv.innerHTML = `
        <h3>Roster</h3>
        <table class="fr-table">
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
          <tbody id="fr-roster-body"></tbody>
        </table>
      `;
      const body = document.getElementById("fr-roster-body");
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

    function renderTradeCenterPage() {
      contentDiv.innerHTML = `
        <h3>Trade Center</h3>
        <p class="fr-small">
          This will connect to your trade value system (players + 1st–7th picks) and honor the Week ${TRADE_DEADLINE_WEEK} deadline.
        </p>
      `;
    }

    function renderFreeAgencyPage() {
      contentDiv.innerHTML = `
        <h3>Free Agency</h3>
        <p class="fr-small">
          This page will handle expiring contracts and free-agent bidding after the championship.
        </p>
      `;
    }

    function renderDepthChartPage() {
      contentDiv.innerHTML = `
        <h3>Depth Chart</h3>
        <p class="fr-small">
          Here we will later show starters and backups by position (QB1/QB2, RB1/RB2, WR1–WR3, etc.).
        </p>
      `;
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
          return calcTeamOverall(b) - calcTeamOverall(a);
        });
      }

      ["A","B"].forEach(conf => {
        ["East","North","South","West"].forEach(div => {
          sortDivision(byConf[conf][div]);
        });
      });

      const confATeams = league.filter(t => t.conference === "A");
      const confBTeams = league.filter(t => t.conference === "B");

      const seedsA = renderSeeds(confATeams);
      const seedsB = renderSeeds(confBTeams);

      contentDiv.innerHTML = `
        <h3>Standings & Seeds</h3>
        <p class="fr-small">
          Division winners are seeds 1–4; three best non-division winners are seeds 5–7 in each conference.
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div id="fr-standings-A"></div>
          <div id="fr-standings-B"></div>
        </div>
      `;

      function renderConference(confName, containerId, confTeams, byDiv, seeds) {
        const container = document.getElementById(containerId);
        let html = `<h4>Conference ${confName}</h4>`;

        ["East","North","South","West"].forEach(div => {
          const divTeams = byDiv[confName][div];
          if (!divTeams || divTeams.length === 0) return;
          html += `<h5>${div} Division</h5>`;
          html += `
            <table class="fr-table">
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
            const seedObj = seeds.find(s => s.team.id === t.id);
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

      renderConference("A", "fr-standings-A", confATeams, byConf, seedsA);
      renderConference("B", "fr-standings-B", confBTeams, byConf, seedsB);
    }

    function renderPlayoffPicturePage() {
      const confATeams = league.filter(t => t.conference === "A");
      const confBTeams = league.filter(t => t.conference === "B");

      const seedsA = renderSeeds(confATeams);
      const seedsB = renderSeeds(confBTeams);

      function seedLine(seeds, n) {
        const s = seeds.find(x => x.seed === n);
        if (!s) return `Seed ${n}: ---`;
        const t = s.team;
        return `Seed ${n}: ${t.abbr} (${t.record.wins}-${t.record.losses})`;
      }

      contentDiv.innerHTML = `
        <h3>Playoff Picture (If Season Ended Today)</h3>
        <p class="fr-small">
          Brackets are based on current records and seeding rules: 4 division winners (1–4) plus 3 wildcards (5–7) per conference.
          Updated each time you advance a week.
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <h4>Conference A</h4>
            <pre class="fr-small">
${seedLine(seedsA,1)}  (bye)

Wildcard Round:
${seedLine(seedsA,2)} vs ${seedLine(seedsA,7)}
${seedLine(seedsA,3)} vs ${seedLine(seedsA,6)}
${seedLine(seedsA,4)} vs ${seedLine(seedsA,5)}
            </pre>
          </div>
          <div>
            <h4>Conference B</h4>
            <pre class="fr-small">
${seedLine(seedsB,1)}  (bye)

Wildcard Round:
${seedLine(seedsB,2)} vs ${seedLine(seedsB,7)}
${seedLine(seedsB,3)} vs ${seedLine(seedsB,6)}
${seedLine(seedsB,4)} vs ${seedLine(seedsB,5)}
            </pre>
          </div>
        </div>
      `;
    }

    setActivePage("roster");
    updateFranchiseHeader();
  }

  goToTeamSelect();
}

document.addEventListener("DOMContentLoaded", renderApp);
