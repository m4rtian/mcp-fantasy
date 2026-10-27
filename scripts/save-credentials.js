import { chmod, mkdir, writeFile } from "node:fs/promises";
import readline from "node:readline/promises";

import {
  CLIENT_SECRET_PATH,
  CREDENTIALS_DIRECTORY,
  REDIRECT_URI,
} from "../connector/auth.js";

function askHidden(prompt) {
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    const output = process.stdout;
    if (!input.isTTY || typeof input.setRawMode !== "function") {
      reject(new Error("Run this command in an interactive terminal."));
      return;
    }

    let value = "";
    output.write(prompt);
    input.setRawMode(true);
    input.resume();
    input.setEncoding("utf8");

    const cleanup = () => {
      input.off("data", onData);
      input.setRawMode(false);
      input.pause();
    };
    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === "\u0003") {
          cleanup();
          output.write("\n");
          reject(new Error("Cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          cleanup();
          output.write("\n");
          resolve(value.trim());
          return;
        }
        if (character === "\u007f" || character === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        value += character;
      }
    };
    input.on("data", onData);
  });
}

const readlineInterface = readline.createInterface({ input: process.stdin, output: process.stdout });
const clientId = (await readlineInterface.question("New Yahoo Client ID: ")).trim();
readlineInterface.close();
const clientSecret = await askHidden("New Yahoo Client Secret (input hidden): ");

if (!clientId || !clientSecret) {
  throw new Error("Client ID and Client Secret are both required.");
}

await mkdir(CREDENTIALS_DIRECTORY, { recursive: true, mode: 0o700 });
await writeFile(
  CLIENT_SECRET_PATH,
  `${JSON.stringify({ client_id: clientId, client_secret: clientSecret, redirect_uri: REDIRECT_URI }, null, 2)}\n`,
  { mode: 0o600 }
);
await chmod(CLIENT_SECRET_PATH, 0o600);
console.log(`Saved private credentials to ${CLIENT_SECRET_PATH}`);
console.log("Next: npm run authorize");
