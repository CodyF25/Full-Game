// league.js
// Step 1: 32 random teams, each with a random roster.
// You pick a team, then see its roster and basic info.

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

// Build 3-letter abbreviations
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
      roster: generateRandomRoster()
    });
  }
  return teams;
}

function calcTeamOverall(team) {
  const r = team.roster;
  const avg = r.reduce((s,p) => s + p.ovr, 0) / r.length;
  return avg.toFixed(1);
}

function capUsed(team) {
  return team.roster.reduce((s,p) => s + p.salary, 0).toFixed(1);
}

function renderApp() {
  const app = document.getElementById("app");
  const league = generateLeague();

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
    </style>

    <div id="lg-root">
      <div id="lg-header">
        <h2>NFL League – Team Select</h2>
        <div class="lg-small">Step 1: 32 random teams & rosters every time you load. Pick one as your franchise.</div>
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
        </div>
      </div>
    </div>
  `;

  const teamUl = document.getElementById("lg-team-ul");
  const rosterBody = document.getElementById("lg-roster-body");
  const metaDiv = document.getElementById("lg-team-meta");

  let selectedId = 0;

  function drawTeamList() {
    teamUl.innerHTML = "";
    league.forEach(team => {
      const li = document.createElement("li");
      li.textContent = `${team.abbr} – ${team.name}`;
      if (team.id === selectedId) li.classList.add("active");
      li.addEventListener("click", () => {
        selectedId = team.id;
        drawTeamList();
        drawDetail();
      });
      teamUl.appendChild(li);
    });
  }

  function drawDetail() {
    const team = league.find(t => t.id === selectedId);
    if (!team) return;
    const overall = calcTeamOverall(team);
    const cap = capUsed(team);

    metaDiv.innerHTML = `
      <div><strong>${team.name}</strong> (${team.abbr})</div>
      <div>Team OVR: ${overall}</div>
      <div>Approx. Cap Used: $${cap}M</div>
      <div class="lg-small">Every reload regenerates all teams & rosters. Later steps will let you take one team into franchise mode.</div>
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
}

document.addEventListener("DOMContentLoaded", renderApp);
