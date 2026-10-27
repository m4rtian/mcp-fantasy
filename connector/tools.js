import { z } from "zod";

import { yahooGet } from "./auth.js";
import { compactJson } from "./shared.js";

const GAME_KEY_PATTERN = /^[a-z0-9]+$/i;
const LEAGUE_KEY_PATTERN = /^[a-z0-9]+\.l\.\d+$/i;
const TEAM_KEY_PATTERN = /^[a-z0-9]+\.l\.\d+\.t\.\d+$/i;

export function validateKey(kind, value) {
  const patterns = {
    game: GAME_KEY_PATTERN,
    league: LEAGUE_KEY_PATTERN,
    team: TEAM_KEY_PATTERN,
  };
  if (!patterns[kind].test(value)) {
    throw new Error(`Invalid Yahoo ${kind} key: ${JSON.stringify(value)}.`);
  }
  return value;
}

const gameKey = z.string().describe('Yahoo game key such as "nfl" or a season-specific numeric key.');
const leagueKey = z.string().describe('Yahoo league key such as "nfl.l.854760".');
const teamKey = z.string().describe('Yahoo team key such as "nfl.l.854760.t.1".');
const week = z.number().int().min(1).max(30).optional().describe("Week number; omit for current week.");
const pagination = {
  start: z.number().int().min(0).max(5000).optional().describe("Zero-based result offset."),
  count: z.number().int().min(1).max(50).optional().describe("Maximum results, up to 50."),
};

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

export function registerYahooTools(server) {
  const register = (name, title, description, inputSchema, handler) => {
    server.registerTool(
      name,
      { title, description, inputSchema, annotations: readOnlyAnnotations },
      async (input) => compactJson(await handler(input))
    );
  };

  register(
    "yahoo_get_my_games",
    "List my fantasy games",
    "Lists fantasy sports and seasons associated with the authorized account.",
    {},
    () => yahooGet("/users;use_login=1/games")
  );

  register(
    "yahoo_get_my_leagues",
    "List my leagues",
    "Lists the authorized account's leagues for a Yahoo game key.",
    { gameKey },
    ({ gameKey: value }) =>
      yahooGet(`/users;use_login=1/games;game_keys=${validateKey("game", value)}/leagues`)
  );

  register(
    "yahoo_get_league_metadata",
    "Get league metadata",
    "Returns league identity, season, current week, deadlines, and other league metadata.",
    { leagueKey },
    ({ leagueKey: value }) => yahooGet(`/league/${validateKey("league", value)}/metadata`)
  );

  register(
    "yahoo_get_league_settings",
    "Get league settings",
    "Returns scoring, roster positions, waiver rules, FAAB settings, and league configuration.",
    { leagueKey },
    ({ leagueKey: value }) => yahooGet(`/league/${validateKey("league", value)}/settings`)
  );

  register(
    "yahoo_get_league_standings",
    "Get league standings",
    "Returns current team standings and records.",
    { leagueKey },
    ({ leagueKey: value }) => yahooGet(`/league/${validateKey("league", value)}/standings`)
  );

  register(
    "yahoo_get_league_teams",
    "List league teams",
    "Lists every team in a league and exposes team keys needed for roster calls.",
    { leagueKey },
    ({ leagueKey: value }) => yahooGet(`/league/${validateKey("league", value)}/teams`)
  );

  register(
    "yahoo_get_scoreboard",
    "Get league scoreboard",
    "Returns fantasy matchups and scores for the current or requested week.",
    { leagueKey, week },
    ({ leagueKey: value, week: weekNumber }) =>
      yahooGet(`/league/${validateKey("league", value)}/scoreboard`, { week: weekNumber })
  );

  register(
    "yahoo_get_league_transactions",
    "Get league transactions",
    "Returns recent adds, drops, waiver claims, and trades for league context. This tool cannot create transactions.",
    { leagueKey, ...pagination },
    ({ leagueKey: value, start, count }) =>
      yahooGet(`/league/${validateKey("league", value)}/transactions`, { start, count })
  );

  register(
    "yahoo_get_team_roster",
    "Get team roster",
    "Returns a team's roster and lineup positions for the current or requested week.",
    { teamKey, week },
    ({ teamKey: value, week: weekNumber }) =>
      yahooGet(`/team/${validateKey("team", value)}/roster`, { week: weekNumber })
  );

  register(
    "yahoo_get_team_matchups",
    "Get team matchups",
    "Returns a team's matchup schedule and results.",
    { teamKey },
    ({ teamKey: value }) => yahooGet(`/team/${validateKey("team", value)}/matchups`)
  );

  register(
    "yahoo_get_available_players",
    "Get available players",
    "Returns free agents or waivers in a league, optionally filtered by position and sorted by Yahoo rank, ownership, or recent performance.",
    {
      leagueKey,
      status: z.enum(["FA", "W", "A"]).default("A").describe("FA for free agents, W for waivers, A for all available players."),
      position: z.string().regex(/^[A-Z0-9/+-]{1,10}$/).optional().describe('Position such as "QB", "RB", "WR", "TE", "K", or "DEF".'),
      sort: z.enum(["AR", "OR", "PTS", "RANK"]).optional().describe("Yahoo player sort code."),
      ...pagination,
    },
    ({ leagueKey: value, status, position, sort, start, count }) =>
      yahooGet(`/league/${validateKey("league", value)}/players`, {
        status,
        position,
        sort,
        start,
        count,
      })
  );

  register(
    "yahoo_search_league_players",
    "Search league players",
    "Searches a league's player pool by full or partial player name.",
    {
      leagueKey,
      query: z.string().trim().min(2).max(80).describe("Player name or partial name."),
      ...pagination,
    },
    ({ leagueKey: value, query, start, count }) =>
      yahooGet(`/league/${validateKey("league", value)}/players`, {
        search: query,
        start,
        count,
      })
  );
}
