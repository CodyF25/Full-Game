// league.js
// Step 2.5: Team Select -> Continue -> Main Franchise Panel with section buttons.

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

function generateLeague() {
  const teams = [];
  for (let i = 0; i < 32; i++) {
    const city = TEAM_CITY[i % TEAM_CITY.length];
    const nick = TEAM_NICK[i % TEAM_NICK.length];
    const name = city + " " + nick;
    const abbr = makeAbbr(city, nick);

    teams.push({
      id: i,
      name,
      abbr,
      roster: generateRandomRoster(),
      picks: generateTeamPicks(), // from trades.js
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

  let selectedTeamId = 0;     // team highlighted in select screen
  let controlledTeamId = null; // team you actually control once you hit continue
  let currentWeek = 1;
  const TRADE_DEADLINE_WEEK = 9;

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
          <div class="lg-small">Each reload generates 32 new teams and rosters. Pick one, then continue.</div>
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
        li.textContent = `${team.abbr} – ${team.name}`;
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
      </style>

      <div id="fr-root">
        <div id="fr-header">
          <div>
            <h2>${team.name} Franchise Hub</h2>
            <div class="fr-small">Week <span id="fr-week">${currentWeek}</span>/17 &nbsp; | &nbsp;
              Record: <span id="fr-record">${team.record.wins}-${team.record.losses}</span>
            </div>
          </div>
          <div>
            <div class="fr-small">
              Team OVR: <span id="fr-ovr"></span> |
              Off: <span id="fr-ovr-off"></span> |
              Def: <span id="fr-ovr-def"></span>
            </div>
            <div class="fr-small">
              Trade deadline after Week ${TRADE_DEADLINE_WEEK}. (Trades disabled after that.)
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
          </div>
          <div id="fr-content"></div>
        </div>
      </div>
    `;

    updateFranchiseHeader();

    const navButtons = Array.from(document.querySelectorAll("#fr-nav button"));
    const contentDiv = document.getElementById("fr-content");

    function setActivePage(page) {
      navButtons.forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-page") === page);
      });
      if (page === "roster") renderRosterPage();
      else if (page === "trade") renderTradeCenterPage();
      else if (page === "fa") renderFreeAgencyPage();
      else if (page === "depth") renderDepthChartPage();
      else if (page === "standings") renderStandingsPage();
    }

    navButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        setActivePage(btn.getAttribute("data-page"));
      });
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

    // For now these are shells that we’ll wire to trades.js and future FA/draft logic
    function renderTradeCenterPage() {
      contentDiv.innerHTML = `
        <h3>Trade Center</h3>
        <p class="fr-small">This will hook into the existing trade value system (players + 1st–7th picks) and respect the Week ${TRADE_DEADLINE_WEEK} deadline.</p>
        <p class="fr-small">Next step: move the Step 2 Trade Center UI into this panel and bind it to your franchise team.</p>
      `;
    }

    function renderFreeAgencyPage() {
      contentDiv.innerHTML = `
        <h3>Free Agency</h3>
        <p class="fr-small">This page will open after the championship, when contracts expire and players move into the FA pool, similar to Madden’s free agency weeks.</p>
      `;
    }

    function renderDepthChartPage() {
      contentDiv.innerHTML = `
        <h3>Depth Chart</h3>
        <p class="fr-small">Here we’ll later show starters and backups by position (QB1/QB2, RB1/RB2, WR1–WR3, etc.) using your roster.</p>
      `;
    }

    function renderStandingsPage() {
      // Simple standings table placeholder: sorts by OVR for now.
      const sorted = [...league].sort((a,b) => calcTeamOverall(b) - calcTeamOverall(a));
      contentDiv.innerHTML = `
        <h3>Standings (placeholder)</h3>
        <p class="fr-small">Later this will use real season records. For now, it ranks teams by overall rating.</p>
        <table class="fr-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team</th>
              <th>OVR</th>
            </tr>
          </thead>
          <tbody id="fr-standings-body"></tbody>
        </table>
      `;
      const body = document.getElementById("fr-standings-body");
      sorted.forEach((t, idx) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${idx + 1}</td>
          <td>${t.abbr} – ${t.name}</td>
          <td>${calcTeamOverall(t).toFixed(1)}</td>
        `;
        body.appendChild(tr);
      });
    }

    setActivePage("roster");
    updateFranchiseHeader();
  }

  // Start at team select
  goToTeamSelect();
}

document.addEventListener("DOMContentLoaded", renderApp);
