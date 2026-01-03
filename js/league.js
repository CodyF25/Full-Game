// league.js
// League with 2 conferences x 4 divisions (4 teams each),
// regular season + sim, seeded playoff picture, and an offseason cycle:
// FA Offers Week -> FA Results Week (with AI competition) -> Draft Week -> next season.

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

// Generate full league with exact 4 per division in each conference.
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

  const pool = { East: [], North: [], South: [], West: [] };

  for (let i = 0; i < 32; i++) {
    const city = TEAM_CITY[i % TEAM_CITY.length];
    const nick = TEAM_NICK[i % TEAM_NICK.length];
    const name = city + " " + nick;
    const abbr = makeAbbr(city, nick);
    const region = regionForCity(city);
    pool[region].push({ id: i, city, nick, name, abbr, region });
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  Object.keys(pool).forEach(region => shuffle(pool[region]));

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

  const leagueBase = [...confMap.A, ...confMap.B];
  const finalTeams = leagueBase.slice(0,32);

  finalTeams.forEach((base, idx) => {
    teams.push({
      id: idx,
      name: base.name,
      abbr: base.abbr,
      city: base.city,
      conference: base.conference,
      division: base.division,
      roster: generateRandomRoster(),  // from players.js
      picks: generateTeamPicks(),      // from trades.js
      record: { wins: 0, losses: 0 }
    });
  });

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

  // Season phases: regular + three offseason weeks.
  let phase = "REGULAR"; 
  // "REGULAR", "FA_OFFERS", "FA_RESULTS", "DRAFT"

  // League-wide free agents after contracts expire.
  let freeAgents = [];
  // Log of FA signings for the last FA cycle.
  let lastFASignings = [];
  // Current year's rookie class (generated when entering Draft phase).
  let draftClass = null;


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
            32 teams, 2 conferences, 4 divisions each (4 teams per division).
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
      const baseProb = 0.5 + (diff / 50);
      const homeWinProb = Math.max(0.1, Math.min(0.9, baseProb)); // [web:24]

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

  /* -------- Offseason: expire contracts into FA pool -------- */

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
          faPlayer.offers = []; // holds offer objects
          freeAgents.push(faPlayer);
        } else {
          staying.push(p);
        }
      });
      team.roster = staying;
    });
  }

  /* -------- Shared helpers -------- */

  function computeSeeds(confTeams) {
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

  // FA offer score: salary*years + bonus + small boost for team overall. [web:179][web:185]
  function faOfferScore(offer, teamOverall) {
    const moneyValue = offer.salaryPerYear * offer.years;
    const bonusValue = offer.bonus || 0;
    const teamBoost = teamOverall * 0.2;
    return moneyValue + bonusValue + teamBoost;
  }

  /* -------- Franchise Hub -------- */

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
        pre.bracket-block {
          background: #f9fafc;
          border: 1px solid #d0d4e0;
          border-radius: 4px;
          padding: 6px;
          font-size: 11px;
          line-height: 1.4;
          white-space: pre;
        }
        #fr-fa-offer-panel input {
          width: 80px;
          font-size: 12px;
        }
      </style>

      <div id="fr-root">
        <div id="fr-header">
          <div>
            <h2>${team.name} Franchise Hub</h2>
            <div class="fr-small">
              Conference ${team.conference}, ${team.division} Division<br>
              Phase: <span id="fr-phase">${phase}</span> &nbsp; | &nbsp;
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

    const navButtons = Array.from(document.querySelectorAll("#fr-nav button"));
    const contentDiv = document.getElementById("fr-content");
    const advanceWeekBtn = document.getElementById("fr-advance-week");

    function updateFranchiseHeader() {
      const t = league.find(x => x.id === controlledTeamId);
      if (!t) return;
      const overall = calcTeamOverall(t);
      const off = calcSideOverall(t,"Offense");
      const def = calcSideOverall(t,"Defense");
      document.getElementById("fr-ovr").textContent = overall.toFixed(1);
      document.getElementById("fr-ovr-off").textContent = off.toFixed(1);
      document.getElementById("fr-ovr-def").textContent = def.toFixed(1);
      document.getElementById("fr-week").textContent = currentWeek;
      document.getElementById("fr-record").textContent = `${t.record.wins}-${t.record.losses}`;
      document.getElementById("fr-phase").textContent = phase;
    }

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

    // Resolve FA signings when entering FA_RESULTS.
    function resolveFreeAgency() {
      lastFASignings = [];
      const yourTeam = league.find(t => t.id === controlledTeamId);

      // AI "league" teamOverall baseline.
      const avgOverall = league.reduce((s,t) => s + calcTeamOverall(t), 0) / league.length;

      const remainingFA = [];
      freeAgents.forEach(p => {
        // Ensure an AI market offer exists.
        const aiOffer = {
          teamId: -1, // market
          salaryPerYear: p.askSalary,
          years: p.askYears,
          bonus: p.askSalary
        };
        const offers = [...p.offers, aiOffer];

        let best = null;
        let bestScore = -Infinity;
        offers.forEach(o => {
          const teamOverall = o.teamId === controlledTeamId
            ? calcTeamOverall(yourTeam)
            : avgOverall;
          const score = faOfferScore(o, teamOverall);
          if (score > bestScore) {
            bestScore = score;
            best = o;
          }
        });

        if (best && best.teamId === controlledTeamId) {
          // Sign with your team.
          const copy = { ...p };
          copy.salary = best.salaryPerYear;
          copy.years = best.years;
          yourTeam.roster.push(copy);
          lastFASignings.push(`${p.name} signed with your team for ${best.years}y / $${best.salaryPerYear.toFixed(1)}M + $${(best.bonus||0).toFixed(1)}M bonus.`);
        } else {
          // Signs elsewhere (AI) – remove from pool.
        }
      });

      freeAgents = remainingFA; // currently all signed or gone
    }

    advanceWeekBtn.addEventListener("click", () => {
      if (phase === "REGULAR") {
        if (currentWeek < GAMES_PER_SEASON) {
          simulateWeekResults();
          currentWeek++;
        } else {
          moveToOffseason();
          phase = "FA_OFFERS";
        }
      } else if (phase === "FA_OFFERS") {
        // Move into results week and resolve signings.
        resolveFreeAgency();
        phase = "FA_RESULTS";
          } else if (phase === "FA_RESULTS") {
        // Results week -> draft week.
        phase = "DRAFT";
        // Generate rookie class for this offseason.
        draftClass = generateDraftClass();
      } else if (phase === "DRAFT") {

        // Draft done -> reset for next season.
        currentWeek = 1;
        league.forEach(t => {
          t.record.wins = 0;
          t.record.losses = 0;
        });
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
          Placeholder: will connect to your player + pick trade system with a Week ${TRADE_DEADLINE_WEEK} deadline.
        </p>
      `;
    }

    function renderFreeAgencyPage() {
      if (phase !== "FA_OFFERS" && phase !== "FA_RESULTS") {
        contentDiv.innerHTML = `
          <h3>Free Agency</h3>
          <p class="fr-small">
            Free agency runs in the offseason after Week ${GAMES_PER_SEASON}.
            Finish the season and advance into FA to see the available players.
          </p>
        `;
        return;
      }

      const isOffersWeek = phase === "FA_OFFERS";
      const phaseText = isOffersWeek ? "Free Agency Week" : "Free Agency Results Week";

      contentDiv.innerHTML = `
        <h3>${phaseText}</h3>
        <p class="fr-small">
          During Free Agency Week you can offer salary and bonus to free agents.
          In Results Week, they choose between your offer and a league market offer.
        </p>
        <div style="display:grid;grid-template-columns:2fr 1fr;gap:10px;">
          <div>
            <table class="fr-table">
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
              <tbody id="fr-fa-body"></tbody>
            </table>
          </div>
          <div id="fr-fa-offer-panel">
            ${isOffersWeek ? `
            <h4>Your Offer</h4>
            <p class="fr-small">
              Select a free agent on the left, then set salary, years, and bonus.
            </p>
            <div>Salary/yr ($M): <input id="fr-fa-salary" type="number" step="0.5" value="5"></div>
            <div>Years: <input id="fr-fa-years" type="number" step="1" value="2"></div>
            <div>Bonus ($M): <input id="fr-fa-bonus" type="number" step="0.5" value="2"></div>
            <button id="fr-fa-make-offer">Make Offer</button>
            <div id="fr-fa-message" class="fr-small"></div>
            ` : `
            <h4>Results</h4>
            <p class="fr-small">
              These are the players you signed this FA cycle.
            </p>
            <div id="fr-fa-results-log" class="fr-small"></div>
            `}
          </div>
        </div>
      `;

      const body = document.getElementById("fr-fa-body");

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
        const salaryInput = document.getElementById("fr-fa-salary");
        const yearsInput = document.getElementById("fr-fa-years");
        const bonusInput = document.getElementById("fr-fa-bonus");
        const makeOfferBtn = document.getElementById("fr-fa-make-offer");
        const msgDiv = document.getElementById("fr-fa-message");

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
        // Results week: show summary of your signings.
        const logDiv = document.getElementById("fr-fa-results-log");
        if (!lastFASignings.length) {
          logDiv.textContent = "You did not sign any players this free agency.";
        } else {
          logDiv.textContent = lastFASignings.join("\n");
        }
      }
    }

    function renderDepthChartPage() {
      contentDiv.innerHTML = `
        <h3>Depth Chart</h3>
        <p class="fr-small">
          Placeholder for starters/backups by position.
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

      const seedsA = computeSeeds(confATeams);
      const seedsB = computeSeeds(confBTeams);

      contentDiv.innerHTML = `
        <h3>Standings & Seeds</h3>
        <p class="fr-small">
          Seeds 1–4 are division winners; seeds 5–7 are wildcards (best non-division winners).
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
      if (phase === "DRAFT") {
        // Draft board view (no picking yet).
        if (!draftClass) {
          draftClass = generateDraftClass();
        }

        contentDiv.innerHTML = `
          <h3>Draft Week – Big Board</h3>
          <p class="fr-small">
            This is the rookie class for this offseason, sorted by scout grade.
            Next step will add team draft order and actual selections.
          </p>
          <table class="fr-table">
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
            <tbody id="fr-draft-body"></tbody>
          </table>
        `;

        const body = document.getElementById("fr-draft-body");
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
        return;
      }

      // Normal playoff picture (non-draft phases).
      const confATeams = league.filter(t => t.conference === "A");
      const confBTeams = league.filter(t => t.conference === "B");

      function computeSeeds(confTeams) {
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
            return calcTeamOverall(b) - calcTeamOverall(a);
          });
          if (arr.length > 0) {
            winners.push(arr[0]);
          }
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

      const seedsA = computeSeeds(confATeams);
      const seedsB = computeSeeds(confBTeams);

      function seedLabel(seeds, num) {
        const s = seeds.find(x => x.seed === num);
        if (!s) return `Seed ${num}: TBD`;
        return `Seed ${num}: ${s.team.abbr} (${s.team.record.wins}-${s.team.record.losses})`;
      }

      contentDiv.innerHTML = `
        <h3>Playoff Picture (If Season Ended Today)</h3>
        <p class="fr-small">
          Bracket view: 7 teams per conference. Seed 1 gets a bye; wildcard round is 2 vs 7, 3 vs 6, 4 vs 5.
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <h4>Conference A</h4>
            <pre class="bracket-block">
          ${seedLabel(seedsA,1)}  (bye)

${seedLabel(seedsA,4)} ──┐
                ├─ Divisional
${seedLabel(seedsA,5)} ──┘

${seedLabel(seedsA,3)} ──┐
                ├─ Divisional
${seedLabel(seedsA,6)} ──┘

${seedLabel(seedsA,2)} ──┐
                ├─ Divisional
${seedLabel(seedsA,7)} ──┘

                └── Conference Champion → Super Bowl
            </pre>
          </div>
          <div>
            <h4>Conference B</h4>
            <pre class="bracket-block">
          ${seedLabel(seedsB,1)}  (bye)

${seedLabel(seedsB,4)} ──┐
                ├─ Divisional
${seedLabel(seedsB,5)} ──┘

${seedLabel(seedsB,3)} ──┐
                ├─ Divisional
${seedLabel(seedsB,6)} ──┘

${seedLabel(seedsB,2)} ──┐
                ├─ Divisional
${seedLabel(seedsB,7)} ──┘

                └── Conference Champion → Super Bowl
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
