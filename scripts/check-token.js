import { yahooGet } from "../connector/auth.js";

const data = await yahooGet("/users;use_login=1/games;game_codes=nfl");
const count = data?.fantasy_content?.users?.count ?? "unknown";
console.log(`Yahoo Fantasy authentication is working. User count: ${count}`);
