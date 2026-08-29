const express = require("express");
const fs = require("fs");
const path = require("path");
const { buildDatabase, marketValue } = require("./players");
const { NATIONS, LEAGUES, DOMESTIC_CUPS, ACADEMY_NAMES } = require("./world_pack");

const app = express();
app.use(express.json());
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const SAVE_FILE = path.join(__dirname, "games.json");
let games = {};
try { games = JSON.parse(fs.readFileSync(SAVE_FILE, "utf8")); } catch (e) { games = {}; }

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFile(SAVE_FILE, JSON.stringify(games), () => {});
  }, 500);
}

const BIG_CLUBS = ["Man City", "Liverpool", "Arsenal", "Chelsea", "Man United", "Tottenham", "Newcastle",
  "Real Madrid", "Barcelona", "Atletico Madrid", "Bayern Munich", "Borussia Dortmund", "PSG",
  "Juventus", "Inter Milan", "AC Milan", "Napoli", "Al-Hilal", "Al-Nassr", "Al-Ittihad"];
const TACTICS = ["attacking", "balanced", "defensive"];
const PLAYABLE = Object.keys(LEAGUES).filter(l => LEAGUES[l].playable);
const TOTAL_ROUNDS = 38;

// European spots by final league position (0 based slices into the table).
const EURO_SLOTS = {
  ucl:  { "Premier League": [0, 3], "La Liga": [0, 3], "Serie A": [0, 2], "Bundesliga": [0, 2], "Ligue 1": [0, 2], "Eredivisie": [0, 1], "Primeira Liga": [0, 1], "Belgian Pro League": [0, 1], "Scottish Premiership": [0, 1] },
  uel:  { "Premier League": [3, 3], "La Liga": [3, 2], "Serie A": [2, 2], "Bundesliga": [2, 2], "Ligue 1": [2, 2], "Eredivisie": [1, 1], "Primeira Liga": [1, 1], "Belgian Pro League": [1, 1], "Super Lig": [0, 2] },
  uecl: { "Premier League": [6, 2], "La Liga": [5, 2], "Serie A": [4, 2], "Bundesliga": [4, 2], "Ligue 1": [4, 2], "Eredivisie": [2, 2], "Primeira Liga": [2, 2], "Super Lig": [2, 1], "Scottish Premiership": [1, 1] }
};

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "_"); }

function clubStrength(game, teamName) {
  const xi = bestXI(game, teamName);
  return xi.reduce((s, p) => s + p.rating, 0) / (xi.length || 1);
}

// ---------- cups ----------
function pairUp(teams) {
  return teams.reduce((acc, t, i) => {
    if (i % 2 === 0) acc.push({ home: t, away: null, hg: null, ag: null, pens: false, winner: null });
    else acc[acc.length - 1].away = t;
    return acc;
  }, []);
}

function nameForMatches(matchCount) {
  return matchCount >= 16 ? "Round of 32" : matchCount === 8 ? "Round of 16" : matchCount === 4 ? "Quarter-finals" : matchCount === 2 ? "Semi-finals" : matchCount === 1 ? "Final" : "First round";
}

// Any entrant count works: extra teams get first round byes down to a power of two bracket.
function makeCup(key, title, weeks, teams, prizes, scope) {
  const t = shuffle([...teams]);
  let pow = 1;
  while (pow * 2 <= t.length) pow *= 2;
  const tieTeams = (t.length - pow) * 2;
  const inRound1 = tieTeams > 0 ? t.slice(0, tieTeams) : t;
  const byes = tieTeams > 0 ? t.slice(tieTeams) : [];
  const round1 = pairUp(inRound1);
  return {
    key, title, weeks, scope: scope || "club",
    prizeWin: prizes.win, prizeTrophy: prizes.trophy,
    roundIdx: 0, rounds: [round1],
    roundNames: [tieTeams > 0 ? "First round" : nameForMatches(round1.length)],
    byes, winner: null
  };
}

function leagueClubs(game, league) {
  return Object.values(game.clubs).filter(c => c.league === league).map(c => c.name);
}

function rankedByStrength(game, league) {
  return leagueClubs(game, league).sort((a, b) => clubStrength(game, b) - clubStrength(game, a));
}

// Uses last season's tables when they exist, squad strength in season one.
function euroTeams(game, comp) {
  const teams = [];
  for (const [league, [start, count]] of Object.entries(EURO_SLOTS[comp])) {
    const order = (game.lastTables && game.lastTables[league]) ? game.lastTables[league] : rankedByStrength(game, league);
    teams.push(...order.slice(start, start + count));
  }
  return teams;
}

function makeAllCups(game) {
  const cups = {};
  cups.efl = makeCup("efl", "EFL Cup", [3, 9, 15, 21, 26], [...leagueClubs(game, "Premier League"), ...shuffle(leagueClubs(game, "Championship")).slice(0, 12)], { win: 1, trophy: 10 });
  cups.fa = makeCup("fa", "FA Cup", [5, 12, 18, 25, 32], [...leagueClubs(game, "Premier League"), ...shuffle(leagueClubs(game, "Championship")).slice(0, 12)], { win: 2, trophy: 20 });
  for (const league of PLAYABLE) {
    if (league === "Premier League") continue;
    const meta = LEAGUES[league];
    const entrants = [...leagueClubs(game, league), ...(meta.second ? leagueClubs(game, meta.second) : [])];
    const big = entrants.length > 16;
    cups["cup_" + slug(league)] = makeCup(
      "cup_" + slug(league), DOMESTIC_CUPS[league] || (league + " Cup"),
      big ? [4, 11, 17, 24, 33] : [6, 13, 20, 28],
      entrants, big ? { win: 2, trophy: 15 } : { win: 1, trophy: 8 }
    );
  }
  cups.ucl = makeCup("ucl", "Champions League", [8, 16, 24, 31], euroTeams(game, "ucl"), { win: 6, trophy: 50 });
  cups.uel = makeCup("uel", "Europa League", [7, 15, 23, 30], euroTeams(game, "uel"), { win: 3, trophy: 25 });
  cups.uecl = makeCup("uecl", "Conference League", [6, 14, 22, 29], euroTeams(game, "uecl"), { win: 2, trophy: 12 });
  const brTop = (game.lastTables && game.lastTables["Brasileirao"]) ? game.lastTables["Brasileirao"].slice(0, 4) : rankedByStrength(game, "Brasileirao").slice(0, 4);
  const arTop = (game.lastTables && game.lastTables["Argentina"]) ? game.lastTables["Argentina"].slice(0, 4) : rankedByStrength(game, "Argentina").slice(0, 4);
  cups.libertadores = makeCup("libertadores", "Copa Libertadores", [10, 19, 29], [...brTop, ...arTop], { win: 2, trophy: 15 });
  if (game.nations && Object.keys(game.nations).length >= 4) {
    cups.intl = makeCup("intl", "International Cup", [11, 18, 26, 34], Object.keys(game.nations), { win: 0, trophy: 0 }, "intl");
  }
  return cups;
}

function humanInvolved(game, teams) {
  return teams.some(t => humanOf(game, t) || (game.nations && game.nations[t] && game.nations[t].manager));
}

function simCupsForWeek(game) {
  if (!game.cups) return;
  for (const cup of Object.values(game.cups)) {
    if (cup.winner) continue;
    if (cup.weeks[cup.roundIdx] !== game.round) continue;
    const matches = cup.rounds[cup.roundIdx];
    for (const m of matches) {
      simMatch(game, m);
      if (m.hg === m.ag) {
        m.pens = true;
        const A = strengths(game, m.home), B = strengths(game, m.away);
        const pA = (A.att + A.def) / (A.att + A.def + B.att + B.def);
        m.winner = Math.random() < pA ? m.home : m.away;
      } else {
        m.winner = m.hg > m.ag ? m.home : m.away;
      }
      const wc = game.clubs[m.winner];
      // round wins carry glory, the money comes with the trophy
    }
    const rn = (cup.roundNames && cup.roundNames[cup.roundIdx]) || nameForMatches(matches.length);
    const involved = matches.some(m => humanInvolved(game, [m.home, m.away]));
    if (involved || matches.length === 1) {
      log(game, `${cup.title.toUpperCase()} ${rn.toUpperCase()}: ` + matches.map(m => `${m.home} ${m.hg}-${m.ag}${m.pens ? " (pens: " + m.winner + ")" : ""} ${m.away}`).join(" | "));
    }
    const winners = matches.map(m => m.winner);
    const pool = [...winners, ...(cup.byes || [])];
    cup.byes = [];
    if (pool.length === 1) {
      cup.winner = pool[0];
      const wc = game.clubs[cup.winner];
      if (wc) {
        wc.budget = Math.round((wc.budget + 5) * 10) / 10;
        log(game, `${cup.title}: ${cup.winner} lift the trophy and bank £5m!`);
      } else {
        log(game, `${cup.title}: ${cup.winner} lift the trophy!`);
      }
    } else {
      cup.roundIdx++;
      cup.rounds.push(pairUp(shuffle(pool)));
      cup.roundNames = cup.roundNames || [];
      cup.roundNames.push(nameForMatches(pool.length / 2));
    }
  }
}

function code4() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "";
  for (let i = 0; i < 4; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return games[c] ? code4() : c;
}

function poisson(lambda) {
  let l = Math.exp(-lambda), k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > l);
  return k - 1;
}

// ---------- fixtures: double round robin, works for any even team count ----------
function makeFixtures(teamNames) {
  const teams = [...teamNames];
  const n = teams.length;
  const rounds = [];
  const arr = teams.slice(1);
  for (let r = 0; r < n - 1; r++) {
    const round = [];
    const a = [teams[0], ...arr];
    for (let i = 0; i < n / 2; i++) {
      const home = a[i], away = a[n - 1 - i];
      if (r % 2 === 0) round.push({ home, away });
      else round.push({ home: away, away: home });
    }
    rounds.push(round);
    arr.push(arr.shift());
  }
  const second = rounds.map(r => r.map(m => ({ home: m.away, away: m.home })));
  return [...rounds, ...second].map(r => r.map(m => ({ ...m, hg: null, ag: null })));
}

// ---------- team strength ----------
function bestXI(game, teamName) {
  const ids = game.clubs[teamName].squad;
  const squad = ids.map(id => game.players[id]).filter(Boolean);
  const gks = squad.filter(p => p.pos === "GK").sort((a, b) => b.rating - a.rating);
  const out = squad.filter(p => p.pos !== "GK").sort((a, b) => b.rating - a.rating);
  const xi = [];
  if (gks[0]) xi.push(gks[0]);
  xi.push(...out.slice(0, 11 - xi.length));
  return xi;
}

// Use the manager's saved lineup if it is still valid, otherwise auto pick the best XI.
function chosenXI(game, teamName) {
  const club = game.clubs[teamName];
  const lu = club.lineup;
  if (lu && Array.isArray(lu.xi) && lu.xi.length === 11) {
    const squad = new Set(club.squad);
    if (lu.xi.every(id => squad.has(id) && game.players[id])) {
      const xi = lu.xi.map(id => game.players[id]);
      if (xi.filter(p => p.pos === "GK").length === 1) return xi;
    }
  }
  return bestXI(game, teamName);
}

function nationXI(game, nationName) {
  const nation = game.nations[nationName];
  return nation.playerIds.map(id => game.players[id]).filter(Boolean)
    .sort((a, b) => b.rating - a.rating).slice(0, 11);
}

function strengths(game, teamName) {
  const isNation = game.nations && game.nations[teamName];
  const xi = isNation ? nationXI(game, teamName) : chosenXI(game, teamName);
  if (xi.length < 8) return { att: 55, def: 55 };
  const avg = arr => arr.reduce((s, p) => s + p.rating, 0) / (arr.length || 1);
  const attackers = xi.filter(p => p.pos === "FW" || p.pos === "MF");
  const defenders = xi.filter(p => p.pos === "DF" || p.pos === "GK");
  const overall = avg(xi);
  const att = attackers.length ? avg(attackers) : overall;
  const def = defenders.length ? avg(defenders) : overall;
  return { att: att * 0.7 + overall * 0.3, def: def * 0.7 + overall * 0.3 };
}

function simMatch(game, m) {
  const A = strengths(game, m.home), B = strengths(game, m.away);
  const tA = (game.clubs[m.home] || {}).tactic || "balanced";
  const tB = (game.clubs[m.away] || {}).tactic || "balanced";
  let lh = 1.42 * Math.exp((A.att - B.def) / 10);
  let la = 1.12 * Math.exp((B.att - A.def) / 10);
  if (tA === "attacking") { lh *= 1.18; la *= 1.12; }
  if (tA === "defensive") { lh *= 0.85; la *= 0.78; }
  if (tB === "attacking") { la *= 1.18; lh *= 1.12; }
  if (tB === "defensive") { la *= 0.85; lh *= 0.78; }
  m.hg = poisson(Math.min(lh, 4.2));
  m.ag = poisson(Math.min(la, 4.2));
}

function tableFor(game, league) {
  const fixtures = (game.leagueFixtures || {})[league];
  if (!fixtures) return [];
  const rows = {};
  for (const t of leagueClubs(game, league)) rows[t] = { team: t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
  for (const round of fixtures) for (const m of round) {
    if (m.hg === null) continue;
    const h = rows[m.home], a = rows[m.away];
    if (!h || !a) continue;
    h.p++; a.p++; h.gf += m.hg; h.ga += m.ag; a.gf += m.ag; a.ga += m.hg;
    if (m.hg > m.ag) { h.w++; h.pts += 3; a.l++; }
    else if (m.hg < m.ag) { a.w++; a.pts += 3; h.l++; }
    else { h.d++; a.d++; h.pts++; a.pts++; }
  }
  return Object.values(rows).sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf);
}

function log(game, text) {
  game.feed.unshift({ t: Date.now(), text });
  game.feed = game.feed.slice(0, 150);
}

// ---------- youth academy ----------
function pick1(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function addAcademyIntake(game, clubName, n) {
  const club = game.clubs[clubName];
  const region = (LEAGUES[club.league] || {}).region || "england";
  const pool = ACADEMY_NAMES[region] || ACADEMY_NAMES.england;
  for (let i = 0; i < n; i++) {
    const name = pick1(pool.first) + " " + pick1(pool.last);
    const r = Math.random();
    const pos = r < 0.1 ? "GK" : r < 0.4 ? "DF" : r < 0.75 ? "MF" : "FW";
    const age = 15 + Math.floor(Math.random() * 3);
    const rating = 54 + Math.floor(Math.random() * 13);
    const pot = Math.min(92, rating + 8 + Math.floor(Math.random() * 13));
    const id = game.playerSeq++;
    game.players[id] = { id, name, pos, age, rating, pot, academy: true, value: marketValue(rating, age, pos), club: clubName, league: club.league };
    club.academy.push(id);
  }
}

function spawnAcademy(game, clubName) {
  const club = game.clubs[clubName];
  if (!club || club.academy) return;
  if (!game.playerSeq) game.playerSeq = Math.max(...Object.keys(game.players).map(Number)) + 1;
  club.academy = [];
  addAcademyIntake(game, clubName, 4);
}

function refreshAcademies(game) {
  for (const user of Object.values(game.users)) {
    if (!user.team) continue;
    const club = game.clubs[user.team];
    if (!club.academy) { spawnAcademy(game, user.team); continue; }
    // extra growth toward potential on top of normal ageing
    for (const id of club.academy) {
      const p = game.players[id];
      if (!p) continue;
      if (p.rating < p.pot) p.rating = Math.min(p.pot, p.rating + 1 + Math.floor(Math.random() * 3));
      p.value = marketValue(p.rating, p.age, p.pos);
    }
    // kids who turn 20 without promotion are released
    const released = club.academy.filter(id => game.players[id] && game.players[id].age >= 20);
    for (const id of released) {
      log(game, `${game.players[id].name} (${user.team} academy) was released without making the first team.`);
      delete game.players[id];
    }
    club.academy = club.academy.filter(id => game.players[id]);
    addAcademyIntake(game, user.team, 2);
    // cap at 6, drop the weakest
    while (club.academy.length > 6) {
      club.academy.sort((a, b) => game.players[b].rating - game.players[a].rating);
      const cut = club.academy.pop();
      delete game.players[cut];
    }
  }
}

// ---------- game creation ----------
function newGameMarkBudgets(clubs) {
  for (const c of Object.values(clubs)) c.baseBudget = c.budget;
  return clubs;
}
function newGame(hostName) {
  const { players, clubs } = buildDatabase();
  const playerMap = {};
  players.forEach(p => playerMap[p.id] = p);
  for (const c of Object.values(clubs)) c.tactic = "balanced";
  newGameMarkBudgets(clubs);
  const premTeams = Object.values(clubs).filter(c => c.prem).map(c => c.name);
  const game = {
    code: code4(),
    host: hostName,
    users: { [hostName]: { name: hostName, team: null, nation: null } },
    players: playerMap,
    clubs,
    premTeams,
    started: false,
    season: 1,
    round: 0,
    totalRounds: TOTAL_ROUNDS,
    playerSeq: players.length + 1,
    lock: { active: false, week: 0 },
    offers: [],
    offerSeq: 1,
    stats: {},
    feed: [],
    created: Date.now()
  };
  // fixtures for every league that has clubs, playable or AI second division
  game.leagueFixtures = {};
  for (const league of Object.keys(LEAGUES)) {
    const names = leagueClubs(game, league);
    if (names.length >= 4 && names.length % 2 === 0) game.leagueFixtures[league] = makeFixtures(names);
  }
  // national teams resolved from real players in the database
  const nameIdx = {};
  players.forEach(p => { if (!(p.name in nameIdx)) nameIdx[p.name] = p.id; });
  game.nations = {};
  for (const [nation, list] of Object.entries(NATIONS)) {
    const ids = list.map(n => nameIdx[n]).filter(id => id !== undefined);
    if (ids.length >= 10) game.nations[nation] = { name: nation, playerIds: ids, manager: null };
  }
  game.cups = makeAllCups(game);
  spawnWonderkids(game);
  log(game, "Game created. Waiting in the lobby.");
  games[game.code] = game;
  save();
  return game;
}

// ---------- offers and negotiation ----------
function humanOf(game, clubName) {
  return Object.values(game.users).find(u => u.team === clubName) || null;
}

function askingPrice(game, player, sellingClub) {
  let mult = 1.2;
  if (player.rating >= 88) mult = 1.6;
  else if (player.rating >= 84) mult = 1.45;
  else if (player.rating >= 80) mult = 1.3;
  if (player.age <= 22) mult += 0.15;
  const squadSize = game.clubs[sellingClub].squad.length;
  if (squadSize <= 14) mult += 0.25;
  return Math.round(player.value * mult * 10) / 10;
}

function stripFromLineup(club, id) {
  if (!club.lineup) return;
  club.lineup.xi = (club.lineup.xi || []).filter(x => x !== id);
  club.lineup.subs = (club.lineup.subs || []).filter(x => x !== id);
}

function voidOtherOffers(game, playerId, keepId) {
  for (const o of game.offers || []) {
    if (o.playerId !== playerId || o.id === keepId) continue;
    if (["pending_seller", "countered"].includes(o.status)) {
      o.status = "void";
      o.note = "The player was sold in another deal, so this offer is dead.";
    }
  }
}

function doTransfer(game, offer) {
  const p = game.players[offer.playerId];
  if (p.club !== offer.sellerClub) return { ok: false, msg: "The player already left that club. Deal is off." };
  const buyer = game.clubs[offer.toClub];
  const seller = game.clubs[p.club];
  if (seller.squad.length <= 13) return { ok: false, msg: "The selling club can't go below 13 players." };
  if (buyer.budget < offer.fee) return { ok: false, msg: "Not enough budget to complete the deal." };
  if (buyer.squad.length >= 30) return { ok: false, msg: "Squad is full (30 max)." };
  buyer.budget = Math.round((buyer.budget - offer.fee) * 10) / 10;
  seller.budget = Math.round((seller.budget + offer.fee) * 10) / 10;
  seller.squad = seller.squad.filter(id => id !== p.id);
  stripFromLineup(seller, p.id);
  buyer.squad.push(p.id);
  const from = p.club;
  p.club = offer.toClub;
  p.league = buyer.league;
  p.listed = false;
  voidOtherOffers(game, p.id, offer.id);
  log(game, `TRANSFER: ${p.name} joins ${offer.toClub} from ${from} for £${offer.fee}m.`);
  return { ok: true };
}

function resolveAiSellerOffer(game, offer) {
  const p = game.players[offer.playerId];
  if (p.club !== offer.sellerClub) { offer.status = "void"; offer.note = "The player already left that club."; return; }
  const baseAsk = p.listed ? p.value : askingPrice(game, p, p.club);
  // AI clubs haggle: they start at the asking price but can be talked down to a
  // floor a fair way below it. Listed players go even cheaper.
  const floor = Math.round(Math.max(0.5, p.listed ? p.value * 0.8 : Math.min(p.value, baseAsk * 0.8)) * 10) / 10;
  if (offer.demand === undefined) offer.demand = baseAsk;
  if (offer.fee >= offer.demand - 0.05) {
    const buyerBig = BIG_CLUBS.includes(offer.toClub);
    if (p.rating >= 85 && p.age > 22 && !buyerBig && Math.random() < 0.45) {
      offer.status = "player_declined";
      offer.note = `${p.club} accepted £${offer.fee}m but ${p.name} turned down the move. Bigger clubs are circling.`;
      return;
    }
    const res = doTransfer(game, offer);
    offer.status = res.ok ? "accepted" : "failed";
    offer.note = res.ok ? `Deal completed at £${offer.fee}m.` : res.msg;
  } else if (offer.fee >= baseAsk * 0.4) {
    let newDemand = Math.round(((offer.demand + offer.fee) / 2) * 10) / 10;
    if (newDemand < floor) newDemand = floor;
    if (newDemand <= offer.fee) {
      offer.demand = offer.fee;
      resolveAiSellerOffer(game, offer);
      return;
    }
    offer.demand = newDemand;
    offer.status = "countered";
    offer.counterFee = newDemand;
    offer.note = newDemand <= floor + 0.05
      ? `${p.club} came down to £${newDemand}m. That is their final price, they will not go lower.`
      : `${p.club} rejected £${offer.fee}m but came down to £${newDemand}m. Keep haggling and they might drop a little more.`;
  } else {
    offer.status = "declined";
    offer.note = `${p.club} rejected £${offer.fee}m out of hand. Come back with something near £${baseAsk}m if you are serious.`;
  }
}

// ---------- transfer windows ----------
function windowOpen(game) {
  const r = game.round;
  return r <= 3 || (r >= 19 && r <= 22);
}
function windowInfo(game) {
  const r = game.round;
  if (r <= 3) return { open: true, label: "Summer window open, shuts after week 4" };
  if (r >= 19 && r <= 22) return { open: true, label: "January window open, shuts after week 23" };
  if (r < 19) return { open: false, label: "Window shut, January window opens after week 19" };
  return { open: false, label: "Window shut for the season, reopens in the summer" };
}

function aiInboundBids(game) {
  if (!windowOpen(game)) return;
  for (const user of Object.values(game.users)) {
    if (!user.team) continue;
    const club = game.clubs[user.team];
    const candidates = club.squad.map(id => game.players[id]).filter(p => p && (p.listed || p.rating >= 84));
    if (!candidates.length) continue;
    const chance = candidates.some(p => p.listed) ? 0.75 : 0.16;
    if (Math.random() > chance) continue;
    const listed = candidates.filter(p => p.listed);
    const target = (listed.length ? listed : candidates)[Math.floor(Math.random() * (listed.length ? listed.length : candidates.length))];
    const fee = Math.round(target.value * (target.listed ? (0.85 + Math.random() * 0.3) : (0.95 + Math.random() * 0.45)) * 10) / 10;
    const bidders = Object.values(game.clubs).filter(c => c.name !== user.team && !humanOf(game, c.name) && c.budget >= fee && c.squad.length < 30);
    if (!bidders.length) continue;
    bidders.sort((a, b) => b.budget - a.budget);
    const pool = target.rating >= 84 ? bidders.slice(0, 15) : bidders;
    const bidder = pool[Math.floor(Math.random() * pool.length)];
    game.offers.push({
      id: game.offerSeq++, playerId: target.id, fromClub: bidder.name, toClub: bidder.name,
      sellerClub: user.team, fee, status: "pending_seller", direction: "inbound", week: game.round
    });
    log(game, `${bidder.name} have bid £${fee}m for ${target.name} (${user.team}).`);
  }
}

function leagueAwards(game, league) {
  const rows = [];
  for (const name of leagueClubs(game, league)) {
    const club = game.clubs[name];
    if (!club) continue;
    for (const id of club.squad) {
      const st = (game.stats || {})[id];
      if (!st || (!st.g && !st.a)) continue;
      const p = game.players[id];
      if (!p) continue;
      rows.push({ id, name: p.name, club: name, pos: p.pos, g: st.g, a: st.a, score: st.g * 2 + st.a });
    }
  }
  const boot = [...rows].sort((x, y) => y.g - x.g || y.a - x.a)[0] || null;
  const ball = [...rows].sort((x, y) => y.a - x.a || y.g - x.g)[0] || null;
  const pots = [...rows].sort((x, y) => y.score - x.score)[0] || null;
  return { boot, ball, pots };
}

function statBoards(game, league) {
  const rows = [];
  for (const name of leagueClubs(game, league)) {
    const club = game.clubs[name];
    if (!club) continue;
    for (const id of club.squad) {
      const st = (game.stats || {})[id];
      if (!st || (!st.g && !st.a)) continue;
      const p = game.players[id];
      if (!p) continue;
      rows.push({ name: p.name, club: name, pos: p.pos, g: st.g, a: st.a, score: st.g * 2 + st.a });
    }
  }
  return {
    scorers: [...rows].sort((x, y) => y.g - x.g || y.a - x.a).slice(0, 5),
    assisters: [...rows].sort((x, y) => y.a - x.a || y.g - x.g).slice(0, 5),
    stars: [...rows].sort((x, y) => y.score - x.score).slice(0, 5)
  };
}

function spawnRegen(game, clubName, baseRating, forcedAge) {
  const club = game.clubs[clubName];
  if (!club) return null;
  const region = (LEAGUES[club.league] || {}).region || "england";
  const pool = ACADEMY_NAMES[region] || ACADEMY_NAMES.england;
  let name = "";
  for (let t = 0; t < 60; t++) {
    const cand = pool.first[Math.floor(Math.random() * pool.first.length)] + " " +
                 pool.last[Math.floor(Math.random() * pool.last.length)];
    if (!Object.values(game.players).some(p => p.name === cand)) { name = cand; break; }
  }
  if (!name) name = pool.first[0] + " " + pool.last[0] + " Jr";
  const pos = ["GK", "DF", "DF", "MF", "MF", "MF", "FW", "FW"][Math.floor(Math.random() * 8)];
  const age = forcedAge || (17 + Math.floor(Math.random() * 5));
  const rating = Math.max(56, Math.min(90, baseRating));
  const id = game.playerSeq++;
  const p = { id, name, pos, age, rating, value: marketValue(rating, age, pos), club: clubName, league: club.league };
  game.players[id] = p;
  club.squad.push(id);
  return p;
}

// every season a fresh batch of ready to sign kids lands on the market:
// a few at 85 to 88, the rest 82 to 85, mostly at mid table selling clubs
// so the prices are reachable and the game never runs out of talent to chase
function spawnWonderkids(game) {
  const bigHomes = BIG_CLUBS.filter(c => game.clubs[c] && !humanOf(game, c) && game.clubs[c].squad.length < 30);
  const midHomes = [];
  for (const [name, club] of Object.entries(game.clubs)) {
    if (BIG_CLUBS.includes(name) || humanOf(game, name)) continue;
    if (!(LEAGUES[club.league] || {}).playable) continue;
    if (club.squad.length >= 30) continue;
    midHomes.push(name);
  }
  const count = 10 + Math.floor(Math.random() * 5);
  const names = [];
  for (let i = 0; i < count; i++) {
    const rating = i < 3 ? 85 + Math.floor(Math.random() * 4) : 82 + Math.floor(Math.random() * 4);
    const pool = (Math.random() < 0.7 && midHomes.length) ? midHomes : (bigHomes.length ? bigHomes : midHomes);
    if (!pool.length) break;
    const home = pool[Math.floor(Math.random() * pool.length)];
    if (game.clubs[home].squad.length >= 30) continue;
    const kid = spawnRegen(game, home, rating, 18 + Math.floor(Math.random() * 4));
    if (kid) {
      names.push(`${kid.name} (${kid.rating}, ${home})`);
      log(game, `WONDERKID: ${kid.name}, ${kid.age} years old and already rated ${kid.rating}, is at ${home} and open to offers.`);
    }
  }
  if (names.length) log(game, `WONDERKID WATCH: a new batch of ${names.length} young stars just hit the market. Use the wonderkids filter in the transfer market to find them.`);
}

function endOfSeason(game) {
  const champions = {};
  game.lastTables = {};
  const historyTables = {};
  const awards = {};
  for (const league of Object.keys(game.leagueFixtures)) {
    const table = tableFor(game, league);
    if (!table.length) continue;
    champions[league] = table[0].team;
    game.lastTables[league] = table.map(r => r.team);
    historyTables[league] = table.slice(0, 4).map(r => ({ team: r.team, pts: r.pts }));
    awards[league] = leagueAwards(game, league);
    const humanHere = table.some(r => humanOf(game, r.team));
    if (league === "Premier League" || humanHere) {
      const a = awards[league];
      log(game, `${league.toUpperCase()} SEASON ${game.season}: ${table[0].team} are champions!` +
        (a.boot ? ` Golden Boot: ${a.boot.name} (${a.boot.g}).` : "") +
        (a.ball ? ` Golden Ball: ${a.ball.name} (${a.ball.a} assists).` : "") +
        (a.pots ? ` Player of the Season: ${a.pots.name}.` : ""));
    }
  }
  const cups = game.cups || {};
  const cupWinners = {};
  for (const [k, c] of Object.entries(cups)) cupWinners[k] = { title: c.title, winner: c.winner };

  // budgets reset to keep it competitive: base money back, plus 10 for a league title and 5 per cup
  for (const club of Object.values(game.clubs)) {
    club.budget = club.baseBudget !== undefined ? club.baseBudget : club.budget;
  }
  for (const league of Object.keys(champions)) {
    const champ = game.clubs[champions[league]];
    if (champ) champ.budget = Math.round((champ.budget + 10) * 10) / 10;
  }
  for (const c of Object.values(cups)) {
    const wc = c.winner && game.clubs[c.winner];
    if (wc) wc.budget = Math.round((wc.budget + 5) * 10) / 10;
  }

  game.history = game.history || [];
  game.history.push({
    season: game.season,
    champion: champions["Premier League"],
    champions,
    cupWinners,
    awards,
    eflCup: cups.efl ? cups.efl.winner : null,
    faCup: cups.fa ? cups.fa.winner : null,
    ucl: cups.ucl ? cups.ucl.winner : null,
    intl: cups.intl ? cups.intl.winner : null,
    table: tableFor(game, "Premier League").map(r => ({ team: r.team, pts: r.pts })),
    tables: historyTables
  });
  log(game, `SEASON ${game.season} OVER. Budgets reset for everyone, title winners bank £10m and cup winners £5m each. New fixtures and cup draws are in.`);
  game.season++;
  game.round = 0;
  game.stats = {};

  // ageing: young players climb all the way to 35, then the drop starts
  for (const p of Object.values(game.players)) {
    p.age++;
    const roll = Math.random();
    if (p.age <= 21) p.rating = Math.min(96, p.rating + (roll < 0.35 ? 3 : roll < 0.75 ? 2 : 1));
    else if (p.age <= 27) p.rating = Math.min(96, p.rating + (roll < 0.3 ? 2 : roll < 0.75 ? 1 : 0));
    else if (p.age <= 34) p.rating = Math.min(96, p.rating + (roll < 0.45 ? 1 : 0));
    else if (p.age === 35) { /* peak holds one last year */ }
    else p.rating = Math.max(52, p.rating - (roll < 0.35 ? 3 : 2));
    const nv = marketValue(p.rating, p.age, p.pos);
    // values climb season by season instead of teleporting, drops apply in full
    p.value = nv > p.value ? Math.min(nv, Math.round(p.value * 1.6 * 10) / 10) : nv;
  }

  // retirements make room, regens keep the world exciting
  let retired = 0, regens = 0;
  for (const club of Object.values(game.clubs)) {
    const leaving = club.squad.map(id => game.players[id]).filter(p => p && (p.age >= 39 || (p.age >= 37 && Math.random() < 0.5)));
    for (const p of leaving) {
      retired++;
      club.squad = club.squad.filter(id => id !== p.id);
      stripFromLineup(club, p.id);
      const wasStar = p.rating >= 84;
      if (humanOf(game, club.name) || wasStar) log(game, `RETIRED: ${p.name} (${p.club}) hangs up the boots at ${p.age}.`);
      delete game.players[p.id];
      const drop = p.rating >= 86 ? (2 + Math.floor(Math.random() * 5)) : (4 + Math.floor(Math.random() * 8));
      const newRating = Math.max(58, p.rating - drop);
      // regens never appear straight in a human squad, they join an AI club
      // in the same league instead. Human clubs grow talent through the academy.
      let home = club.name;
      if (humanOf(game, club.name)) {
        const aiSameLeague = leagueClubs(game, club.league).filter(n =>
          !humanOf(game, n) && game.clubs[n].squad.length < 30);
        if (!aiSameLeague.length) continue;
        home = aiSameLeague[Math.floor(Math.random() * aiSameLeague.length)];
      }
      const kid = spawnRegen(game, home, newRating);
      if (kid) {
        regens++;
        if (kid.rating >= 80) log(game, `REGEN: ${kid.name}, ${kid.age}, rated ${kid.rating}, breaks into the ${home} squad.`);
      }
    }
  }
  spawnWonderkids(game);
  if (retired) log(game, `${retired} players retired this summer and ${regens} regens stepped up.`);

  refreshNations(game);
  for (const league of Object.keys(game.leagueFixtures)) {
    game.leagueFixtures[league] = makeFixtures(leagueClubs(game, league));
  }
  game.cups = makeAllCups(game);
  refreshAcademies(game);
}

// national squads get call ups from the league most of their players are in,
// so retirements never leave a country without a team
function refreshNations(game) {
  const taken = new Set();
  for (const n of Object.values(game.nations || {})) for (const id of n.playerIds) taken.add(id);
  for (const [name, nation] of Object.entries(game.nations || {})) {
    nation.playerIds = nation.playerIds.filter(id => game.players[id]);
    if (nation.playerIds.length >= 14) continue;
    const leagueCount = {};
    for (const id of nation.playerIds) {
      const p = game.players[id];
      if (p) leagueCount[p.league] = (leagueCount[p.league] || 0) + 1;
    }
    const homeLeague = Object.entries(leagueCount).sort((a, b) => b[1] - a[1]).map(e => e[0])[0] || "Premier League";
    const candidates = Object.values(game.players)
      .filter(p => p.league === homeLeague && !taken.has(p.id) && !p.academy && p.age <= 33)
      .sort((a, b) => b.rating - a.rating);
    const before = nation.playerIds.length;
    for (const c of candidates) {
      if (nation.playerIds.length >= 16) break;
      nation.playerIds.push(c.id);
      taken.add(c.id);
    }
    const added = nation.playerIds.length - before;
    if (added > 0 && nation.manager) log(game, `${name} call up ${added} new players for the coming season.`);
  }
}

// ---------- API ----------
app.post("/api/create", (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 20);
  if (!name) return res.status(400).json({ error: "Enter a manager name." });
  const game = newGame(name);
  res.json({ code: game.code });
});

app.post("/api/join", (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 20);
  const game = games[String(req.body.code || "").toUpperCase()];
  if (!game) return res.status(404).json({ error: "Game not found. Check the code." });
  if (!name) return res.status(400).json({ error: "Enter a manager name." });
  if (!game.users[name]) {
    if (Object.keys(game.users).length >= 10) return res.status(400).json({ error: "Lobby is full." });
    game.users[name] = { name, team: null, nation: null };
    log(game, `${name} joined the game.`);
    save();
  }
  res.json({ code: game.code });
});

function migrate(game) {
  // keeps saves from the previous version of the game working on this server
  if (!game) return;
  if (game.totalRounds === undefined) game.totalRounds = TOTAL_ROUNDS;
  if (game.playerSeq === undefined) game.playerSeq = 100000;
  if (!game.lock) game.lock = { active: false, week: 0 };
  if (!game.nations) game.nations = {};
  if (!game.stats) game.stats = {};
  for (const c of Object.values(game.clubs || {})) if (c.baseBudget === undefined) c.baseBudget = c.budget;
  if (!game.cups) game.cups = {};
  for (const u of Object.values(game.users || {})) if (u.nation === undefined) u.nation = null;
  if (!game.leagueFixtures) {
    game.leagueFixtures = {};
    if (Array.isArray(game.fixtures) && game.fixtures.length) {
      game.leagueFixtures["Premier League"] = game.fixtures;
    } else {
      for (const league of Object.keys(LEAGUES)) {
        const names = leagueClubs(game, league);
        if (names.length >= 4 && names.length % 2 === 0) game.leagueFixtures[league] = makeFixtures(names);
      }
    }
  }
}

function getCtx(req, res) {
  const game = games[String(req.query.code || req.body.code || "").toUpperCase()];
  if (!game) { res.status(404).json({ error: "Game not found." }); return null; }
  migrate(game);
  const name = String(req.query.name || req.body.name || "");
  const user = game.users[name];
  if (!user) { res.status(403).json({ error: "You are not in this game." }); return null; }
  return { game, user };
}

app.post("/api/pick", (req, res) => {
  const ctx = getCtx(req, res); if (!ctx) return;
  const { game, user } = ctx;
  if (game.started) return res.status(400).json({ error: "Season already started." });
  const team = req.body.team;
  const club = game.clubs[team];
  if (!club || !(LEAGUES[club.league] || {}).playable) return res.status(400).json({ error: "Pick a club from one of the playable leagues." });
  if (humanOf(game, team) && humanOf(game, team).name !== user.name) return res.status(400).json({ error: "That club is taken." });
  user.team = team;
  spawnAcademy(game, team);
  log(game, `${user.name} will manage ${team}.`);
  save();
  res.json({ ok: true });
});

app.post("/api/nation", (req, res) => {
  const ctx = getCtx(req, res); if (!ctx) return;
  const { game, user } = ctx;
  const nation = req.body.nation;
  if (!nation) {
    if (user.nation && game.nations[user.nation]) game.nations[user.nation].manager = null;
    user.nation = null;
    save();
    return res.json({ ok: true });
  }
  const n = (game.nations || {})[nation];
  if (!n) return res.status(400).json({ error: "That national team is not in this game." });
  if (n.manager && n.manager !== user.name) return res.status(400).json({ error: "That national job is taken." });
  if (user.nation && game.nations[user.nation]) game.nations[user.nation].manager = null;
  n.manager = user.name;
  user.nation = nation;
  log(game, `${user.name} takes the ${nation} national team job.`);
  save();
  res.json({ ok: true });
});

app.post("/api/start", (req, res) => {
  const ctx = getCtx(req, res); if (!ctx) return;
  const { game, user } = ctx;
  if (user.name !== game.host) return res.status(403).json({ error: "Only the host can kick off." });
  if (!Object.values(game.users).every(u => u.team)) return res.status(400).json({ error: "Everyone needs to pick a club first." });
  game.started = true;
  log(game, `Season ${game.season} is underway across all leagues. Unpicked clubs run on AI.`);
  save();
  res.json({ ok: true });
});

app.post("/api/tactic", (req, res) => {
  const ctx = getCtx(req, res); if (!ctx) return;
  const { game, user } = ctx;
  if (!user.team) return res.status(400).json({ error: "Pick a club first." });
  if (!TACTICS.includes(req.body.tactic)) return res.status(400).json({ error: "Unknown tactic." });
  game.clubs[user.team].tactic = req.body.tactic;
  save();
  res.json({ ok: true });
});

app.post("/api/lineup", (req, res) => {
  const ctx = getCtx(req, res); if (!ctx) return;
  const { game, user } = ctx;
  if (!user.team) return res.status(400).json({ error: "Pick a club first." });
  const xi = (Array.isArray(req.body.xi) ? req.body.xi : []).map(Number);
  const subs = (Array.isArray(req.body.subs) ? req.body.subs : []).map(Number);
  if (xi.length !== 11) return res.status(400).json({ error: "Pick exactly 11 starters." });
  if (subs.length > 9) return res.status(400).json({ error: "Max 9 subs." });
  if (new Set([...xi, ...subs]).size !== xi.length + subs.length) return res.status(400).json({ error: "A player can only be picked once." });
  const squad = new Set(game.clubs[user.team].squad);
  for (const id of [...xi, ...subs]) {
    if (!squad.has(id) || !game.players[id]) return res.status(400).json({ error: "One of those players is not in your squad." });
  }
  const gks = xi.filter(id => game.players[id].pos === "GK").length;
  if (gks !== 1) return res.status(400).json({ error: "You need exactly one goalkeeper in the starting XI." });
  game.clubs[user.team].lineup = { xi, subs };
  save();
  res.json({ ok: true });
});

app.post("/api/promote", (req, res) => {
  const ctx = getCtx(req, res); if (!ctx) return;
  const { game, user } = ctx;
  if (!user.team) return res.status(400).json({ error: "Pick a club first." });
  const club = game.clubs[user.team];
  const id = Number(req.body.playerId);
  const p = game.players[id];
  if (!p || !p.academy || !club.academy || !club.academy.includes(id)) return res.status(400).json({ error: "That player is not in your academy." });
  if (club.squad.length >= 30) return res.status(400).json({ error: "Squad is full (30 max). Sell someone first." });
  p.academy = false;
  club.academy = club.academy.filter(x => x !== id);
  club.squad.push(id);
  log(game, `${p.name} (${p.age}) has been promoted from the ${user.team} academy to the first team!`);
  save();
  res.json({ ok: true });
});

function pickWeighted(list, weights) {
  let total = 0;
  const w = list.map(p => { const x = weights[p.pos] || 1; total += x; return x; });
  let roll = Math.random() * total;
  for (let i = 0; i < list.length; i++) { roll -= w[i]; if (roll <= 0) return list[i]; }
  return list[list.length - 1];
}

function recordScorers(game, match, league) {
  game.stats = game.stats || {};
  const scoreW = { FW: 6, MF: 3, DF: 1, GK: 0.05 };
  const assistW = { FW: 3, MF: 5, DF: 1.5, GK: 0.2 };
  for (const side of ["home", "away"]) {
    const clubName = match[side];
    const club = game.clubs[clubName];
    if (!club) continue;
    const goals = side === "home" ? match.hg : match.ag;
    if (!goals) continue;
    const xi = chosenXI(game, clubName).filter(Boolean);
    if (!xi.length) continue;
    for (let g = 0; g < goals; g++) {
      const scorer = pickWeighted(xi, scoreW);
      const st = game.stats[scorer.id] = game.stats[scorer.id] || { g: 0, a: 0 };
      st.g++;
      if (Math.random() < 0.72) {
        const others = xi.filter(p => p.id !== scorer.id);
        const assister = pickWeighted(others, assistW);
        const sa = game.stats[assister.id] = game.stats[assister.id] || { g: 0, a: 0 };
        sa.a++;
      }
    }
  }
}

app.post("/api/sim", (req, res) => {
  const ctx = getCtx(req, res); if (!ctx) return;
  const { game, user } = ctx;
  if (user.name !== game.host) return res.status(403).json({ error: "Only the host can sim the matchweek." });
  if (!game.started) return res.status(400).json({ error: "Start the season first." });
  if (game.round >= (game.totalRounds || 38)) return res.status(400).json({ error: "The season is over. Check the final tables and awards, then press Start next season." });
  const wasOpen = windowOpen(game);
  const humanLeagues = new Set(Object.values(game.users).filter(u => u.team && game.clubs[u.team]).map(u => game.clubs[u.team].league));
  for (const [league, fixtures] of Object.entries(game.leagueFixtures)) {
    const round = fixtures[game.round];
    if (!round) continue;
    for (const m of round) { simMatch(game, m); recordScorers(game, m, league); }
    if (humanLeagues.has(league)) {
      log(game, `${league.toUpperCase()} WEEK ${game.round + 1}: ` + round.map(m => `${m.home} ${m.hg}-${m.ag} ${m.away}`).join(" | "));
    }
  }
  game.round++;
  const playedWeek = game.round;
  simCupsForWeek(game);
  aiInboundBids(game);
  if (game.round >= (game.totalRounds || 38)) log(game, `SEASON ${game.season}: that was the final matchweek. Awards are in the Tables tab. The host can start the next season when everyone is ready.`);
  const isOpen = windowOpen(game);
  if (wasOpen && !isOpen) log(game, "The transfer window has SLAMMED SHUT. No deals until it reopens.");
  if (!wasOpen && isOpen) log(game, "The transfer window is OPEN. Get your deals done.");
  game.lock = { active: true, week: playedWeek };
  save();
  res.json({ ok: true });
});

app.post("/api/nextseason", (req, res) => {
  const ctx = getCtx(req, res); if (!ctx) return;
  const { game, user } = ctx;
  if (user.name !== game.host) return res.status(403).json({ error: "Only the host can start the next season." });
  if (!game.started) return res.status(400).json({ error: "Start the first season first." });
  if (game.round < (game.totalRounds || 38)) return res.status(400).json({ error: "The season isn't finished yet." });
  endOfSeason(game);
  game.lock = { active: false, week: 0 };
  save();
  res.json({ ok: true });
});

app.post("/api/unlock", (req, res) => {
  const ctx = getCtx(req, res); if (!ctx) return;
  const { game, user } = ctx;
  if (user.name !== game.host) return res.status(403).json({ error: "Only the host can send everyone back." });
  game.lock = { active: false, week: game.lock ? game.lock.week : 0 };
  save();
  res.json({ ok: true });
});

app.post("/api/offer", (req, res) => {
  const ctx = getCtx(req, res); if (!ctx) return;
  const { game, user } = ctx;
  if (!user.team) return res.status(400).json({ error: "Pick a club first." });
  if (!windowOpen(game)) return res.status(400).json({ error: "The transfer window is shut. No new bids until it reopens." });
  const p = game.players[req.body.playerId];
  const fee = Math.round(Number(req.body.fee) * 10) / 10;
  if (!p) return res.status(400).json({ error: "Player not found." });
  if (p.academy) return res.status(400).json({ error: "Academy players can't be bought. Their club has to promote them first." });
  if (p.club === user.team) return res.status(400).json({ error: "He already plays for you." });
  if (!(fee > 0)) return res.status(400).json({ error: "Enter a fee." });
  if (fee > game.clubs[user.team].budget) return res.status(400).json({ error: "That bid is over your budget." });
  if (game.clubs[p.club].squad.length <= 12) return res.status(400).json({ error: `${p.club} refuse to sell. Their squad is too thin.` });
  const offer = {
    id: game.offerSeq++, playerId: p.id, toClub: user.team, sellerClub: p.club,
    fee, week: game.round, direction: "outbound", buyerUser: user.name
  };
  const sellerHuman = humanOf(game, p.club);
  if (sellerHuman) {
    offer.status = "pending_seller";
    log(game, `${user.team} have bid £${fee}m for ${p.name} (${p.club}).`);
  } else {
    resolveAiSellerOffer(game, offer);
  }
  game.offers.unshift(offer);
  game.offers = game.offers.slice(0, 200);
  save();
  res.json({ ok: true, offer });
});

app.post("/api/respond", (req, res) => {
  const ctx = getCtx(req, res); if (!ctx) return;
  const { game, user } = ctx;
  const offer = game.offers.find(o => o.id === Number(req.body.offerId));
  if (!offer) return res.status(404).json({ error: "Offer not found." });
  const p = game.players[offer.playerId];
  const action = req.body.action;
  const isSeller = user.team === offer.sellerClub;
  const isBuyer = offer.buyerUser === user.name;

  if (action === "withdraw" && isBuyer) { offer.status = "withdrawn"; save(); return res.json({ ok: true }); }

  if ((action === "accept" || action === "counter") && !windowOpen(game)) {
    return res.status(400).json({ error: "The transfer window is shut. You can only decline or withdraw until it reopens." });
  }

  if (offer.status === "pending_seller" && isSeller) {
    if (action === "accept") {
      if (offer.direction === "inbound") {
        const seller = game.clubs[offer.sellerClub];
        const buyer = game.clubs[offer.fromClub];
        if (p.club !== offer.sellerClub) { offer.status = "void"; offer.note = "The player already left the club."; }
        else if (seller.squad.length <= 13) { offer.status = "failed"; offer.note = "Squad too thin to sell."; }
        else if (buyer.squad.length >= 30 || buyer.budget < offer.fee) { offer.status = "failed"; offer.note = `${offer.fromClub} pulled out of the deal.`; }
        else {
          seller.budget = Math.round((seller.budget + offer.fee) * 10) / 10;
          buyer.budget = Math.round((buyer.budget - offer.fee) * 10) / 10;
          seller.squad = seller.squad.filter(id => id !== p.id);
          stripFromLineup(seller, p.id);
          buyer.squad.push(p.id);
          p.club = offer.fromClub; p.league = buyer.league; p.listed = false;
          offer.status = "accepted";
          voidOtherOffers(game, p.id, offer.id);
          log(game, `TRANSFER: ${p.name} leaves ${offer.sellerClub} for ${offer.fromClub}, £${offer.fee}m.`);
        }
      } else {
        const r = doTransfer(game, offer);
        offer.status = r.ok ? "accepted" : "failed";
        if (!r.ok) offer.note = r.msg;
      }
    } else if (action === "decline") {
      offer.status = "declined";
      log(game, `${offer.sellerClub} rejected the £${offer.fee}m bid for ${p.name}.`);
    } else if (action === "counter") {
      const cf = Math.round(Number(req.body.counterFee) * 10) / 10;
      if (!(cf > 0)) return res.status(400).json({ error: "Enter a counter fee." });
      offer.status = "countered"; offer.counterFee = cf;
      log(game, `${offer.sellerClub} want £${cf}m for ${p.name}.`);
    }
    save(); return res.json({ ok: true });
  }

  if (offer.status === "countered" && (isBuyer || (offer.direction === "inbound" && isSeller))) {
    if (action === "accept") {
      offer.fee = offer.counterFee;
      if (offer.direction === "inbound") return res.status(400).json({ error: "Not applicable." });
      const sellerHuman = humanOf(game, offer.sellerClub);
      if (sellerHuman) {
        const r = doTransfer(game, offer);
        offer.status = r.ok ? "accepted" : "failed";
        if (!r.ok) offer.note = r.msg;
      } else {
        if (game.clubs[offer.toClub].budget < offer.fee) return res.status(400).json({ error: "That counter is over your budget." });
        resolveAiSellerOffer(game, offer);
      }
    } else if (action === "decline") offer.status = "withdrawn";
    else if (action === "counter" && isBuyer) {
      const cf = Math.round(Number(req.body.counterFee) * 10) / 10;
      if (!(cf > 0)) return res.status(400).json({ error: "Enter a fee." });
      if (cf > game.clubs[offer.toClub].budget) return res.status(400).json({ error: "Over budget." });
      offer.fee = cf;
      const sellerHuman = humanOf(game, offer.sellerClub);
      if (sellerHuman) { offer.status = "pending_seller"; log(game, `${offer.toClub} came back with £${cf}m for ${p.name}.`); }
      else resolveAiSellerOffer(game, offer);
    }
    save(); return res.json({ ok: true });
  }
  res.status(400).json({ error: "You can't respond to this offer." });
});

app.post("/api/list", (req, res) => {
  const ctx = getCtx(req, res); if (!ctx) return;
  const { game, user } = ctx;
  const p = game.players[req.body.playerId];
  if (!p || p.club !== user.team || p.academy) return res.status(400).json({ error: "Not your player." });
  p.listed = !p.listed;
  if (p.listed) log(game, `${p.name} has been transfer listed by ${user.team}.`);
  save();
  res.json({ ok: true });
});

app.get("/api/state", (req, res) => {
  const ctx = getCtx(req, res); if (!ctx) return;
  const { game, user } = ctx;
  const myTeam = user.team;
  const myLeague = myTeam ? game.clubs[myTeam].league : "Premier League";
  const myFix = (game.leagueFixtures || {})[myLeague] || [];
  const relevantOffers = game.offers.filter(o =>
    o.buyerUser === user.name || o.sellerClub === myTeam || o.toClub === myTeam
  ).slice(0, 40);
  const clubsByLeague = {};
  for (const league of PLAYABLE) {
    clubsByLeague[league] = leagueClubs(game, league).map(t => ({
      name: t,
      manager: (humanOf(game, t) || {}).name || "AI",
      budget: game.clubs[t].budget,
      squadSize: game.clubs[t].squad.length
    }));
  }
  const tables = {};
  for (const league of Object.keys(game.leagueFixtures || {})) tables[league] = tableFor(game, league);
  res.json({
    code: game.code,
    you: user.name,
    host: game.host,
    started: game.started,
    season: game.season,
    round: game.round,
    seasonOver: game.started && game.round >= (game.totalRounds || 38),
    totalRounds: game.totalRounds || 38,
    users: Object.values(game.users).map(u => ({ name: u.name, team: u.team, nation: u.nation || null })),
    leagues: PLAYABLE,
    allLeagues: Object.keys(game.leagueFixtures || {}),
    myLeague,
    clubsByLeague,
    myClub: myTeam ? {
      name: myTeam,
      league: myLeague,
      budget: game.clubs[myTeam].budget,
      tactic: game.clubs[myTeam].tactic,
      lineup: game.clubs[myTeam].lineup || { xi: [], subs: [] },
      squad: game.clubs[myTeam].squad.map(id => game.players[id]).filter(Boolean),
      academy: (game.clubs[myTeam].academy || []).map(id => game.players[id]).filter(Boolean)
    } : null,
    myNation: user.nation || null,
    nations: Object.values(game.nations || {}).map(n => {
      const xi = nationXI(game, n.name);
      return {
        name: n.name,
        manager: n.manager,
        strength: Math.round(xi.reduce((s, p) => s + p.rating, 0) / (xi.length || 1)),
        players: n.playerIds.map(id => game.players[id]).filter(Boolean).map(p => ({ name: p.name, pos: p.pos, rating: p.rating, club: p.club }))
      };
    }),
    window: windowInfo(game),
    lock: game.lock || { active: false, week: 0 },
    cups: Object.values(game.cups || {}).map(c => ({
      key: c.key,
      title: c.title,
      scope: c.scope || "club",
      winner: c.winner,
      weeks: c.weeks,
      roundIdx: c.roundIdx,
      rounds: c.rounds.map((ms, i) => ({
        week: c.weeks[i],
        name: (c.roundNames && c.roundNames[i]) || nameForMatches(ms.length),
        matches: ms
      }))
    })),
    tables,
    table: tables[myLeague] || [],
    statBoards: (() => {
      const out = {};
      for (const league of Object.keys(game.leagueFixtures || {})) out[league] = statBoards(game, league);
      return out;
    })(),
    thisWeek: myFix[game.round] || [],
    lastWeek: game.round > 0 ? (myFix[game.round - 1] || []) : [],
    myFixtures: myTeam ? myFix.map((r, i) => {
      const m = r.find(x => x.home === myTeam || x.away === myTeam);
      return { week: i + 1, ...m };
    }) : [],
    offers: relevantOffers,
    feed: game.feed.slice(0, 40),
    history: game.history || []
  });
});

app.get("/api/market", (req, res) => {
  const ctx = getCtx(req, res); if (!ctx) return;
  const { game, user } = ctx;
  const q = String(req.query.q || "").toLowerCase();
  const league = req.query.league || "";
  const pos = req.query.pos || "";
  let list = Object.values(game.players).filter(p => p.club !== user.team && !p.academy);
  if (req.query.wonder === "1") list = list.filter(p => p.age <= 21 && p.rating >= 82);
  if (q) list = list.filter(p => p.name.toLowerCase().includes(q) || p.club.toLowerCase().includes(q));
  if (league) list = list.filter(p => p.league === league);
  if (pos) list = list.filter(p => p.pos === pos);
  list.sort((a, b) => b.rating - a.rating);
  res.json({
    players: list.slice(0, 60).map(p => ({
      ...p,
      asking: askingPrice(game, p, p.club),
      humanOwned: !!humanOf(game, p.club)
    })),
    leagues: [...new Set(Object.values(game.players).map(p => p.league))].sort()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Floodlights running on port ${PORT}`));
